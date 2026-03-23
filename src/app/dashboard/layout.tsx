'use client';

import { Sidebar } from "@/components/dashboard/sidebar";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { collection, query, where } from 'firebase/firestore';
import { Workspace } from "@/lib/firestore-types";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const workspacesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'workspaces'), where('members', 'array-contains', user.uid));
  }, [user, firestore]);
  const { data: workspaces, isLoading: isWorkspacesLoading } = useCollection<Workspace>(workspacesQuery);

  useEffect(() => {
    // Wait until both user and their workspaces have been loaded
    if (isUserLoading || isWorkspacesLoading) {
      return;
    }

    // If user is not logged in, send to login page
    if (!user) {
      router.push('/login');
      return;
    }

    // If user has no workspaces, send them to create one (unless they are already there)
    const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
    if ((!workspaces || workspaces.length === 0) && !isOnNewWorkspacePage) {
      router.push('/dashboard/new-workspace');
      return;
    }
    
    // If user is on the root dashboard page, decide where they should go.
    const isOnDashboardRoot = pathname === '/dashboard';
    if (workspaces && workspaces.length > 0 && isOnDashboardRoot) {
        const firstWorkspace = workspaces[0];
        const userRole = firstWorkspace.ownerId === user.uid ? 'admin' : firstWorkspace.roles?.[user!.uid];

        // If the user's role is a collaborator type, redirect to the collaborator view
        if (userRole && ['member', 'collaborator'].includes(userRole)) {
            router.replace(`/collaborator/${firstWorkspace.id}/home`);
        } else {
            // Otherwise, redirect to their first workspace's admin dashboard
            router.replace(`/dashboard/${firstWorkspace.id}`);
        }
        return;
    }

  }, [user, isUserLoading, workspaces, isWorkspacesLoading, pathname, router]);

  // Render a loading state while we wait for auth and data
  if (isUserLoading || (user && isWorkspacesLoading && pathname === '/dashboard')) {
     return <div className="flex min-h-screen items-center justify-center"><p>Carregando Dashboard...</p></div>;
  }
  
  // If user is not logged in, show nothing while redirecting
  if (!user) {
    return null;
  }
  
  // If user has no workspaces and is not on the creation page, show nothing while redirecting
  if ((!workspaces || workspaces.length === 0) && pathname !== '/dashboard/new-workspace') {
      return null;
  }

  const isMapPage = pathname?.includes('/map');
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
