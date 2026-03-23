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
  
  const getTimestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });

  useEffect(() => {
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] [CollaboratorLayout] useEffect triggered.`, {
        isUserLoading,
        isWorkspaceLoading,
        user: !!user,
        workspace: !!workspace,
        workspaceId,
    });

    if (isUserLoading || isWorkspaceLoading) {
      console.log(`[${timestamp}] [CollaboratorLayout] Still loading...`);
      return; 
    }
    
    console.log(`[${timestamp}] [CollaboratorLayout] Loading finished.`);

    if (!user) {
      console.log(`[${timestamp}] [CollaboratorLayout] REDIRECTING to /login because user is not authenticated.`);
      router.replace('/login');
      return;
    }
    
    console.log(`[${timestamp}] [CollaboratorLayout] User is authenticated (UID: ${user.uid}).`);
    
    if (!workspace) {
        console.error(`[${timestamp}] [CollaboratorLayout] REDIRECTING to /unauthorized because workspace document not found after loading. Error from useDoc: ${workspaceError?.message || 'No error object'}`);
        router.push('/unauthorized');
        return;
    }

    console.log(`[${timestamp}] [CollaboratorLayout] Workspace is loaded (ID: ${workspace.id}).`);

    const isOwner = workspace.ownerId === user.uid;
    const userRole = workspace.roles?.[user.uid];
    const isMember = isOwner || !!userRole;

    console.log(`[${timestamp}] [CollaboratorLayout] Final permission check:`, { isOwner, hasRole: !!userRole, isMember });

    if (!isMember) {
      console.error(`[${timestamp}] [CollaboratorLayout] REDIRECTING to /unauthorized because user is not a member.`);
      router.push('/unauthorized');
      return;
    }
    
    if (isOwner || userRole === 'admin' || userRole === 'curator') {
      console.log(`[${timestamp}] [CollaboratorLayout] REDIRECTING to dashboard because user role is '${userRole}'.`);
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }

    console.log(`[${timestamp}] [CollaboratorLayout] Access GRANTED. Rendering children.`);

  }, [isUserLoading, isWorkspaceLoading, user, workspace, router, workspaceId, workspaceError]);

  if (isUserLoading || isWorkspaceLoading) {
     return (
      <div className="flex h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }
  
  // Don't render children until the workspace is confirmed to exist, to avoid flashes of content
  if (!workspace) {
      return (
          <div className="flex h-screen items-center justify-center">
            <p>Carregando dados do workspace...</p>
          </div>
      );
  }
  
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

  // Fallback for edge cases (e.g. an admin lands here before redirect)
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  );
}
