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
  const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

  const isDataLoading = isUserLoading || isWorkspaceLoading;

  useEffect(() => {
    // Only perform side-effects (redirection) when data has stopped loading.
    if (isDataLoading) {
      return;
    }

    // --- DECISION LOGIC (RUNS ONLY WHEN LOADING IS DONE) ---
    
    // 1. User not logged in
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Workspace doesn't exist or user is not a member
    const isOwner = workspace?.ownerId === user.uid;
    const userRole = workspace?.roles?.[user.uid];
    const isMember = isOwner || !!userRole;

    if (!workspace || !isMember) {
      router.replace('/unauthorized');
      return;
    }
    
    // 3. User is an admin/curator and should be on the dashboard
    if (isOwner || userRole === 'admin' || userRole === 'curator') {
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }

    // 4. If all checks pass, do nothing. User is authorized for this view.
  }, [isDataLoading, user, workspace, router, workspaceId]);

  // === RENDER LOGIC ===

  // If data is still loading, show a full-screen loader.
  if (isDataLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }

  // After loading, if we have a user and workspace, and they are an authorized collaborator, show the content.
  if (user && workspace) {
    const isOwner = workspace.ownerId === user.uid;
    const userRole = workspace.roles?.[user.uid];
    const isAuthorizedCollaborator = (isOwner || !!userRole) && !isOwner && userRole !== 'admin' && userRole !== 'curator';
    
    if (isAuthorizedCollaborator) {
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
  }

  // Fallback case: Loading is done, but conditions aren't met.
  // The useEffect is already handling the redirection. We show a loader to prevent content flash.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  );
}
