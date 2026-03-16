
'use client';

import { Sidebar } from "@/components/dashboard/sidebar";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { collection, query, where } from 'firebase/firestore';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const workspacesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'workspaces'), where('members', 'array-contains', user.uid));
  }, [user, firestore]);

  const { data: workspaces, isLoading: isWorkspacesLoading, error: workspacesError } = useCollection(workspacesQuery);

  useEffect(() => {
    // If auth is done and there's no user, redirect to login
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }

    if (workspacesError) {
        console.error('[DashboardLayout] Error fetching workspaces:', workspacesError);
    }

    // Logic to handle redirects based on workspace existence
    // We wait until the workspaces query has explicitly returned to avoid race conditions
    if (!isUserLoading && user && !isWorkspacesLoading && workspaces !== null) {
      const hasWorkspaces = workspaces.length > 0;
      const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
      const isOnDashboardRoot = pathname === '/dashboard';
      
      // If user has workspaces and is on the root dashboard, redirect to the first one.
      if (hasWorkspaces && isOnDashboardRoot) {
        router.push(`/dashboard/${workspaces[0].id}`);
        return;
      }

      // If user has no workspaces and is not on the creation page, redirect them.
      if (!hasWorkspaces && !isOnNewWorkspacePage) {
        router.push('/dashboard/new-workspace');
        return;
      }
    }
  }, [user, isUserLoading, workspaces, isWorkspacesLoading, workspacesError, router, pathname]);

  const showLoading = isUserLoading || (user && isWorkspacesLoading);
  const isNewWorkspacePage = pathname === '/dashboard/new-workspace';
  const hasWorkspaces = workspaces && workspaces.length > 0;
  const isOnDashboardRoot = pathname === '/dashboard';
  const isMapPage = pathname?.includes('/map');
  
  // While loading user or workspaces, show a loader
  if (showLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  // If the user is being redirected to login, render nothing.
  if (!user) {
    return null;
  }

  // If there was an error loading workspaces, show an error message
  if (workspacesError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div>
            <h2 className="text-xl font-semibold text-destructive">Ocorreu um erro ao carregar seus workspaces.</h2>
            <p className="text-muted-foreground mt-2">Por favor, verifique o console do navegador para mais detalhes e tente novamente.</p>
            {/* A Firestore security rule/index error will be thrown and caught by the error boundary */}
        </div>
      </div>
    )
  }
  
  // If user has workspaces and is on the root, show redirecting message
  if (hasWorkspaces && isOnDashboardRoot) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecionando para seu workspace...</p>
      </div>
    );
  }

  // If a user has no workspaces, handle creation or show redirect message
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

  // Otherwise, show the full dashboard layout.
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
