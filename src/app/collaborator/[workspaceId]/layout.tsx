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
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] useMemo for isMember is calculating...`);

    if (!user || !workspace) {
      console.log(`[${timestamp}] isMember -> false (user or workspace is missing)`);
      return false;
    }

    console.log(`[${timestamp}] isMember check: User ID: ${user.uid}`);
    console.log(`[${timestamp}] isMember check: Workspace Owner ID: ${workspace.ownerId}`);
    console.log(`[${timestamp}] isMember check: Workspace roles:`, workspace.roles ? JSON.parse(JSON.stringify(workspace.roles)) : 'undefined');

    const isOwner = workspace.ownerId === user.uid;
    const hasRole = workspace.roles && Object.prototype.hasOwnProperty.call(workspace.roles, user.uid);
    const result = isOwner || hasRole;
    
    console.log(`[${timestamp}] isMember result: ${result} (isOwner: ${isOwner}, hasRole: ${hasRole})`);
    return result;
  }, [user, workspace]);

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] CollaboratorLayout useEffect triggered.`);

    if (isUserLoading || isWorkspaceLoading) {
        console.log(`[${timestamp}] Still loading... (isUserLoading: ${isUserLoading}, isWorkspaceLoading: ${isWorkspaceLoading})`);
        return;
    }

    if (!user) {
      console.error(`[${timestamp}] Auth loaded, but no user found. Redirecting to /login.`);
      router.push('/login');
      return;
    }

    if (!workspace) {
        console.error(`[${timestamp}] Data loaded, but workspace document not found. Error: ${workspaceError?.message || 'No error message'}`);
        // Don't redirect immediately, the next check will handle it.
    }
    
    if (!isMember) {
        console.error(`[${timestamp}] REDIRECTING to /unauthorized because final 'isMember' check is false.`);
        router.push('/unauthorized');
    } else {
        console.log(`[${timestamp}] Access GRANTED. Final 'isMember' check is true.`);
    }
  }, [user, isUserLoading, workspace, isWorkspaceLoading, workspaceError, isMember, router]);


  const showLoading = isUserLoading || isWorkspaceLoading;
  
  // Important: We still need to block render if isMember is false even while loading, 
  // to prevent flicker of content before redirect.
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
