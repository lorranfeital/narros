'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, useParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { doc } from 'firebase/firestore';
import { Workspace } from "@/lib/firestore-types";
import { CollaboratorSidebar } from "@/components/collaborator/sidebar";
import { cn } from "@/lib/utils";


function getTimestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
}

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
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] [CollaboratorLayout] useEffect triggered.`, { isUserLoading, isWorkspaceLoading, user: !!user, workspace: !!workspace, workspaceId });
    
    if (isUserLoading || isWorkspaceLoading) {
      console.log(`[${timestamp}] [CollaboratorLayout] Still loading...`, { isUserLoading, isWorkspaceLoading });
      return; 
    }

    if (!user) {
      console.log(`[${timestamp}] [CollaboratorLayout] No user found. Redirecting to /login.`);
      router.push('/login');
      return;
    }
    
    if (!workspace) {
        console.error(`[${timestamp}] [CollaboratorLayout] REDIRECTING to /unauthorized because workspace document not found after loading. Error from useDoc: ${workspaceError?.message || 'No error object'}`);
        router.push('/unauthorized');
        return;
    }
    
    const isOwner = workspace.ownerId === user.uid;
    const hasRole = workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid);
    const isMember = isOwner || hasRole;
    
    console.log(`[${timestamp}] [CollaboratorLayout] Final check:`, { isOwner, hasRole, roles: workspace.roles });

    if (!isMember) {
        console.error(`[${timestamp}] [CollaboratorLayout] REDIRECTING to /unauthorized because final 'isMember' check is false.`);
        router.push('/unauthorized');
        return;
    }
    
    console.log(`[${timestamp}] [CollaboratorLayout] Access GRANTED.`);

  }, [user, isUserLoading, workspace, isWorkspaceLoading, router, workspaceId, workspaceError]);


  const isLoading = isUserLoading || isWorkspaceLoading;

  if (isLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando área do colaborador...</p>
      </div>
    );
  }
  
  // This check is a safeguard, the useEffect handles the logic.
  // It prevents rendering children if the data is not yet available or auth fails.
  if (!user || !workspace) {
      return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Verificando permissões...</p>
        </div>
      );
  }

  const isMember = (workspace.ownerId === user.uid) || (workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid));
  if (!isMember) {
     return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Redirecionando...</p>
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
