'use client';

import { Sidebar } from "@/components/dashboard/sidebar";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useEffect, ReactNode, useMemo } from "react";
import { collection, query, where, doc } from 'firebase/firestore';
import { Workspace } from "@/lib/firestore-types";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const workspacesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'workspaces'), where('members', 'array-contains', user.uid));
  }, [user, firestore]);
  const { data: workspaces, isLoading: isWorkspacesLoading, error: workspacesError } = useCollection<Workspace>(workspacesQuery);

  const currentWorkspaceDocRef = useMemoFirebase(() => {
      if (!firestore || !workspaceId) return null;
      return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);
  const { data: currentWorkspace, isLoading: isCurrentWorkspaceLoading } = useDoc<Workspace>(currentWorkspaceDocRef);
  
  useEffect(() => {
    // Wait for all data to settle
    if (isUserLoading || isWorkspacesLoading || (workspaceId && isCurrentWorkspaceLoading)) {
      return;
    }

    // 1. User is not authenticated, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Handle workspace data state after loading
    if (workspaces) {
        const hasWorkspaces = workspaces.length > 0;
        const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
        const isOnDashboardRoot = pathname === '/dashboard';

        // 2. User has workspaces, but is on the root dashboard page, redirect to the first workspace
        if (hasWorkspaces && isOnDashboardRoot) {
            router.push(`/dashboard/${workspaces[0].id}`);
            return;
        }

        // 3. User has no workspaces and is not on the creation page, redirect them to create one
        if (!hasWorkspaces && !isOnNewWorkspacePage) {
            router.push('/dashboard/new-workspace');
            return;
        }
    }
    
    // 4. If we have a specific workspace in the URL, check user role
    if (workspaceId && currentWorkspace) {
        const userRole = currentWorkspace.ownerId === user.uid ? 'admin' : currentWorkspace.roles?.[user.uid];
        if (userRole && ['collaborator', 'member'].includes(userRole)) {
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

  // Render logic
  const showLoading = isUserLoading || isWorkspacesLoading || (workspaceId && isCurrentWorkspaceLoading);
  const isNewWorkspacePage = pathname === '/dashboard/new-workspace';
  const isMapPage = pathname?.includes('/map');
  
  if (showLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return null; // The useEffect is handling the redirect
  }
  
  if (workspacesError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div>
            <h2 className="text-xl font-semibold text-destructive">Ocorreu um erro ao carregar seus workspaces.</h2>
            <p className="text-muted-foreground mt-2">Por favor, verifique o console do navegador para mais detalhes e tente novamente.</p>
        </div>
      </div>
    )
  }

  // If a user has no workspaces, only render the 'new-workspace' page, otherwise show loading/redirect screen
  if (!workspaces || workspaces.length === 0) {
    if (isNewWorkspacePage) {
      return <>{children}</>;
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecionando para criação de workspace...</p>
      </div>
    );
  }
  
  if (isMapPage) {
    return <div className="h-screen w-screen">{children}</div>;
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
