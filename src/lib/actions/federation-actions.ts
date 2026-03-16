
'use server';

import { collection, getDocs, query, where, doc, getDoc, or, and, Timestamp } from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Workspace, WorkspaceLink, PublishedKnowledge, Playbook } from '@/lib/firestore-types';

function getAdminFirestore() {
  if (getApps().length === 0) { initializeApp(firebaseConfig); }
  return getFirestore(getApp());
}

// Helper to recursively convert Firestore Timestamps to serializable ISO strings
function serializeData(data: any): any {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }
  
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeData(item));
  }

  const result: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      result[key] = serializeData(data[key]);
    }
  }
  return result;
}


export interface FederatedMapData {
    workspace: Workspace & { id: string };
    knowledge: PublishedKnowledge | null;
    playbooks: (Playbook & { id: string })[];
}

export async function getFederatedMapData(
  currentWorkspaceId: string
): Promise<{ [workspaceId: string]: FederatedMapData }> {
  const db = getAdminFirestore();
  
  // 1. Find all active connections
  const connectionsQuery = query(
    collection(db, 'workspaceLinks'),
    and(
        where('status', '==', 'active'),
        or(
            where('sourceWorkspaceId', '==', currentWorkspaceId),
            where('targetWorkspaceId', '==', currentWorkspaceId)
        )
    )
  );
  const connectionsSnap = await getDocs(connectionsQuery);
  const connectedIds = connectionsSnap.docs.map(doc => {
      const link = doc.data() as WorkspaceLink;
      return link.sourceWorkspaceId === currentWorkspaceId ? link.targetWorkspaceId : link.sourceWorkspaceId;
  });

  const allWorkspaceIds = [currentWorkspaceId, ...connectedIds];
  const federatedData: { [workspaceId: string]: any } = {};

  // 2. Fetch data for each workspace
  await Promise.all(
    allWorkspaceIds.map(async (id) => {
        const workspaceRef = doc(db, 'workspaces', id);
        const knowledgeRef = doc(db, `workspaces/${id}/published_knowledge`, id);
        const playbooksQuery = query(collection(db, `workspaces/${id}/playbooks`), where('status', '==', 'published'));
        
        const [wsSnap, knowledgeSnap, playbooksSnap] = await Promise.all([
            getDoc(workspaceRef),
            getDoc(knowledgeRef),
            getDocs(playbooksQuery)
        ]);

        if (wsSnap.exists()) {
            const dataToSerialize: FederatedMapData = {
                workspace: { ...(wsSnap.data() as Workspace), id: wsSnap.id },
                knowledge: knowledgeSnap.exists() ? (knowledgeSnap.data() as PublishedKnowledge) : null,
                playbooks: playbooksSnap.docs.map(d => ({ ...(d.data() as Playbook), id: d.id }))
            };
            federatedData[id] = serializeData(dataToSerialize);
        }
    })
  );

  return federatedData;
}
