
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
    const isLoading = isUserLoading || isWorkspacesLoading;
    
    // 1. Wait until all data is loaded before making any decisions.
    if (isLoading) {
      return; // Do nothing until loading is complete.
    }

    // 2. If user is not logged in, send to login page.
    if (!user) {
      router.replace('/login');
      return;
    }

    // 3. If user has no workspaces, send them to create one (unless they are already there).
    const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
    if ((!workspaces || workspaces.length === 0)) {
        if (!isOnNewWorkspacePage) {
            router.replace('/dashboard/new-workspace');
        }
        return;
    }
    
    // 4. If we are on the root dashboard page, decide where the user's "home" is.
    const isOnDashboardRoot = pathname === '/dashboard';
    if (workspaces && workspaces.length > 0 && isOnDashboardRoot) {
        const firstWorkspace = workspaces[0];
        // Determine the user's role in their first workspace.
        const userRole = firstWorkspace.ownerId === user.uid ? 'admin' : firstWorkspace.roles?.[user.uid];

        // If the user's role is a collaborator type, their home is the collaborator view.
        if (userRole && ['member', 'collaborator'].includes(userRole)) {
            router.replace(`/collaborator/${firstWorkspace.id}/home`);
        } else {
            // Otherwise, their home is the admin dashboard for that workspace.
            router.replace(`/dashboard/${firstWorkspace.id}`);
        }
        return; // Important: stop execution after redirecting.
    }

  }, [user, isUserLoading, workspaces, isWorkspacesLoading, pathname, router]);

  // --- Render Logic ---
  const isLoading = isUserLoading || isWorkspacesLoading;

  // While loading, or if a redirect is in progress from the useEffect, show a full-screen loader.
  if (isLoading || pathname === '/dashboard') {
     return (
        <div className="flex h-screen w-screen items-center justify-center">
            <p>Carregando...</p>
        </div>
     );
  }
  
  // If user has no workspaces but is on the creation page, allow it.
  if ((!workspaces || workspaces.length === 0) && pathname === '/dashboard/new-workspace') {
      return <>{children}</>;
  }
  
  // After all checks, if we are not loading and not on a page that should redirect, render the layout.
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
