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
  const { data: workspace, isLoading: isWorkspaceLoading, error: workspaceError } = useDoc<Workspace>(workspaceDocRef);
  
  const isMember = useMemo(() => {
    if (!user || !workspace) return false;
    // This logic MUST mirror the `isWorkspaceMember` security rule.
    // Check if the user is the owner OR if their UID exists as a key in the roles map.
    return workspace.ownerId === user.uid || (workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid));
  }, [user, workspace]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }
    
    // Wait until both user and workspace are done loading
    if (!isUserLoading && !isWorkspaceLoading) {
      // If loading is finished and the user is NOT a member, redirect.
      if (!isMember) {
        router.push('/unauthorized');
      }
    }
  }, [user, isUserLoading, isWorkspaceLoading, isMember, router]);


  const showLoading = isUserLoading || isWorkspaceLoading;
  
  if (showLoading || !isMember) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando área do colaborador...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <CollaboratorSidebar />
      <main className={cn(
        "flex-1 overflow-y-auto transition-all duration-300 ease-in-out"
        // md:ml-52
        )}>
        {children}
      </main>
    </div>
  );
}
