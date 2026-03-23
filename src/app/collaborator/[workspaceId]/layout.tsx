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
    console.log(`[${timestamp}] CollaboratorLayout useEffect triggered.`);

    if (isUserLoading || isWorkspaceLoading) {
      console.log(`[${timestamp}] Still loading... (isUserLoading: ${isUserLoading}, isWorkspaceLoading: ${isWorkspaceLoading})`);
      return;
    }
    
    console.log(`[${timestamp}] Loading finished.`);

    if (!user) {
      console.log(`[${timestamp}] REDIRECTING to /login because user is not authenticated.`);
      router.push('/login');
      return;
    }
    
    console.log(`[${timestamp}] User is authenticated (UID: ${user.uid}).`);

    if (!workspace) {
        console.log(`[${timestamp}] REDIRECTING to /unauthorized because workspace is null after loading. Error from useDoc:`, workspaceError?.message || "No error object");
        router.push('/unauthorized');
        return;
    }
    
    console.log(`[${timestamp}] Workspace is loaded (ID: ${workspace.id}).`);

    const isOwner = workspace.ownerId === user.uid;
    const hasRole = workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid);
    const isMember = isOwner || hasRole;
    
    console.log(`[${timestamp}] Final permission check: isOwner=${isOwner}, hasRole=${hasRole}, isMember=${isMember}`);

    if (!isMember) {
        console.log(`[${timestamp}] REDIRECTING to /unauthorized because final isMember check is false.`);
        router.push('/unauthorized');
        return;
    }

    console.log(`[${timestamp}] Access GRANTED. Rendering children.`);

  }, [user, isUserLoading, workspace, isWorkspaceLoading, router, workspaceId, workspaceError]);


  // This part of the component renders what the user sees.
  // The logic here is about preventing a "flash" of content before the useEffect can redirect.
  
  // Show a loading screen while auth and workspace data are being fetched.
  if (isUserLoading || isWorkspaceLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando área do colaborador...</p>
      </div>
    );
  }

  // After loading, if there's no workspace or no user, it's very likely an unauthorized access.
  // The useEffect will handle the redirect, but this prevents the main layout from flashing.
  if (!workspace || !user) {
      return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Verificando permissões...</p>
        </div>
      );
  }

  // Final check before rendering children: is the user actually a member?
  // This duplicates the logic from useEffect, but acts as a final gatekeeper for rendering.
  const isMember = (workspace.ownerId === user.uid) || (workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid));
  if (!isMember) {
      // This state is hit if the useEffect redirect hasn't fired yet.
      return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Acesso inválido. Redirecionando...</p>
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
