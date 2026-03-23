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
  
  const getTimestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });

  useEffect(() => {
    const timestamp = getTimestamp();
    const isLoading = isUserLoading || isWorkspacesLoading;
    
    console.log(`[${timestamp}] [DashboardLayout] useEffect triggered.`, {
        pathname,
        isUserLoading,
        isWorkspacesLoading,
        user: !!user,
        workspaces: workspaces?.length || 0,
    });

    if (isLoading) {
        console.log(`[${timestamp}] [DashboardLayout] Waiting for user or workspaces to load...`);
        return;
    }
    
    console.log(`[${timestamp}] [DashboardLayout] Loading finished.`);

    if (!user) {
        console.log(`[${timestamp}] [DashboardLayout] No user found. Redirecting to /login.`);
        router.replace('/login');
        return;
    }

    const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
    if (!workspaces || workspaces.length === 0) {
        if (!isOnNewWorkspacePage) {
            console.log(`[${timestamp}] [DashboardLayout] No workspaces found for user. Redirecting to /dashboard/new-workspace.`);
            router.replace('/dashboard/new-workspace');
        } else {
             console.log(`[${timestamp}] [DashboardLayout] User is correctly on the new-workspace page.`);
        }
        return;
    }
    
    const isOnDashboardRoot = pathname === '/dashboard';
    if (workspaces.length > 0 && isOnDashboardRoot) {
        console.log(`[${timestamp}] [DashboardLayout] User is on root. Deciding where to go.`);
        const firstWorkspace = workspaces[0];
        const userRole = firstWorkspace.ownerId === user.uid ? 'admin' : firstWorkspace.roles?.[user.uid];

        let targetPath: string;
        if (userRole && ['member', 'collaborator'].includes(userRole)) {
            targetPath = `/collaborator/${firstWorkspace.id}/home`;
        } else {
            targetPath = `/dashboard/${firstWorkspace.id}`;
        }
        
        console.log(`[${timestamp}] [DashboardLayout] User role is '${userRole}'. Redirecting to ${targetPath}.`);
        router.replace(targetPath);
        return;
    }
    
    console.log(`[${timestamp}] [DashboardLayout] No redirect condition met. Current path is allowed.`);

  }, [user, isUserLoading, workspaces, isWorkspacesLoading, pathname, router]);

  const isLoading = isUserLoading || isWorkspacesLoading;

  if (isLoading || pathname === '/dashboard') {
     return (
        <div className="flex h-screen w-screen items-center justify-center">
            <p>Carregando...</p>
        </div>
     );
  }
  
  if ((!workspaces || workspaces.length === 0) && pathname === '/dashboard/new-workspace') {
      return <>{children}</>;
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
