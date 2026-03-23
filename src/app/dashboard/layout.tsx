'use client';

import { Sidebar } from "@/components/dashboard/sidebar";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { collection, query, where, doc } from 'firebase/firestore';
import { Workspace } from "@/lib/firestore-types";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  // This query gets ALL workspaces the user is a member of.
  // It's used to decide where to go if the user just lands on /dashboard.
  const workspacesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'workspaces'), where('members', 'array-contains', user.uid));
  }, [user, firestore]);
  const { data: workspaces, isLoading: isWorkspacesLoading } = useCollection<Workspace>(workspacesQuery);
  
  // This hook gets the specific workspace from the URL, if one exists.
  const currentWorkspaceDocRef = useMemoFirebase(() => {
      if (!firestore || !workspaceId) return null;
      return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);
  const { data: currentWorkspace, isLoading: isCurrentWorkspaceLoading } = useDoc<Workspace>(currentWorkspaceDocRef);

  useEffect(() => {
    // Primary loading gate: wait for user and initial workspace list.
    if (isUserLoading || isWorkspacesLoading) {
      return; 
    }

    // 1. If user is not logged in, go to login page.
    if (!user) {
      router.push('/login');
      return;
    }

    // After this point, we know we have a user and their list of workspaces.
    const hasWorkspaces = workspaces && workspaces.length > 0;
    const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
    const isOnDashboardRoot = pathname === '/dashboard';

    // 2. If user has no workspaces, force them to create one.
    if (!hasWorkspaces && !isOnNewWorkspacePage) {
        router.push('/dashboard/new-workspace');
        return;
    }

    // 3. If user has workspaces and is on the root, decide where to send them.
    if (hasWorkspaces && isOnDashboardRoot) {
        const firstWorkspace = workspaces[0];
        const userRole = firstWorkspace.ownerId === user.uid ? 'admin' : firstWorkspace.roles?.[user.uid];

        if (userRole && ['member', 'collaborator'].includes(userRole)) {
            router.replace(`/collaborator/${firstWorkspace.id}/home`);
        } else {
            router.replace(`/dashboard/${firstWorkspace.id}`);
        }
        return;
    }
    
    // 4. If user is on a specific dashboard URL, verify their role for THAT workspace.
    // This handles cases where they might have a direct link or are already navigating.
    if (workspaceId && !isCurrentWorkspaceLoading && currentWorkspace) {
        const userRole = currentWorkspace.ownerId === user.uid ? 'admin' : currentWorkspace.roles?.[user.uid];
        
        // This is a key fix: If a collaborator lands on a dashboard URL, redirect them.
        if (userRole && ['member', 'collaborator'].includes(userRole) && !pathname.startsWith('/collaborator')) {
            router.replace(`/collaborator/${workspaceId}/home`);
            return;
        }
    }

  }, [
    user, isUserLoading, 
    workspaces, isWorkspacesLoading,
    currentWorkspace, isCurrentWorkspaceLoading,
    workspaceId, pathname, router
  ]);

  // --- RENDER LOGIC ---

  const isLoading = isUserLoading || isWorkspacesLoading;

  if (isLoading) {
     return <div className="flex min-h-screen items-center justify-center"><p>Carregando...</p></div>;
  }
  
  if (!user) {
    return null; // Redirecting
  }
  
  const isCreatingWorkspace = pathname === '/dashboard/new-workspace';
  if ((!workspaces || workspaces.length === 0) && !isCreatingWorkspace) {
    return <div className="flex min-h-screen items-center justify-center"><p>Redirecionando...</p></div>;
  }
  
  const isMapPage = pathname?.includes('/map');
  if (isMapPage) {
    return <div className="h-screen w-screen">{children}</div>;
  }

  // For users with no workspaces, only render the creation page.
  if ((!workspaces || workspaces.length === 0) && isCreatingWorkspace) {
      return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
