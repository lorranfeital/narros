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
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] CollaboratorLayout useEffect triggered.`, {
        isUserLoading,
        isWorkspaceLoading,
        user: !!user,
        workspace: !!workspace,
        workspaceId,
        pathname: typeof window !== 'undefined' ? window.location.pathname : '',
    });

    if (isUserLoading || isWorkspaceLoading) {
      console.log(`[${timestamp}] Still loading...`);
      return;
    }

    if (!user) {
      console.log(`[${timestamp}] No user found. Redirecting to /login.`);
      router.push('/login');
      return;
    }

    if (!workspace) {
      console.log(`[${timestamp}] Workspace document not found after loading. Redirecting to /unauthorized. Error: ${workspaceError?.message || 'No error'}`);
      router.push('/unauthorized');
      return;
    }

    // If we have the workspace, perform the final membership check.
    const isOwner = workspace.ownerId === user.uid;
    const hasRole = workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid);

    console.log(`[${timestamp}] Final check:`, { isOwner, hasRole, roles: workspace.roles });

    if (!isOwner && !hasRole) {
        console.log(`[${timestamp}] REDIRECTING to /unauthorized because isOwner is false AND hasRole is false.`);
        router.push('/unauthorized');
    } else {
        console.log(`[${timestamp}] Access GRANTED.`);
    }
  }, [user, isUserLoading, workspace, isWorkspaceLoading, router, workspaceId, workspaceError]);


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
