'use client';

import { Sidebar } from "@/components/dashboard/sidebar";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { collection, query, where, doc } from 'firebase/firestore';
import { Workspace } from "@/lib/firestore-types";

function getTimestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
}

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
  const { data: workspaces, isLoading: isWorkspacesLoading } = useCollection<Workspace>(workspacesQuery);
  
  const currentWorkspaceDocRef = useMemoFirebase(() => {
      if (!firestore || !workspaceId) return null;
      return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);
  const { data: currentWorkspace, isLoading: isCurrentWorkspaceLoading } = useDoc<Workspace>(currentWorkspaceDocRef);

  useEffect(() => {
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] [DashboardLayout] useEffect triggered.`, { pathname, workspaceId, isUserLoading, isWorkspacesLoading, isCurrentWorkspaceLoading, user: !!user, workspaces: workspaces?.map(w => w.id) });

    if (isUserLoading || isWorkspacesLoading) {
      console.log(`[${timestamp}] [DashboardLayout] Waiting for user or workspaces to load...`);
      return; 
    }

    if (!user) {
      console.log(`[${timestamp}] [DashboardLayout] No user found. Redirecting to /login.`);
      router.push('/login');
      return;
    }

    const hasWorkspaces = workspaces && workspaces.length > 0;
    const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
    const isOnDashboardRoot = pathname === '/dashboard';

    if (!hasWorkspaces && !isOnNewWorkspacePage) {
        console.log(`[${timestamp}] [DashboardLayout] No workspaces found for user. Redirecting to /dashboard/new-workspace.`);
        router.push('/dashboard/new-workspace');
        return;
    }

    if (hasWorkspaces && isOnDashboardRoot) {
        const firstWorkspace = workspaces[0];
        const userRole = firstWorkspace.ownerId === user.uid ? 'admin' : firstWorkspace.roles?.[user.uid];
        const targetPath = (userRole && ['member', 'collaborator'].includes(userRole))
            ? `/collaborator/${firstWorkspace.id}/home`
            : `/dashboard/${firstWorkspace.id}`;
        
        console.log(`[${timestamp}] [DashboardLayout] User is on root. Deciding where to go.`, { userRole, targetPath });
        router.replace(targetPath);
        return;
    }
    
    if (workspaceId && !isCurrentWorkspaceLoading) {
        if (currentWorkspace) {
            const userRole = currentWorkspace.ownerId === user.uid ? 'admin' : currentWorkspace.roles?.[user.uid];
            const isCollaboratorPath = pathname.startsWith('/collaborator');

            console.log(`[${timestamp}] [DashboardLayout] Verifying role for loaded workspace.`, { workspaceId, userRole, isCollaboratorPath });

            if (userRole && ['member', 'collaborator'].includes(userRole) && !isCollaboratorPath) {
                const targetPath = `/collaborator/${workspaceId}/home`;
                console.log(`[${timestamp}] [DashboardLayout] User has collaborator role. REDIRECTING to ${targetPath}`);
                router.replace(targetPath);
                return;
            }
        } else {
             console.log(`[${timestamp}] [DashboardLayout] Workspace with ID ${workspaceId} not found after loading. This might be a permission issue or invalid ID.`);
        }
    }
     console.log(`[${timestamp}] [DashboardLayout] useEffect completed without redirection.`);

  }, [
    user, isUserLoading, 
    workspaces, isWorkspacesLoading,
    currentWorkspace, isCurrentWorkspaceLoading,
    workspaceId, pathname, router
  ]);

  const isLoading = isUserLoading || isWorkspacesLoading;

  if (isLoading) {
     return <div className="flex min-h-screen items-center justify-center"><p>Carregando Dashboard...</p></div>;
  }
  
  if (!user) {
    return null;
  }
  
  const isCreatingWorkspace = pathname === '/dashboard/new-workspace';
  if ((!workspaces || workspaces.length === 0) && !isCreatingWorkspace) {
    return <div className="flex min-h-screen items-center justify-center"><p>Redirecionando para criação de workspace...</p></div>;
  }
  
  const isMapPage = pathname?.includes('/map');
  if (isMapPage) {
    return <div className="h-screen w-screen">{children}</div>;
  }

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
