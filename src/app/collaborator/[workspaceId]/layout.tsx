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
  
  useEffect(() => {
    // Guard: Wait for all data sources to finish their initial load.
    if (isUserLoading || isWorkspaceLoading) {
      return; 
    }
    
    // Guard: If there's no authenticated user after loading, redirect to login.
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // At this point, loading is done and we have a user.
    // Now, we can make decisions based on the workspace data.

    // Scenario 1: Workspace data exists. We can check permissions.
    if (workspace) {
        const isOwner = workspace.ownerId === user.uid;
        const userRole = workspace.roles?.[user.uid];
        const isMember = isOwner || !!userRole;

        // If the user is NOT a member of this workspace, it's an unauthorized access.
        if (!isMember) {
          router.push('/unauthorized');
          return;
        }
        
        // If the user IS a member, but has a role that should be in the dashboard, redirect them there.
        if (isOwner || userRole === 'admin' || userRole === 'curator') {
          router.replace(`/dashboard/${workspaceId}`);
          return;
        }

        // If none of the above, the user is an authorized collaborator. Do nothing, allow render.

    } else {
      // Scenario 2: Loading is finished, but the workspace document is null.
      // This means the document doesn't exist or was not found for other reasons (like permissions).
      // This is a definitive "not found" state AFTER the initial load.
      router.push('/unauthorized');
      return;
    }

  }, [isUserLoading, isWorkspaceLoading, user, workspace, router, workspaceId]);

  // This is the main protection. It shows a loading screen until we are CERTAIN that
  // both the user and the workspace data are loaded. If the workspace data flickers
  // to null later, this will also re-activate, preventing render with incomplete data.
  if (isUserLoading || isWorkspaceLoading || !workspace) {
     return (
      <div className="flex h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }
  
  // Final check before rendering, just to be absolutely sure.
  const isAuthorizedCollaborator = workspace.roles?.[user?.uid || ''] === 'member' || workspace.roles?.[user?.uid || ''] === 'collaborator';
     
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

  // If the user is not an authorized collaborator but somehow passed the useEffect checks 
  // (e.g., an admin being redirected), show a generic message while the redirect happens.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  );
}
