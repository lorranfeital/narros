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

  // Memoize the query to prevent re-renders
  const workspacesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    // Query for workspaces where the user is a member.
    // This requires a Firestore index on the 'members' array.
    return query(collection(firestore, 'workspaces'), where('members', 'array-contains', user.uid));
  }, [user, firestore]);

  const { data: workspaces, isLoading: isWorkspacesLoading, error: workspacesError } = useCollection(workspacesQuery);

  useEffect(() => {
    console.log('[DashboardLayout] Effect triggered. State:', {
        isUserLoading,
        user: user ? { uid: user.uid, email: user.email } : null,
        isWorkspacesLoading,
        workspaces,
        workspacesError,
        pathname,
    });

    // If auth is done and there's no user, redirect to login
    if (!isUserLoading && !user) {
      console.log('[DashboardLayout] No user found, redirecting to /login');
      router.push('/login');
      return;
    }

    if (workspacesError) {
        console.error('[DashboardLayout] Error fetching workspaces:', workspacesError);
    }

    // If auth and workspace checks are done, and user has no workspaces, redirect to create one
    if (!isUserLoading && user && !isWorkspacesLoading) {
      if ((!workspaces || workspaces.length === 0) && pathname !== '/dashboard/new-workspace') {
        console.log('[DashboardLayout] No workspaces found, redirecting to /dashboard/new-workspace');
        router.push('/dashboard/new-workspace');
      } else if (workspaces && workspaces.length > 0) {
        console.log(`[DashboardLayout] Found ${workspaces.length} workspace(s). Not redirecting.`);
      }
    }
  }, [user, isUserLoading, workspaces, isWorkspacesLoading, workspacesError, router, pathname]);

  const showLoading = isUserLoading || (user && isWorkspacesLoading);
  const isNewWorkspacePage = pathname === '/dashboard/new-workspace';
  
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
  
  // If we are on the new workspace page, render it without the sidebar layout.
  if (isNewWorkspacePage) {
    return <>{children}</>;
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

  // If the user is being redirected to create a workspace, show a loader.
  if (!workspaces || workspaces.length === 0) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  // Otherwise, show the full dashboard layout.
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
