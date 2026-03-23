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
    if (isUserLoading || isWorkspaceLoading) {
      // Still waiting for data, do nothing.
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    // After loading is complete, check for the workspace.
    // If it's null, it means useDoc failed, likely due to security rules.
    if (!workspace) {
      router.push('/unauthorized');
      return;
    }

    // If we have the workspace, perform the final membership check.
    const isOwner = workspace.ownerId === user.uid;
    const hasRole = workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid);

    if (!isOwner && !hasRole) {
      router.push('/unauthorized');
    }
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
