'use server';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  serverTimestamp,
  where,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { getApps, FirebaseError } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import {
  analyzeAndStructureContent,
  AnalyzeAndStructureContentOutput,
} from '@/ai/flows/analyze-and-structure-content';
import {
  IngestionState,
  ProcessingStatus,
  Source,
  WorkspaceStatus,
  DraftKnowledge,
  VersionEventType,
} from '@/lib/firestore-types';
import { getFirestore } from 'firebase/firestore';

// Helper to get a server-side Firestore instance
function getAdminFirestore() {
  if (getApps().length === 0) {
    throw new Error(
      'Firebase não foi inicializado no servidor. A configuração está faltando.'
    );
  }
  // We use the client SDK here, but in a server context ('use server').
  // This is fine for server-side actions in Next.js.
  // For true admin privileges, firebase-admin would be used, but that's not needed here.
  return getFirestore();
}

export async function processContentBatch(
  workspaceId: string,
  batchId: string
) {
  const db = getAdminFirestore();

  // 1. Update workspace and sources status to 'PROCESSING'
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  const sourcesQuery = query(
    collection(db, `workspaces/${workspaceId}/sources`),
    where('batchId', '==', batchId),
    where('processingStatus', '==', ProcessingStatus.PENDING)
  );

  const initialBatch = writeBatch(db);
  initialBatch.update(workspaceRef, {
    ingestionState: IngestionState.PROCESSING,
  });
  const sourcesSnapshot = await getDocs(sourcesQuery);
  const sourceIds: string[] = [];
  sourcesSnapshot.forEach((doc) => {
    sourceIds.push(doc.id);
    initialBatch.update(doc.ref, {
      processingStatus: ProcessingStatus.PROCESSING,
    });
  });
  await initialBatch.commit();

  // 2. Consolidate content from all sources in the batch
  let consolidatedContent = '';
  const sourcesData: Source[] = [];
  sourcesSnapshot.forEach((doc) => {
    const data = doc.data() as Source;
    sourcesData.push(data);
    consolidatedContent += data.rawText || '';
    consolidatedContent += data.extractedText || '';
    consolidatedContent += data.transcript || '';
    consolidatedContent += '\n\n---\n\n';
  });

  if (!consolidatedContent.trim()) {
    throw new Error(
      'Nenhum conteúdo textual encontrado nas fontes para processar.'
    );
  }

  // 3. Call the Genkit flow to analyze content
  let aiResult: AnalyzeAndStructureContentOutput;
  try {
    aiResult = await analyzeAndStructureContent({
      rawContent: consolidatedContent,
    });
  } catch (error) {
    console.error('AI flow execution failed:', error);
    // TODO: Revert status of sources to 'error'
    throw new Error('A IA falhou ao processar o conteúdo.');
  }

  // 4. Save the structured output to Firestore using a new batch
  const finalBatch = writeBatch(db);
  const timestamp = serverTimestamp();

  // Save Draft Knowledge
  const draftKnowledgeRef = doc(
    collection(db, `workspaces/${workspaceId}/draft_knowledge`)
  );
  finalBatch.set(draftKnowledgeRef, {
    categories: aiResult.knowledgeBase,
    generatedAt: timestamp,
    sourceBatchId: batchId,
    version: 1, // Assuming first version
    status: 'draft',
  });

  // Save Playbooks
  aiResult.playbooks.forEach((playbook) => {
    const playbookRef = doc(
      collection(db, `workspaces/${workspaceId}/playbooks`)
    );
    finalBatch.set(playbookRef, {
      ...playbook,
      sourceRefs: sourceIds,
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  // Save Training Modules
  aiResult.trainingModules.forEach((module) => {
    const moduleRef = doc(
      collection(db, `workspaces/${workspaceId}/training_modules`)
    );
    finalBatch.set(moduleRef, {
      ...module,
      sourceRefs: sourceIds,
      status: 'draft',
      createdAt: timestamp,
    });
  });

  // Save Insights
  aiResult.insights.forEach((insight) => {
    const insightRef = doc(collection(db, `workspaces/${workspaceId}/insights`));
    finalBatch.set(insightRef, {
      ...insight,
      sourceRefs: sourceIds,
      resolved: false,
      createdAt: timestamp,
    });
  });

  // 5. Update status of sources to 'COMPLETED'
  sourcesSnapshot.forEach((doc) => {
    finalBatch.update(doc.ref, { processingStatus: ProcessingStatus.COMPLETED });
  });

  // 6. Update workspace status to 'DRAFT_READY'
  finalBatch.update(workspaceRef, {
    ingestionState: IngestionState.IDLE,
    status: WorkspaceStatus.DRAFT_READY,
    lastProcessedAt: timestamp,
  });

  // 7. Commit all changes
  await finalBatch.commit();
}

export async function publishDraft(
  workspaceId: string,
  draftId: string,
  userId: string
) {
  const db = getAdminFirestore();
  const draftRef = doc(db, `workspaces/${workspaceId}/draft_knowledge`, draftId);
  const draftSnap = await getDoc(draftRef);

  if (!draftSnap.exists()) {
    throw new Error('Rascunho não encontrado para publicação.');
  }

  const draftData = draftSnap.data() as DraftKnowledge;
  const workspaceRef = doc(db, 'workspaces', workspaceId);

  const batch = writeBatch(db);
  const timestamp = serverTimestamp();
  const currentVersion = (await getDoc(workspaceRef)).data()?.version || 0;
  const newVersion = currentVersion + 1;

  // 1. Copy draft to published_knowledge
  const publishedRef = doc(
    collection(db, `workspaces/${workspaceId}/published_knowledge`)
  );
  batch.set(publishedRef, {
    categories: draftData.categories,
    publishedAt: timestamp,
    version: newVersion,
    publishedBy: userId,
  });

  // 2. Update status of related playbooks and training_modules to 'published'
  const playbooksQuery = query(
    collection(db, `workspaces/${workspaceId}/playbooks`),
    where('status', '==', 'draft')
  );
  const trainingQuery = query(
    collection(db, `workspaces/${workspaceId}/training_modules`),
    where('status', '==', 'draft')
  );

  const [playbooksSnap, trainingSnap] = await Promise.all([
    getDocs(playbooksQuery),
    getDocs(trainingQuery),
  ]);

  playbooksSnap.forEach((doc) => {
    batch.update(doc.ref, { status: 'published', updatedAt: timestamp });
  });

  trainingSnap.forEach((doc) => {
    batch.update(doc.ref, { status: 'published' });
  });

  // 3. Create a version document
  const versionRef = doc(collection(db, `workspaces/${workspaceId}/versions`));
  batch.set(versionRef, {
    type:
      currentVersion === 0
        ? VersionEventType.INITIAL_PUBLISH
        : VersionEventType.SYNC_PUBLISH,
    summary:
      currentVersion === 0
        ? 'Publicação inicial da base de conhecimento.'
        : `Sincronização da versão ${newVersion}.`,
    createdAt: timestamp,
    createdBy: userId,
    version: newVersion,
  });

  // 4. Update the workspace
  batch.update(workspaceRef, {
    status: WorkspaceStatus.PUBLISHED,
    lastPublishedAt: timestamp,
    version: newVersion,
  });

  // 5. Delete the original draft document
  batch.delete(draftRef);

  // 6. Commit the transaction
  await batch.commit();
}
