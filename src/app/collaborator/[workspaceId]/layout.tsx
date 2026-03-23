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
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [CollaboratorLayout] useEffect triggered.`, { isUserLoading, isWorkspaceLoading, user: !!user, workspace: !!workspace, workspaceId });

    // Guard: Wait for all data sources to finish their initial load.
    if (isUserLoading || isWorkspaceLoading) {
      console.log(`[${timestamp}] [CollaboratorLayout] Still loading...`, { isUserLoading, isWorkspaceLoading });
      return; 
    }
    
    console.log(`[${timestamp}] [CollaboratorLayout] Loading finished.`);
    
    // Guard: If there's no authenticated user after loading, redirect to login.
    if (!user) {
      console.log(`[${timestamp}] [CollaboratorLayout] No authenticated user. Redirecting to /login.`);
      router.replace('/login');
      return;
    }
    console.log(`[${timestamp}] [CollaboratorLayout] User is authenticated (UID: ${user.uid}).`);
    
    // At this point, loading is done and we have a user.
    // Now, we can make decisions based on the workspace data.

    // Scenario 1: Workspace data is missing AFTER loading has finished.
    if (!workspace) {
        console.error(`[${timestamp}] [CollaboratorLayout] REDIRECTING to /unauthorized because workspace document not found after loading. Error from useDoc: ${workspaceError?.message || 'No error object'}`);
        router.push('/unauthorized');
        return;
    }
    console.log(`[${timestamp}] [CollaboratorLayout] Workspace is loaded (ID: ${workspace.id}).`);

    // Scenario 2: Workspace exists. Check permissions.
    const isOwner = workspace.ownerId === user.uid;
    const userRole = workspace.roles?.[user.uid];
    const hasRole = !!userRole;
    const isMember = isOwner || hasRole;
    
    console.log(`[${timestamp}] [CollaboratorLayout] Final permission check:`, { isOwner, hasRole, isMember });

    // If the user is NOT a member of this workspace, it's an unauthorized access.
    if (!isMember) {
      console.warn(`[${timestamp}] [CollaboratorLayout] REDIRECTING to /unauthorized because user is not a member.`);
      router.push('/unauthorized');
      return;
    }
    
    // If the user IS a member, but has a role that should be in the dashboard, redirect them there.
    if (isOwner || userRole === 'admin' || userRole === 'curator') {
      console.log(`[${timestamp}] [CollaboratorLayout] User is an admin/curator. Redirecting to dashboard.`);
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }
    
    // If we reach here, user is an authorized collaborator.
    console.log(`[${timestamp}] [CollaboratorLayout] Access GRANTED. Rendering children.`);

  }, [isUserLoading, isWorkspaceLoading, user, workspace, router, workspaceId, workspaceError]);

  const timestamp = new Date().toLocaleTimeString();
  const isLoading = isUserLoading || isWorkspaceLoading;
  if (isLoading) {
    console.log(`[${timestamp}] [CollaboratorLayout] Render: Showing loading screen.`);
     return (
      <div className="flex h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }
  
  if (!user) {
    console.log(`[${timestamp}] [CollaboratorLayout] Render: No user found, showing redirecting message.`);
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Redirecionando para login...</p>
        </div>
    );
  }

  // After loading, if workspace is still null, it's an error state.
  if (!workspace) {
    console.log(`[${timestamp}] [CollaboratorLayout] Render: No workspace found after loading, showing redirecting message.`);
     return (
      <div className="flex h-screen items-center justify-center">
        <p>Redirecionando...</p>
      </div>
    );
  }

  // Final check before rendering, just to be absolutely sure.
  const isAuthorizedCollaborator = workspace.roles?.[user.uid] === 'member' || workspace.roles?.[user.uid] === 'collaborator';
     
  if (isAuthorizedCollaborator) {
    console.log(`[${timestamp}] [CollaboratorLayout] Render: Authorized. Rendering content.`);
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
  console.log(`[${timestamp}] [CollaboratorLayout] Render: Not an authorized collaborator, showing redirecting message.`);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  );
}
