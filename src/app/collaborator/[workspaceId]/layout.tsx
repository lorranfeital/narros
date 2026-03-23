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

    // --- DECISION LOGIC (RUNS ON EVERY RENDER) ---
    const isStillLoading = isUserLoading || isWorkspaceLoading;
    if (isStillLoading) {
      console.log(`[${timestamp}] [CollaboratorLayout] Still loading...`, { isUserLoading, isWorkspaceLoading });
      return; // Do nothing until all data sources are settled.
    }
    
    // --- At this point, all hooks have finished their initial loading cycle ---
    
    // 1. User not logged in
    if (!user) {
      console.error(`[${timestamp}] [CollaboratorLayout] REDIRECTING to /login because user is not logged in.`);
      router.replace('/login');
      return;
    }

    // 2. Workspace doesn't exist (permission error or not found)
    if (!workspace) {
      console.error(`[${timestamp}] [CollaboratorLayout] REDIRECTING to /unauthorized because workspace document not found after loading. Error from useDoc: ${workspaceError?.message || 'No error object'}`);
      router.push('/unauthorized');
      return;
    }
    
    // 3. User is not a member of this workspace
    const isOwner = workspace.ownerId === user.uid;
    const userRole = workspace.roles?.[user.uid];
    const isMemberCheck = isOwner || !!userRole;

    console.log(`[${timestamp}] [CollaboratorLayout] Final permission check:`, { isOwner, hasRole: !!userRole, roles: workspace.roles, isMember: isMemberCheck });

    if (!isMemberCheck) {
      console.error(`[${timestamp}] [CollaboratorLayout] REDIRECTING to /unauthorized because 'isMember' check failed. isOwner: ${isOwner}, hasRole: ${!!userRole}`);
      router.push('/unauthorized');
      return;
    }
    
    // 4. User is an admin/curator and should be on the main dashboard
    if (isOwner || userRole === 'admin' || userRole === 'curator') {
      console.log(`[${timestamp}] [CollaboratorLayout] User is an admin/curator. Redirecting to main dashboard.`);
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }
    
    // 5. If all checks pass, user is an authorized collaborator.
    console.log(`[${timestamp}] [CollaboratorLayout] Access GRANTED.`);

  }, [isUserLoading, isWorkspaceLoading, user, workspace, router, workspaceId, workspaceError]);

  // === RENDER LOGIC ===

  const isDataFullyLoaded = !isUserLoading && !isWorkspaceLoading;
  
  if (!isDataFullyLoaded) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }

  if (user && workspace) {
    const isOwner = workspace.ownerId === user.uid;
    const userRole = workspace.roles?.[user.uid];
    // This logic needs to be consistent with the useEffect logic
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

  // Fallback case: Loading is done, but conditions aren't met for rendering.
  // The useEffect is already handling the redirection. We show a loader to prevent content flash.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  );
}
