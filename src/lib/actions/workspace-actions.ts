
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
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
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
  PublishedKnowledge,
  SyncProposal,
  SyncProposalType,
  SyncApprovalStatus,
  KnowledgeCategory,
} from '@/lib/firestore-types';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Helper to get a server-side Firestore instance
function getAdminFirestore() {
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

/**
 * Diffs two knowledge bases and creates proposals.
 */
function diffKnowledge(
  oldKnowledge: KnowledgeCategory[],
  newKnowledge: KnowledgeCategory[]
): Omit<SyncProposal, 'id' | 'workspaceId' | 'sourceBatchId' | 'approvalStatus' | 'createdAt'>[] {
  const proposals: Omit<SyncProposal, 'id' | 'workspaceId' | 'sourceBatchId' | 'approvalStatus' | 'createdAt'>[] = [];
  const oldItems = new Map(
    oldKnowledge.flatMap((cat) =>
      cat.itens.map((item) => [item.titulo.toLowerCase(), { ...item, categoria: cat.categoria }])
    )
  );
  const newItems = new Map(
    newKnowledge.flatMap((cat) =>
      cat.itens.map((item) => [item.titulo.toLowerCase(), { ...item, categoria: cat.categoria }])
    )
  );

  // Check for new and updated items
  for (const [title, newItem] of newItems.entries()) {
    const oldItem = oldItems.get(title);
    if (!oldItem) {
      proposals.push({
        type: SyncProposalType.NEW,
        entityType: 'knowledge',
        entityId: newItem.titulo,
        before: null,
        after: newItem,
      });
    } else if (newItem.descricao !== oldItem.descricao) {
      proposals.push({
        type: SyncProposalType.UPDATED,
        entityType: 'knowledge',
        entityId: newItem.titulo,
        before: oldItem,
        after: newItem,
      });
    }
  }

  // Check for obsolete items
  for (const [title, oldItem] of oldItems.entries()) {
    if (!newItems.has(title)) {
      proposals.push({
        type: SyncProposalType.OBSOLETE,
        entityType: 'knowledge',
        entityId: oldItem.titulo,
        before: oldItem,
        after: null,
      });
    }
  }

  return proposals;
}


export async function processContentBatch(
  workspaceId: string,
  batchId: string
) {
  try {
    const db = getAdminFirestore();

    // 1. Update workspace and sources status to 'PROCESSING'
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const sourcesQuery = query(
      collection(db, `workspaces/${workspaceId}/sources`),
      where('batchId', '==', batchId),
      where('processingStatus', '==', ProcessingStatus.PENDING)
    );
    
    const sourcesSnapshot = await getDocs(sourcesQuery);
    if (sourcesSnapshot.empty) {
        throw new Error("Nenhum item pendente encontrado na fila para o lote especificado.");
    }

    const initialBatch = writeBatch(db);
    initialBatch.update(workspaceRef, {
      ingestionState: IngestionState.PROCESSING,
    });
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
    sourcesSnapshot.forEach((doc) => {
      const data = doc.data() as Source;
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
    aiResult = await analyzeAndStructureContent({
      rawContent: consolidatedContent,
    });

    // 4. Check if workspace has published knowledge to decide flow
    const publishedKnowledgeRef = doc(db, `workspaces/${workspaceId}/published_knowledge`, workspaceId);
    const publishedKnowledgeSnap = await getDoc(publishedKnowledgeRef);
    const finalBatch = writeBatch(db);
    const timestamp = serverTimestamp();

    if (!publishedKnowledgeSnap.exists()) {
      // --- INITIAL DRAFT FLOW ---
      const draftKnowledgeRef = doc(collection(db, `workspaces/${workspaceId}/draft_knowledge`));
      finalBatch.set(draftKnowledgeRef, {
        categories: aiResult.knowledgeBase,
        generatedAt: timestamp,
        sourceBatchId: batchId,
        version: 1,
        status: 'draft',
      });
      // Drafts for other entities
      aiResult.playbooks.forEach((playbook) => {
          const playbookRef = doc(collection(db, `workspaces/${workspaceId}/playbooks`));
          finalBatch.set(playbookRef, { ...playbook, sourceRefs: sourceIds, status: 'draft', createdAt: timestamp, updatedAt: timestamp });
      });
      aiResult.trainingModules.forEach((module) => {
          const moduleRef = doc(collection(db, `workspaces/${workspaceId}/training_modules`));
          finalBatch.set(moduleRef, { ...module, sourceRefs: sourceIds, status: 'draft', createdAt: timestamp });
      });
      finalBatch.update(workspaceRef, {
          ingestionState: IngestionState.IDLE,
          status: WorkspaceStatus.DRAFT_READY,
          lastProcessedAt: timestamp,
      });
    } else {
      // --- SYNC PROPOSAL FLOW ---
      const publishedKnowledge = publishedKnowledgeSnap.data() as PublishedKnowledge;
      const proposals = diffKnowledge(publishedKnowledge.categories, aiResult.knowledgeBase);
      
      if (proposals.length > 0) {
          proposals.forEach(proposal => {
              const proposalRef = doc(collection(db, `workspaces/${workspaceId}/sync_proposals`));
              finalBatch.set(proposalRef, {
                  ...proposal,
                  workspaceId: workspaceId,
                  sourceBatchId: batchId,
                  approvalStatus: SyncApprovalStatus.PENDING,
                  createdAt: timestamp,
              });
          });
          finalBatch.update(workspaceRef, {
              ingestionState: IngestionState.IDLE,
              status: WorkspaceStatus.SYNC_PENDING,
              lastProcessedAt: timestamp,
              pendingSyncCount: proposals.length,
          });
      } else {
          // No changes found
           finalBatch.update(workspaceRef, {
              ingestionState: IngestionState.IDLE,
              lastProcessedAt: timestamp,
          });
      }
    }

    // Insights are always created
    aiResult.insights.forEach((insight) => {
      const insightRef = doc(collection(db, `workspaces/${workspaceId}/insights`));
      finalBatch.set(insightRef, { ...insight, sourceRefs: sourceIds, resolved: false, createdAt: timestamp });
    });

    // Update status of sources to 'COMPLETED'
    sourcesSnapshot.forEach((doc) => {
      finalBatch.update(doc.ref, { processingStatus: ProcessingStatus.COMPLETED });
    });

    // Commit all changes
    await finalBatch.commit();
  } catch (error: any) {
    console.error(`[SERVER ACTION ERROR] in processContentBatch for workspace ${workspaceId}:`, error);

    if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
        throw new Error(
        `[Permissão Negada no Servidor] A operação falhou devido às regras de segurança do Firestore. A ação no servidor (processContentBatch) pode não estar autenticada ou não ter permissão para ler/escrever os dados necessários. Verifique os logs do servidor para detalhes e ajuste as 'firestore.rules'.`
      );
    }
    
    throw new Error(`[Erro no Servidor] ${error.message}`);
  }
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
  const timestamp = Timestamp.now();
  const workspaceSnap = await getDoc(workspaceRef);
  const currentVersion = workspaceSnap.data()?.version || 0;
  const newVersion = currentVersion + 1;

  // 1. Set/overwrite the single published knowledge document.
  const publishedRef = doc(db, `workspaces/${workspaceId}/published_knowledge`, workspaceId);
  batch.set(publishedRef, {
    categories: draftData.categories,
    publishedAt: timestamp,
    version: newVersion,
    publishedBy: userId,
  }, { merge: true });

  // 2. Update status of related playbooks and training_modules to 'published'
  const playbooksQuery = query(
    collection(db, `workspaces/${workspaceId}/playbooks`),
    where('sourceBatchId', '==', draftData.sourceBatchId)
  );
  const trainingQuery = query(
    collection(db, `workspaces/${workspaceId}/training_modules`),
    where('sourceBatchId', '==', draftData.sourceBatchId)
  );
  const [playbooksSnap, trainingSnap] = await Promise.all([ getDocs(playbooksQuery), getDocs(trainingQuery) ]);
  playbooksSnap.forEach((doc) => batch.update(doc.ref, { status: 'published', updatedAt: timestamp }));
  trainingSnap.forEach((doc) => batch.update(doc.ref, { status: 'published' }));

  // 3. Create a version document
  const versionRef = doc(collection(db, `workspaces/${workspaceId}/versions`));
  batch.set(versionRef, {
    type: currentVersion === 0 ? VersionEventType.INITIAL_PUBLISH : VersionEventType.SYNC_PUBLISH,
    summary: currentVersion === 0 ? 'Publicação inicial da base de conhecimento.' : `Publicação do rascunho.`,
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
  try {
    await batch.commit();
  } catch (e: any) {
    console.error("Error committing publish batch:", e);
    throw new Error(`Falha na permissão do Firestore ao publicar o rascunho. Verifique as regras para 'published_knowledge', 'versions' e 'workspaces'. Detalhe: ${e.message}`);
  }
}


export async function updateSyncProposalStatus(
    workspaceId: string,
    proposalId: string,
    status: SyncApprovalStatus
) {
    const db = getAdminFirestore();
    const proposalRef = doc(db, `workspaces/${workspaceId}/sync_proposals`, proposalId);
    await updateDoc(proposalRef, { approvalStatus: status });
}


export async function publishSync(workspaceId: string, userId: string) {
    const db = getAdminFirestore();
    
    // 1. Get all approved proposals
    const proposalsQuery = query(
        collection(db, `workspaces/${workspaceId}/sync_proposals`),
        where('approvalStatus', '==', SyncApprovalStatus.APPROVED)
    );
    const proposalsSnap = await getDocs(proposalsQuery);
    if (proposalsSnap.empty) {
        throw new Error("Nenhuma proposta aprovada para publicar.");
    }
    
    // 2. Get the current published knowledge
    const publishedRef = doc(db, `workspaces/${workspaceId}/published_knowledge`, workspaceId);
    const publishedSnap = await getDoc(publishedRef);
    if (!publishedSnap.exists()) {
        throw new Error("Base de conhecimento publicada não encontrada para aplicar as mudanças.");
    }
    const publishedData = publishedSnap.data() as PublishedKnowledge;
    let newCategories = [...publishedData.categories];

    // 3. Apply changes locally
    proposalsSnap.forEach(proposalDoc => {
        const proposal = proposalDoc.data() as SyncProposal;
        
        if (proposal.entityType === 'knowledge') {
            const itemTitle = proposal.entityId;
            
            if (proposal.type === SyncProposalType.NEW) {
                // Find or create category
                let category = newCategories.find(c => c.categoria === proposal.after.categoria);
                if (category) {
                    category.itens.push(proposal.after);
                } else {
                    newCategories.push({ categoria: proposal.after.categoria, icone: '✨', itens: [proposal.after]});
                }
            } else if (proposal.type === SyncProposalType.UPDATED) {
                newCategories = newCategories.map(cat => ({
                    ...cat,
                    itens: cat.itens.map(item => item.titulo.toLowerCase() === itemTitle.toLowerCase() ? proposal.after : item)
                }));
            } else if (proposal.type === SyncProposalType.OBSOLETE) {
                 newCategories = newCategories.map(cat => ({
                    ...cat,
                    itens: cat.itens.filter(item => item.titulo.toLowerCase() !== itemTitle.toLowerCase())
                })).filter(cat => cat.itens.length > 0);
            }
        }
        // TODO: Implement logic for 'playbook' and 'training' entity types
    });
    
    // 4. Start a batch write
    const batch = writeBatch(db);
    const timestamp = Timestamp.now();
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    const currentVersion = workspaceSnap.data()?.version || 0;
    const newVersion = currentVersion + 1;
    
    // 5. Update published knowledge
    batch.set(publishedRef, { ...publishedData, categories: newCategories, version: newVersion, publishedAt: timestamp, publishedBy: userId });
    
    // 6. Delete processed proposals
    proposalsSnap.forEach(proposalDoc => {
        batch.delete(proposalDoc.ref);
    });
    
    // 7. Create version document
    const versionRef = doc(collection(db, `workspaces/${workspaceId}/versions`));
    batch.set(versionRef, {
        type: VersionEventType.SYNC_PUBLISH,
        summary: `Sincronização da versão ${newVersion} com ${proposalsSnap.size} alterações.`,
        createdAt: timestamp,
        createdBy: userId,
        version: newVersion,
    });
    
    // 8. Update workspace
    batch.update(workspaceRef, {
        status: WorkspaceStatus.PUBLISHED,
        lastPublishedAt: timestamp,
        version: newVersion,
        pendingSyncCount: 0
    });
    
    // 9. Commit
    try {
        await batch.commit();
    } catch (e: any) {
        console.error("Error committing sync batch:", e);
        throw new Error(`Falha na permissão do Firestore ao publicar a sincronização. Verifique as regras para 'published_knowledge', 'sync_proposals', 'versions' e 'workspaces'. Detalhe: ${e.message}`);
    }
}
