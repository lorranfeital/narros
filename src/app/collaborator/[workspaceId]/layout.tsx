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
    // Wait for all data to be loaded before making any decisions
    if (isUserLoading || isWorkspaceLoading) {
      return;
    }

    // 1. If no user, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }

    // 2. If workspace doesn't exist (permission error or wrong ID), redirect to unauthorized
    if (!workspace) {
      router.push('/unauthorized');
      return;
    }
    
    // 3. Determine user's role in this specific workspace
    const isOwner = workspace.ownerId === user.uid;
    const userRole = workspace.roles?.[user.uid];

    // 4. If user is an admin/curator/owner, they don't belong here, send them to the admin dashboard
    if (isOwner || userRole === 'admin' || userRole === 'curator') {
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }

    // 5. If they are not the owner AND they have no role, they are forbidden.
    if (!isOwner && !userRole) {
        router.push('/unauthorized');
        return;
    }

    // 6. If all checks pass, the user is an authorized collaborator. The effect does nothing.

  }, [user, isUserLoading, workspace, isWorkspaceLoading, router, workspaceId]);

  // Render a loading state while we determine access
  if (isUserLoading || isWorkspaceLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }

  // If after loading we still don't have a user or workspace, it means a redirect is in progress.
  // Render null to prevent flashing content.
  if (!user || !workspace) {
    return null;
  }
  
  // Final check: if user is not a member, render a final "forbidden" state while redirect happens
  const isMember = workspace.members.includes(user.uid);
   if (!isMember) {
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
