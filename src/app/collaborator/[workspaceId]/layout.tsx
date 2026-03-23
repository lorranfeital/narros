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

  // Just get the current workspace. This layout's only job is to protect itself.
  const workspaceDocRef = useMemoFirebase(() => {
      if (!firestore || !workspaceId) return null;
      return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);
  const { data: workspace, isLoading: isWorkspaceLoading, error: workspaceError } = useDoc<Workspace>(workspaceDocRef);
  
  useEffect(() => {
    // --- AUTHORIZATION GATE ---
    // Wait until ALL data is loaded before making any decisions.
    if (isUserLoading || isWorkspaceLoading) {
      return; // Do nothing until loading is complete.
    }

    // --- DECISION POINT ---
    // At this point, all data is settled. We can now make a single, definitive check.

    // 1. Check for authenticated user.
    if (!user) {
      router.push('/login');
      return;
    }
    
    // 2. Check if the workspace document was found. If not, access is unauthorized.
    // This covers both non-existent workspaces and permission errors from useDoc.
    if (!workspace) {
        router.push('/unauthorized');
        return;
    }
    
    // 3. Final check: Is the user actually a member of this workspace?
    const isMember = workspace.members?.includes(user.uid);

    if (!isMember) {
        router.push('/unauthorized');
        return;
    }
    
    // All checks passed, user is authorized. The effect is done.

  }, [user, isUserLoading, workspace, isWorkspaceLoading, router, workspaceId]);


  // --- RENDER LOGIC ---
  const isLoading = isUserLoading || isWorkspaceLoading;

  // Show a loading screen while the useEffect is waiting for data.
  if (isLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando área do colaborador...</p>
      </div>
    );
  }

  // The useEffect will handle redirection if needed. We can render the children only 
  // if we are confident the user is authorized, preventing flashes of content.
  const isAuthorized = user && workspace && workspace.members?.includes(user.uid);

  if (!isAuthorized) {
      // While the useEffect handles the redirect, this prevents rendering children if auth fails.
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
