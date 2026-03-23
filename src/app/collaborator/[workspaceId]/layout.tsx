'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, useParams } from "next/navigation";
import { useEffect, ReactNode, useMemo } from "react";
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
    if (isUserLoading || isWorkspaceLoading) {
      return; // Wait for both user and workspace data to be loaded.
    }

    if (!user) {
      router.push('/login');
      return;
    }

    // After loading, if workspace is still null, it means no access or doesn't exist.
    if (!workspace) {
      router.push('/unauthorized');
      return;
    }

    // Final check: verify membership from the loaded workspace data.
    const isOwner = workspace.ownerId === user.uid;
    const hasRole = workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid);

    if (!isOwner && !hasRole) {
      router.push('/unauthorized');
    }
  }, [user, isUserLoading, workspace, isWorkspaceLoading, router, workspaceId]);


  // Show loading screen until both hooks are done and we have a definitive workspace object (or not)
  if (isUserLoading || isWorkspaceLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando área do colaborador...</p>
      </div>
    );
  }

  // If loading is done, but there's no workspace, it means access was denied.
  // The useEffect will handle the redirect, but we show a placeholder to prevent rendering children.
  if (!workspace) {
      return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Verificando permissões...</p>
        </div>
      );
  }

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
