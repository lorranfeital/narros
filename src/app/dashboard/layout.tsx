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

  const { data: workspaces, isLoading: isWorkspacesLoading } = useCollection(workspacesQuery);

  useEffect(() => {
    // If auth is done and there's no user, redirect to login
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }

    // If auth and workspace checks are done, and user has no workspaces, redirect to create one
    if (!isUserLoading && user && !isWorkspacesLoading) {
      if ((!workspaces || workspaces.length === 0) && pathname !== '/dashboard/new-workspace') {
        router.push('/dashboard/new-workspace');
      }
    }
  }, [user, isUserLoading, workspaces, isWorkspacesLoading, router, pathname]);

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
