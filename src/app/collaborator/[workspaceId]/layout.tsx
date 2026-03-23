
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
    if (isUserLoading || isWorkspaceLoading) {
      return; 
    }

    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!workspace) {
        router.push('/unauthorized');
        return;
    }
    
    const isOwner = workspace.ownerId === user.uid;
    const hasRole = workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid);
    const isMember = isOwner || hasRole;
    
    if (!isMember) {
        router.push('/unauthorized');
        return;
    }

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
