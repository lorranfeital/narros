'use client';

import { useRouter, useParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { Workspace } from "@/lib/firestore-types";
import { CollaboratorSidebar } from "@/components/collaborator/sidebar";
import { cn } from "@/lib/utils";

export default function CollaboratorLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const workspaceDocRef = useMemoFirebase(() => {
    if (!firestore || !workspaceId) return null;
    return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);
  
  const { data: workspace, isLoading: isWorkspaceLoading, notFound: workspaceNotFound } = useDoc<Workspace>(workspaceDocRef);
  
  useEffect(() => {
    // 1. Guard against running logic while data is still loading.
    if (isUserLoading || isWorkspaceLoading) {
      return; 
    }
    
    // 2. Handle unauthenticated users.
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // 3. Handle confirmed "not found" state from useDoc.
    if (workspaceNotFound) {
        router.push('/unauthorized');
        return;
    }

    // 4. If loading is done and we still don't have a workspace object, wait.
    if (!workspace) {
        return;
    }

    // 5. We have a user and a workspace, now check permissions.
    const isOwner = workspace.ownerId === user.uid;
    const userRole = workspace.roles?.[user.uid];
    const isMember = isOwner || !!userRole;

    if (!isMember) {
      router.push('/unauthorized');
      return;
    }
    
    if (isOwner || userRole === 'admin' || userRole === 'curator') {
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }
    
  }, [isUserLoading, isWorkspaceLoading, user, workspace, workspaceNotFound, router, workspaceId]);

  if (isUserLoading || isWorkspaceLoading || (!workspace && !workspaceNotFound)) {
     return (
      <div className="flex h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }

  // After loading, if the workspace was confirmed not found, the useEffect will have redirected.
  // We can show a message while that happens.
  if (workspaceNotFound) {
      return (
          <div className="flex h-screen items-center justify-center">
              <p>Redirecionando...</p>
          </div>
      );
  }

  // If we reach here, we have a user and a workspace, and the useEffect has confirmed permissions.
  if(user && workspace) {
    return (
      <div className="flex h-screen bg-background">
        <CollaboratorSidebar />
        <main className={cn(
          "flex-1 overflow-y-auto transition-all duration-300 ease-in-out"
          )}>
          {children}
        </main>
      </div>
    );
  }

  // Fallback for any other state while redirecting (e.g., no user)
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  );
}
