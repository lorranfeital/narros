
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
  addDoc,
  deleteDoc,
  Query,
  setDoc,
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
  BrandKit,
  SourceType,
  OrgChart,
  Playbook,
  TrainingModule,
  TrainingProgressStatus,
  TrainingProgress,
} from '@/lib/firestore-types';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, getBytes } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';
import pdf from 'pdf-parse';

// Helper to get a server-side Firestore instance
function getAdminFirestore() {
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

// Helper to get a server-side Storage instance
function getAdminStorage() {
    if (getApps().length === 0) {
        initializeApp(firebaseConfig);
    }
    return getStorage(getApp());
}

type Proposal = Omit<SyncProposal, 'id' | 'workspaceId' | 'sourceBatchId' | 'approvalStatus' | 'createdAt'>;

/**
 * Diffs two knowledge bases and creates proposals.
 */
function diffKnowledge(oldKnowledge: KnowledgeCategory[], newKnowledge: KnowledgeCategory[]): Proposal[] {
  const proposals: Proposal[] = [];
  const oldItems = new Map(oldKnowledge.flatMap(cat => cat.itens.map(item => [item.titulo.toLowerCase(), { ...item, categoria: cat.categoria }])));
  const newItems = new Map(newKnowledge.flatMap(cat => cat.itens.map(item => [item.titulo.toLowerCase(), { ...item, categoria: cat.categoria }])));

  for (const [title, newItem] of newItems.entries()) {
    const oldItem = oldItems.get(title);
    if (!oldItem) {
      proposals.push({ type: SyncProposalType.NEW, entityType: 'knowledge', entityId: newItem.titulo, before: null, after: newItem });
    } else if (JSON.stringify(newItem) !== JSON.stringify(oldItem)) {
      proposals.push({ type: SyncProposalType.UPDATED, entityType: 'knowledge', entityId: newItem.titulo, before: oldItem, after: newItem });
    }
  }

  for (const [title, oldItem] of oldItems.entries()) {
    if (!newItems.has(title)) {
      proposals.push({ type: SyncProposalType.OBSOLETE, entityType: 'knowledge', entityId: oldItem.titulo, before: oldItem, after: null });
    }
  }
  return proposals;
}

function diffGenericArray<T extends { id: string }>(
  oldItems: T[],
  newItems: T[],
  keyField: keyof T,
  entityType: 'playbook' | 'training'
): Proposal[] {
  const proposals: Proposal[] = [];
  const oldMap = new Map(oldItems.map(item => [String(item[keyField]).toLowerCase(), item]));
  const newMap = new Map(newItems.map(item => [String(item[keyField]).toLowerCase(), item]));

  for (const [key, newItem] of newMap.entries()) {
    const oldItem = oldMap.get(key);
    const entityId = newItem[keyField] as string;
    if (!oldItem) {
      proposals.push({ type: SyncProposalType.NEW, entityType, entityId, before: null, after: newItem });
    } else if (JSON.stringify(newItem) !== JSON.stringify(oldItem)) {
      proposals.push({ type: SyncProposalType.UPDATED, entityType, entityId, before: oldItem, after: newItem });
    }
  }

  for (const [key, oldItem] of oldMap.entries()) {
    if (!newMap.has(key)) {
      proposals.push({ type: SyncProposalType.OBSOLETE, entityType, entityId: oldItem[keyField] as string, before: oldItem, after: null });
    }
  }
  return proposals;
}

function diffSingleObject<T>(oldData: T | null, newData: T | undefined | null, entityType: 'brand_kit' | 'org_chart', entityId: string): Proposal[] {
    const proposals: Proposal[] = [];
    const newExists = newData && Object.keys(newData).length > 0;
    
    if (!oldData && newExists) {
        proposals.push({ type: SyncProposalType.NEW, entityType, entityId, before: null, after: newData });
    } else if (oldData && !newExists) {
        proposals.push({ type: SyncProposalType.OBSOLETE, entityType, entityId, before: oldData, after: null });
    } else if (oldData && newExists && JSON.stringify(oldData) !== JSON.stringify(newData)) {
        proposals.push({ type: SyncProposalType.UPDATED, entityType, entityId, before: oldData, after: newData });
    }
    return proposals;
}

export async function processContentBatch(
  workspaceId: string,
  batchId: string
) {
  try {
    const db = getAdminFirestore();
    const storage = getAdminStorage();
    const timestamp = serverTimestamp();

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
    const contentPromises = sourcesSnapshot.docs.map(async (docSnap): Promise<string> => {
        const data = docSnap.data() as Source;
        
        switch (data.type) {
            case SourceType.TEXT:
                return data.rawText || '';
            case SourceType.FILE:
                if (data.mimeType === 'application/pdf' && data.storagePath) {
                    try {
                        const fileRef = ref(storage, data.storagePath);
                        const fileBuffer = await getBytes(fileRef);
                        const parsedPdf = await pdf(fileBuffer);
                        return parsedPdf.text;
                    } catch (error) {
                        console.error(`Error processing PDF ${data.sourceName}:`, error);
                        return ''; // Don't fail the whole batch, just skip this file.
                    }
                }
                // Placeholder for other file types like .docx, .txt etc.
                return '';
            case SourceType.AUDIO:
                return data.transcript || '';
            default:
                return '';
        }
    });

    const allContents = await Promise.all(contentPromises);
    const consolidatedContent = allContents.filter(content => content && content.trim() !== '').join('\n\n---\n\n');


    if (!consolidatedContent.trim()) {
      throw new Error(
        'Nenhum conteúdo textual encontrado nas fontes para processar.'
      );
    }
    
    // Fetch all existing published knowledge to pass to the AI for context
    const publishedKnowledgeRef = doc(db, `workspaces/${workspaceId}/published_knowledge`, workspaceId);
    const brandKitRef = doc(db, `workspaces/${workspaceId}/brand_kit`, 'live');
    const orgChartRef = doc(db, `workspaces/${workspaceId}/org_charts`, 'live');
    const playbooksQuery = query(collection(db, `workspaces/${workspaceId}/playbooks`), where('status', '==', 'published'));
    const trainingQuery = query(collection(db, `workspaces/${workspaceId}/training_modules`), where('status', '==', 'published'));
    
    const [
        publishedKnowledgeSnap,
        brandKitSnap,
        orgChartSnap,
        playbooksSnap,
        trainingSnap
    ] = await Promise.all([
        getDoc(publishedKnowledgeRef),
        getDoc(brandKitRef),
        getDoc(orgChartRef),
        getDocs(playbooksQuery),
        getDocs(trainingQuery)
    ]);

    let existingKnowledgeForAI: object | null = null;
    const hasExistingKnowledge = publishedKnowledgeSnap.exists() || brandKitSnap.exists() || !playbooksSnap.empty || !trainingSnap.empty;

    if (hasExistingKnowledge) {
        existingKnowledgeForAI = {
            knowledgeBase: publishedKnowledgeSnap.data()?.categories || [],
            brandKit: brandKitSnap.data() || {},
            organizationalChart: orgChartSnap.data() || {},
            playbooks: playbooksSnap.docs.map(d => d.data()) || [],
            trainingModules: trainingSnap.docs.map(d => d.data()) || [],
        }
    }


    // 3. Call the Genkit flow to analyze content
    let aiResult: AnalyzeAndStructureContentOutput;
    aiResult = await analyzeAndStructureContent({
      rawContent: consolidatedContent,
      existingKnowledge: existingKnowledgeForAI ? JSON.stringify(existingKnowledgeForAI, null, 2) : undefined,
    });

    // 4. Start final batch write
    const finalBatch = writeBatch(db);
    const workspaceSnap = await getDoc(workspaceRef);
    
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
          finalBatch.set(playbookRef, { ...playbook, sourceRefs: sourceIds, status: 'draft', createdAt: timestamp, updatedAt: timestamp, sourceBatchId: batchId });
      });
      aiResult.trainingModules.forEach((module) => {
          const moduleRef = doc(collection(db, `workspaces/${workspaceId}/training_modules`));
          finalBatch.set(moduleRef, { ...module, sourceRefs: sourceIds, status: 'draft', createdAt: timestamp, sourceBatchId: batchId });
      });
      finalBatch.update(workspaceRef, {
          ingestionState: IngestionState.IDLE,
          status: WorkspaceStatus.DRAFT_READY,
          lastProcessedAt: timestamp,
      });
    } else {
      // --- SYNC PROPOSAL FLOW ---
      const publishedKnowledge = publishedKnowledgeSnap.data() as PublishedKnowledge;
      const knowledgeProposals = diffKnowledge(publishedKnowledge.categories, aiResult.knowledgeBase);
      const playbookProposals = diffGenericArray(playbooksSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Playbook[], aiResult.playbooks, 'processo', 'playbook');
      const trainingProposals = diffGenericArray(trainingSnap.docs.map(d => ({ ...d.data(), id: d.id })) as TrainingModule[], aiResult.trainingModules, 'titulo', 'training');
      const brandKitProposals = diffSingleObject(brandKitSnap.data() as BrandKit | null, aiResult.brandKit, 'brand_kit', 'live');
      const orgChartProposals = diffSingleObject(orgChartSnap.data() as OrgChart | null, aiResult.organizationalChart, 'org_chart', 'live');

      const allProposals = [...knowledgeProposals, ...playbookProposals, ...trainingProposals, ...brandKitProposals, ...orgChartProposals];
      
      if (allProposals.length > 0) {
          allProposals.forEach(proposal => {
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
              pendingSyncCount: allProposals.length,
          });
      } else {
          // No changes found, so reset the status to published
           finalBatch.update(workspaceRef, {
              ingestionState: IngestionState.IDLE,
              status: WorkspaceStatus.PUBLISHED,
              pendingSyncCount: 0,
              lastProcessedAt: timestamp,
          });
      }
    }
    
    // Create drafts for brand kit and org chart regardless of flow
    if (aiResult.brandKit && Object.keys(aiResult.brandKit).length > 0) {
      const brandKitDraftRef = doc(db, `workspaces/${workspaceId}/brand_kit`, 'draft');
      finalBatch.set(brandKitDraftRef, { ...aiResult.brandKit, sourceRefs: sourceIds, sourceBatchId: batchId, status: 'draft', workspaceId: workspaceId }, { merge: true });
    }
    if (aiResult.organizationalChart && aiResult.organizationalChart.nodes.length > 0) {
        const orgChartDraftRef = doc(db, `workspaces/${workspaceId}/org_charts`, 'draft');
        finalBatch.set(orgChartDraftRef, { ...aiResult.organizationalChart, sourceRefs: sourceIds, sourceBatchId: batchId, status: 'draft', workspaceId: workspaceId, createdAt: timestamp }, { merge: true });
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
  
  const brandKitDraftRef = doc(db, `workspaces/${workspaceId}/brand_kit`, 'draft');
  const brandKitDraftSnap = await getDoc(brandKitDraftRef);

  const orgChartDraftRef = doc(db, `workspaces/${workspaceId}/org_charts`, 'draft');
  const orgChartDraftSnap = await getDoc(orgChartDraftRef);

  // 1a. Handle Brand Kit publishing
  if (brandKitDraftSnap.exists() && brandKitDraftSnap.data().sourceBatchId === draftData.sourceBatchId) {
      const brandKitLiveData = { ...brandKitDraftSnap.data() };
      delete brandKitLiveData.status;
      delete brandKitLiveData.sourceBatchId;

      const brandKitLiveRef = doc(db, `workspaces/${workspaceId}/brand_kit`, 'live');
      batch.set(brandKitLiveRef, {
          ...brandKitLiveData,
          publishedAt: timestamp,
          version: newVersion,
          publishedBy: userId,
      }, { merge: true });

      batch.delete(brandKitDraftRef);
  }

  // 1b. Handle Org Chart publishing
  if (orgChartDraftSnap.exists() && orgChartDraftSnap.data().sourceBatchId === draftData.sourceBatchId) {
    const orgChartLiveData = { ...orgChartDraftSnap.data() };
    delete orgChartLiveData.status;
    delete orgChartLiveData.sourceBatchId;

    const orgChartLiveRef = doc(db, `workspaces/${workspaceId}/org_charts`, 'live');
    batch.set(orgChartLiveRef, {
        ...orgChartLiveData,
        publishedAt: timestamp,
        version: newVersion,
        publishedBy: userId,
        status: 'published',
    }, { merge: true });
    batch.delete(orgChartDraftRef);
  }

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
    const timestamp = Timestamp.now();
    const batch = writeBatch(db);

    // Helper function to find a document ID by a field value
    const findDocId = async (collectionName: string, fieldName: string, value: string): Promise<string | null> => {
        const q = query(collection(db, `workspaces/${workspaceId}/${collectionName}`), where(fieldName, '==', value), where('status', '==', 'published'));
        const snap = await getDocs(q);
        return snap.empty ? null : snap.docs[0].id;
    }

    // 3. Apply changes locally and to batch
    for (const proposalDoc of proposalsSnap.docs) {
        const proposal = proposalDoc.data() as SyncProposal;
        
        if (proposal.entityType === 'knowledge') {
            const itemTitle = proposal.entityId;
            if (proposal.type === SyncProposalType.NEW) {
                let category = newCategories.find(c => c.categoria === proposal.after.categoria);
                if (category) { category.itens.push(proposal.after); } 
                else { newCategories.push({ categoria: proposal.after.categoria, icone: '✨', itens: [proposal.after]}); }
            } else if (proposal.type === SyncProposalType.UPDATED) {
                newCategories = newCategories.map(cat => ({ ...cat, itens: cat.itens.map(item => item.titulo.toLowerCase() === itemTitle.toLowerCase() ? proposal.after : item) }));
            } else if (proposal.type === SyncProposalType.OBSOLETE) {
                 newCategories = newCategories.map(cat => ({ ...cat, itens: cat.itens.filter(item => item.titulo.toLowerCase() !== itemTitle.toLowerCase()) })).filter(cat => cat.itens.length > 0);
            }
        } else if (proposal.entityType === 'playbook') {
            const docId = await findDocId('playbooks', 'processo', proposal.entityId);
            if (proposal.type === SyncProposalType.NEW) {
                batch.set(doc(collection(db, `workspaces/${workspaceId}/playbooks`)), { ...proposal.after, status: 'published', updatedAt: timestamp });
            } else if (proposal.type === SyncProposalType.UPDATED && docId) {
                batch.update(doc(db, `workspaces/${workspaceId}/playbooks`, docId), { ...proposal.after, status: 'published', updatedAt: timestamp });
            } else if (proposal.type === SyncProposalType.OBSOLETE && docId) {
                batch.delete(doc(db, `workspaces/${workspaceId}/playbooks`, docId));
            }
        } else if (proposal.entityType === 'brand_kit') {
             const brandKitRef = doc(db, `workspaces/${workspaceId}/brand_kit`, 'live');
             if (proposal.type === SyncProposalType.NEW || proposal.type === SyncProposalType.UPDATED) {
                batch.set(brandKitRef, { ...proposal.after, status: 'published', publishedAt: timestamp, publishedBy: userId }, { merge: true });
            } else if (proposal.type === SyncProposalType.OBSOLETE) {
                batch.delete(brandKitRef);
            }
        }
        // TODO: Implement for training and org chart
    };
    
    // 4. Start a batch write
    const orgChartDraftRef = doc(db, `workspaces/${workspaceId}/org_charts`, 'draft');
    const orgChartDraftSnap = await getDoc(orgChartDraftRef);
    const firstProposalSourceBatchId = proposalsSnap.docs[0]?.data().sourceBatchId;

    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    const currentVersion = workspaceSnap.data()?.version || 0;
    const newVersion = currentVersion + 1;

    // Publish org chart if it came from the same batch
    if (orgChartDraftSnap.exists() && orgChartDraftSnap.data().sourceBatchId === firstProposalSourceBatchId) {
        const orgChartLiveData = { ...orgChartDraftSnap.data() };
        delete orgChartLiveData.status;
        delete orgChartLiveData.sourceBatchId;
        const orgChartLiveRef = doc(db, `workspaces/${workspaceId}/org_charts`, 'live');
        batch.set(orgChartLiveRef, { ...orgChartLiveData, status: 'published', publishedAt: timestamp, version: newVersion, publishedBy: userId }, { merge: true });
        batch.delete(orgChartDraftRef);
    }
    
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

export async function updateTrainingProgress(
  workspaceId: string,
  userId: string,
  moduleId: string,
  status: TrainingProgressStatus
) {
  const db = getAdminFirestore();

  const progressColRef = collection(db, `workspaces/${workspaceId}/trainingProgress`);
  const q = query(
    progressColRef,
    where('userId', '==', userId),
    where('moduleId', '==', moduleId)
  );

  const timestamp = serverTimestamp();
  const progressData: Partial<TrainingProgress> = {
    userId,
    moduleId,
    status,
  };

  if (status === TrainingProgressStatus.IN_PROGRESS && !progressData.startedAt) {
    progressData.startedAt = timestamp as Timestamp;
  } else if (status === TrainingProgressStatus.COMPLETED) {
    progressData.completedAt = timestamp as Timestamp;
  }

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      // No existing document, create a new one
      const newDocRef = doc(progressColRef);
      await setDoc(newDocRef, { ...progressData, id: newDocRef.id });
    } else {
      // Document exists, update it
      const docToUpdateRef = querySnapshot.docs[0].ref;
      await updateDoc(docToUpdateRef, progressData);
    }
  } catch (error) {
    console.error("Error updating training progress:", error);
    throw new Error("Falha ao atualizar o progresso do treinamento.");
  }
}
