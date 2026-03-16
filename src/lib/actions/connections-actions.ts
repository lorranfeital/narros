
'use server';

import { collection, getDocs, query, where, limit, startAt, endAt, orderBy, serverTimestamp, addDoc, getDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Workspace, WorkspaceLink, WorkspaceLinkStatus } from '@/lib/firestore-types';


// Helper to get a server-side Firestore instance
function getAdminFirestore() {
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

export interface SearchableWorkspace {
    id: string;
    name: string;
    logoUrl?: string;
}

export async function searchWorkspaces(
  searchTerm: string,
  currentWorkspaceId: string
): Promise<SearchableWorkspace[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const db = getAdminFirestore();
  const workspacesRef = collection(db, 'workspaces');
  
  // Perform a case-insensitive prefix search.
  const lowercasedSearchTerm = searchTerm.toLowerCase();
  
  const q = query(
      workspacesRef,
      orderBy('name_lowercase'),
      startAt(lowercasedSearchTerm),
      endAt(lowercasedSearchTerm + '\uf8ff'),
      limit(10)
  );

  try {
    const querySnapshot = await getDocs(q);
    const results: SearchableWorkspace[] = [];
    
    querySnapshot.forEach((doc) => {
      // Exclude the current workspace from the results
      if (doc.id !== currentWorkspaceId) {
        const data = doc.data() as Workspace;
        results.push({
          id: doc.id,
          name: data.name,
          logoUrl: data.logoUrl,
        });
      }
    });

    return results;
  } catch (error) {
    console.error("Error searching workspaces:", error);
    // In a real app, you'd want more robust error handling.
    // For now, we'll return an empty array.
    return [];
  }
}

interface RequestConnectionPayload {
    sourceWorkspaceId: string;
    targetWorkspaceId: string;
    targetWorkspaceName: string;
    targetWorkspaceLogoUrl?: string;
    userId: string;
}

export async function requestWorkspaceConnection(payload: RequestConnectionPayload) {
    const db = getAdminFirestore();
    
    const { sourceWorkspaceId, targetWorkspaceId, targetWorkspaceName, targetWorkspaceLogoUrl, userId } = payload;
    
    if (!userId) {
        throw new Error("Usuário não autenticado. Ação não permitida.");
    }
    
    // Check for existing connection
    const existingConnectionQuery = query(
        collection(db, 'workspaceLinks'),
        where('sourceWorkspaceId', 'in', [sourceWorkspaceId, targetWorkspaceId]),
        where('targetWorkspaceId', 'in', [sourceWorkspaceId, targetWorkspaceId])
    );
    const existingConnectionSnap = await getDocs(existingConnectionQuery);
    if (!existingConnectionSnap.empty) {
        throw new Error("Já existe uma conexão ou solicitação pendente com este workspace.");
    }
    
    // Get source workspace details
    const sourceWorkspaceRef = doc(db, 'workspaces', sourceWorkspaceId);
    const sourceWorkspaceSnap = await getDoc(sourceWorkspaceRef);
    if (!sourceWorkspaceSnap.exists()) {
        throw new Error("Workspace de origem não encontrado.");
    }
    const sourceWorkspaceData = sourceWorkspaceSnap.data() as Workspace;

    // Create the connection request document
    const newLink: Omit<WorkspaceLink, 'id'> = {
        sourceWorkspaceId: sourceWorkspaceId,
        sourceWorkspaceName: sourceWorkspaceData.name,
        sourceWorkspaceLogoUrl: sourceWorkspaceData.logoUrl || '',
        targetWorkspaceId: targetWorkspaceId,
        targetWorkspaceName: targetWorkspaceName,
        targetWorkspaceLogoUrl: targetWorkspaceLogoUrl || '',
        status: WorkspaceLinkStatus.PENDING,
        createdBy: userId,
        createdAt: serverTimestamp() as any, // Cast for server action
        updatedAt: serverTimestamp() as any,
    };

    try {
        await addDoc(collection(db, 'workspaceLinks'), newLink);
    } catch (error) {
        console.error("Error creating workspace link:", error);
        throw new Error("Falha ao criar la solicitação de conexão no banco de dados.");
    }
}


export async function updateWorkspaceLinkStatus(
    linkId: string,
    status: WorkspaceLinkStatus.ACTIVE | WorkspaceLinkStatus.REJECTED,
    userId: string,
    currentWorkspaceId: string
): Promise<void> {
    const db = getAdminFirestore();
    const linkRef = doc(db, 'workspaceLinks', linkId);
    const linkSnap = await getDoc(linkRef);

    if (!linkSnap.exists()) {
        throw new Error("Solicitação de conexão não encontrada.");
    }
    const linkData = linkSnap.data() as WorkspaceLink;

    // Security check: Only a member of the target workspace can approve/reject.
    if (linkData.targetWorkspaceId !== currentWorkspaceId) {
         throw new Error("Permissão negada. Ação permitida apenas para o workspace de destino.");
    }
    const workspaceRef = doc(db, 'workspaces', currentWorkspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    if (!workspaceSnap.exists() || !(workspaceSnap.data() as Workspace).members.includes(userId)) {
        throw new Error("Permissão negada. Você não é membro do workspace de destino.");
    }
    
    await updateDoc(linkRef, {
        status: status,
        updatedAt: serverTimestamp(),
        updatedBy: userId
    });
}

export async function deleteWorkspaceLink(
    linkId: string,
    userId: string,
    currentWorkspaceId: string
): Promise<void> {
    const db = getAdminFirestore();
    const linkRef = doc(db, 'workspaceLinks', linkId);
    const linkSnap = await getDoc(linkRef);

    if (!linkSnap.exists()) {
        throw new Error("Conexão não encontrada.");
    }
    const linkData = linkSnap.data() as WorkspaceLink;

    // Security check: only members of source or target can delete.
    const isSourceMember = linkData.sourceWorkspaceId === currentWorkspaceId;
    const isTargetMember = linkData.targetWorkspaceId === currentWorkspaceId;

    if (!isSourceMember && !isTargetMember) {
        throw new Error("Permissão negada. Você não pertence a nenhum dos workspaces da conexão.");
    }
    
    const workspaceToCheck = isSourceMember ? linkData.sourceWorkspaceId : linkData.targetWorkspaceId;
    const workspaceRef = doc(db, 'workspaces', workspaceToCheck);
    const workspaceSnap = await getDoc(workspaceRef);

    if (!workspaceSnap.exists() || !(workspaceSnap.data() as Workspace).members.includes(userId)) {
        throw new Error("Permissão negada. Você não é membro do workspace.");
    }

    await deleteDoc(linkRef);
}
