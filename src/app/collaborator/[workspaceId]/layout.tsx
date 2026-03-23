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
  const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

  useEffect(() => {
    // 1. Wait for both user and workspace data to finish loading.
    if (isUserLoading || isWorkspaceLoading) {
      return; // Do nothing until we have all the data.
    }

    // 2. Once loading is complete, make a final decision.
    if (!user) {
      router.replace('/login');
      return;
    }

    // 3. Check for workspace existence and membership.
    const isOwner = workspace?.ownerId === user.uid;
    const userRole = workspace?.roles?.[user.uid];
    const isMember = isOwner || !!userRole;

    if (!workspace || !isMember) {
        router.replace('/unauthorized');
        return;
    }

    // 4. If user is an admin/curator, they don't belong in the collaborator view.
    if (isOwner || userRole === 'admin' || userRole === 'curator') {
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }
    
    // 5. If all checks pass, the user is an authorized collaborator. The effect does nothing.

  }, [user, isUserLoading, workspace, isWorkspaceLoading, router, workspaceId]);
  
  const isLoading = isUserLoading || isWorkspaceLoading;

  // Show a loading screen until the useEffect has had a chance to run with complete data.
  // We also check for `workspace` existence here to prevent a flash of the layout.
  if (isLoading || !workspace) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }

  // Final check after loading: if user is not a member, render a final "forbidden" state while redirect happens.
  // This is a fallback, but the useEffect should handle the redirect.
  const isAuthorized = user && workspace.members.includes(user.uid);
   if (!isAuthorized) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Acesso negado.</p>
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
