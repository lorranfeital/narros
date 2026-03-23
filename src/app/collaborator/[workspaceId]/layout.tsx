
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
  
  const { data: workspace, isLoading: isWorkspaceLoading, error: workspaceError } = useDoc<Workspace>(workspaceDocRef);

  useEffect(() => {
    const isLoading = isUserLoading || isWorkspaceLoading;
    if (isLoading) {
      return; // Wait for all data to settle.
    }
    
    // --- At this point, all hooks have finished their loading cycle ---
    
    // 1. User not logged in
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Workspace doesn't exist (permission error or not found)
    if (!workspace) {
      router.push('/unauthorized');
      return;
    }
    
    // 3. User is not a member of this workspace
    const isOwner = workspace.ownerId === user.uid;
    const userRole = workspace.roles?.[user.uid];
    const isMember = isOwner || !!userRole;

    if (!isMember) {
      router.push('/unauthorized');
      return;
    }
    
    // 4. User is an admin/curator and should be on the main dashboard
    if (isOwner || userRole === 'admin' || userRole === 'curator') {
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }
    
    // 5. If all checks pass, user is an authorized collaborator.

  }, [isUserLoading, isWorkspaceLoading, user, workspace, router, workspaceId, workspaceError]);

  // === RENDER LOGIC ===

  const isLoading = isUserLoading || isWorkspaceLoading;
  
  if (isLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }

  // Only render children if user and workspace are loaded and authorized.
  // The useEffect handles all unauthorized/redirect cases.
  if (user && workspace) {
     const userRole = workspace.roles?.[user.uid];
     const isAuthorizedCollaborator = userRole === 'member' || userRole === 'collaborator';
     
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

  // Fallback case: Loading is done, but conditions aren't met for rendering.
  // The useEffect is already handling the redirection. We show a loader to prevent content flash.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  );
}
