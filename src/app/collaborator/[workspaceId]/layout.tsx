'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, useParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { doc } from 'firebase/firestore';
import { Workspace } from "@/lib/firestore-types";
import { CollaboratorSidebar } from "@/components/collaborator/sidebar";
import { cn } from "@/lib/utils";

export default function CollaboratorLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const workspaceDocRef = useMemoFirebase(() => {
      if (!firestore || !workspaceId) return null;
      return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);
  const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);
  
  useEffect(() => {
    // Wait until both user and workspace data have finished loading
    if (isUserLoading || isWorkspaceLoading) {
      return; 
    }

    // After loading, if there is no user, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }
    
    // After loading, if the workspace doc doesn't exist, user doesn't have permission.
    if (!workspace) {
        router.push('/unauthorized');
        return;
    }

    // Final permission check: user must be an owner or have a role.
    const isOwner = workspace.ownerId === user.uid;
    const hasRole = workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid);
    const isMember = isOwner || hasRole;
    
    if (!isMember) {
        router.push('/unauthorized');
        return;
    }

  }, [user, isUserLoading, workspace, isWorkspaceLoading, router, workspaceId]);


  // This part of the component renders what the user sees.
  // The logic here is to prevent a "flash" of content before the useEffect can redirect.
  const isLoading = isUserLoading || isWorkspaceLoading;

  if (isLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando área do colaborador...</p>
      </div>
    );
  }

  // At this point, loading is finished.
  // We can do a final check before rendering children.
  // If the useEffect hasn't redirected yet, this will prevent content from flashing.
  const isMember = (workspace && user) ? (workspace.ownerId === user.uid || (workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid))) : false;
  if (!user || !workspace || !isMember) {
      return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Verificando permissões...</p>
        </div>
      );
  }

  // If all checks pass, render the layout.
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
