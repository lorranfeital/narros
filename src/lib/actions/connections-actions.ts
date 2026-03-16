'use server';

import { collection, getDocs, query, where, limit, startAt, endAt, orderBy } from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { Workspace } from '@/lib/firestore-types';

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