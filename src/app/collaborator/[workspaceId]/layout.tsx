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
  const { data: workspace, isLoading: isWorkspaceLoading, error: workspaceError } = useDoc<Workspace>(workspaceDocRef);
  
  useEffect(() => {
    // 1. Wait until all data fetching is complete.
    if (isUserLoading || isWorkspaceLoading) {
      return; // Do nothing until loading is done.
    }

    // 2. Once loading is done, check for an authenticated user.
    if (!user) {
      router.push('/login');
      return;
    }

    // 3. Now, check the workspace data and user's role.
    // If there's no workspace OR the user isn't a member (owner or has a role), redirect.
    const isOwner = workspace?.ownerId === user.uid;
    const hasRole = workspace?.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid);
    
    if (!workspace || (!isOwner && !hasRole)) {
      router.push('/unauthorized');
    }
    // If we reach here, it means workspace exists and user is a member, so we do nothing and allow rendering.

  }, [user, isUserLoading, workspace, isWorkspaceLoading, router, workspaceId]);


  // Show a loading screen while auth and workspace data are being fetched.
  if (isUserLoading || isWorkspaceLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando área do colaborador...</p>
      </div>
    );
  }

  // If loading is done, but there's still no workspace, it means access was denied.
  // The useEffect will handle the redirect, but we show this to prevent children from rendering.
  if (!workspace) {
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
