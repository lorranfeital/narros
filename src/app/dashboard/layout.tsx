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
  
  const userRole = useMemo(() => {
    if (!user || !currentWorkspace) return null;
    if (currentWorkspace.ownerId === user.uid) return 'admin';
    return currentWorkspace.roles?.[user.uid] || 'member';
  }, [user, currentWorkspace]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }

    if (workspacesError) {
        console.error('[DashboardLayout] Error fetching workspaces:', workspacesError);
    }
    
    // Redirect collaborator and member away from the main dashboard
    if (userRole === 'collaborator' || userRole === 'member') {
        router.replace(`/collaborator/${workspaceId}/home`);
        return;
    }

    if (!isUserLoading && user && !isWorkspacesLoading && workspaces !== null) {
      const hasWorkspaces = workspaces.length > 0;
      const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
      const isOnDashboardRoot = pathname === '/dashboard';
      
      if (hasWorkspaces && isOnDashboardRoot) {
        router.push(`/dashboard/${workspaces[0].id}`);
        return;
      }

      if (!hasWorkspaces && !isOnNewWorkspacePage) {
        router.push('/dashboard/new-workspace');
        return;
      }
    }
  }, [user, isUserLoading, workspaces, isWorkspacesLoading, workspacesError, router, pathname, workspaceId, userRole]);

  const showLoading = isUserLoading || (user && isWorkspacesLoading) || (workspaceId && isCurrentWorkspaceLoading);
  const isNewWorkspacePage = pathname === '/dashboard/new-workspace';
  const hasWorkspaces = workspaces && workspaces.length > 0;
  const isOnDashboardRoot = pathname === '/dashboard';
  const isMapPage = pathname?.includes('/map');
  
  if (showLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  
  // If user is a collaborator or member, they are being redirected, so render nothing to avoid flash of content.
  if (userRole === 'collaborator' || userRole === 'member') {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Redirecionando...</p>
        </div>
    );
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
  
  if (hasWorkspaces && isOnDashboardRoot) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecionando para seu workspace...</p>
      </div>
    );
  }

  if (!hasWorkspaces) {
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
