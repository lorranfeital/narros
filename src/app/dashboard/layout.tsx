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
    
    if (isLoading) {
        return;
    }
    
    if (!user) {
        router.replace('/login');
        return;
    }

    const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
    if (!workspaces || workspaces.length === 0) {
        if (!isOnNewWorkspacePage) {
            router.replace('/dashboard/new-workspace');
        }
        return;
    }
    
    const isOnDashboardRoot = pathname === '/dashboard';
    if (workspaces.length > 0 && isOnDashboardRoot) {
        const firstWorkspace = workspaces[0];
        const userRole = firstWorkspace.ownerId === user.uid ? 'admin' : firstWorkspace.roles?.[user.uid];

        let targetPath: string;
        if (userRole && ['member', 'collaborator'].includes(userRole)) {
            targetPath = `/collaborator/${firstWorkspace.id}/home`;
        } else {
            targetPath = `/dashboard/${firstWorkspace.id}`;
        }
        
        router.replace(targetPath);
        return;
    }

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
