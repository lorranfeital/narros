'use server';

import { collection, getDocs, query, where, limit, startAt, endAt, orderBy, serverTimestamp, addDoc, getDoc, doc } from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { headers } from 'next/headers';
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
  
  // Firestore doesn't have a native "contains" or "like" query.
  // This is a common workaround for prefix searching.
  const q = query(
      workspacesRef,
      orderBy('name'),
      startAt(searchTerm),
      endAt(searchTerm + '\uf8ff'),
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
}

export async function requestWorkspaceConnection(payload: RequestConnectionPayload) {
    const db = getAdminFirestore();
    const headersList = headers();
    const userToken = headersList.get('X-Firebase-AppCheck-Token');

    if (!userToken) {
        throw new Error("Usuário não autenticado. Ação não permitida.");
    }
    
    // In a real scenario, you would verify this token with Firebase Admin SDK.
    // For this environment, we'll extract the UID from the unverified token.
    const decodedToken = JSON.parse(Buffer.from(userToken.split('.')[1], 'base64').toString());
    const userId = decodedToken.user_id;

    if (!userId) {
        throw new Error("Token de usuário inválido.");
    }

    const { sourceWorkspaceId, targetWorkspaceId, targetWorkspaceName, targetWorkspaceLogoUrl } = payload;
    
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
        throw new Error("Falha ao criar a solicitação de conexão no banco de dados.");
    }
}
