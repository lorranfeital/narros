
'use client';

import { Sidebar } from "@/components/dashboard/sidebar";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
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
  const { data: workspaces, isLoading: isWorkspacesLoading } = useCollection<Workspace>(workspacesQuery);
  
  const currentWorkspaceDocRef = useMemoFirebase(() => {
      if (!firestore || !workspaceId) return null;
      return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);
  const { data: currentWorkspace, isLoading: isCurrentWorkspaceLoading } = useDoc<Workspace>(currentWorkspaceDocRef);

  useEffect(() => {
    if (isUserLoading || isWorkspacesLoading) {
      return; 
    }

    if (!user) {
      router.push('/login');
      return;
    }

    const hasWorkspaces = workspaces && workspaces.length > 0;
    const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
    const isOnDashboardRoot = pathname === '/dashboard';

    if (!hasWorkspaces && !isOnNewWorkspacePage) {
        router.push('/dashboard/new-workspace');
        return;
    }

    if (hasWorkspaces && isOnDashboardRoot) {
        const firstWorkspace = workspaces[0];
        const userRole = firstWorkspace.ownerId === user.uid ? 'admin' : firstWorkspace.roles?.[user.uid];
        const targetPath = (userRole && ['member', 'collaborator'].includes(userRole))
            ? `/collaborator/${firstWorkspace.id}/home`
            : `/dashboard/${firstWorkspace.id}`;
        
        router.replace(targetPath);
        return;
    }
    
    if (workspaceId && !isCurrentWorkspaceLoading && currentWorkspace) {
        const userRole = currentWorkspace.ownerId === user.uid ? 'admin' : currentWorkspace.roles?.[user.uid];
        const isCollaboratorPath = pathname.startsWith('/collaborator');

        if (userRole && ['member', 'collaborator'].includes(userRole) && !isCollaboratorPath) {
            const targetPath = `/collaborator/${workspaceId}/home`;
            router.replace(targetPath);
            return;
        }
    }

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
