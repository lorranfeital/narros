'use client';

import { Sidebar } from "@/components/dashboard/sidebar";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { collection, query, where } from 'firebase/firestore';
import { Workspace } from "@/lib/firestore-types";
import { useWorkspaceAuthorization } from "@/hooks/use-workspace-auth";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { status, user } = useWorkspaceAuthorization();
  
  // We need to list all user's workspaces for the root dashboard redirect logic.
  const firestore = useFirestore();
  const workspacesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'workspaces'), where('members', 'array-contains', user.uid));
  }, [user, firestore]);
  const { data: workspaces, isLoading: isWorkspacesLoading } = useCollection<Workspace>(workspacesQuery);

  useEffect(() => {
    if (status === 'loading' || isWorkspacesLoading) {
      return; 
    }
    if (status === 'unauthorized') {
      router.push('/login');
      return;
    }
    if (status === 'authorized_collaborator' && workspaceId) {
      router.replace(`/collaborator/${workspaceId}/home`);
      return;
    }

    const isOnNewWorkspacePage = pathname === '/dashboard/new-workspace';
    if ((!workspaces || workspaces.length === 0) && !isOnNewWorkspacePage) {
      router.push('/dashboard/new-workspace');
      return;
    }
    
    const isOnDashboardRoot = pathname === '/dashboard';
    if (workspaces && workspaces.length > 0 && isOnDashboardRoot) {
        const firstWorkspace = workspaces[0];
        // The role check is now inside the hook, but we need to re-check for the specific case of root redirect
        const userRole = firstWorkspace.ownerId === user?.uid ? 'admin' : firstWorkspace.roles?.[user!.uid];
        const targetPath = (userRole && ['member', 'collaborator'].includes(userRole))
            ? `/collaborator/${firstWorkspace.id}/home`
            : `/dashboard/${firstWorkspace.id}`;
        router.replace(targetPath);
        return;
    }

  }, [status, router, pathname, workspaceId, user, workspaces, isWorkspacesLoading]);

  // Show a loading screen while the authorization hook is running.
  if (status === 'loading' || (user && isWorkspacesLoading)) {
     return <div className="flex min-h-screen items-center justify-center"><p>Carregando Dashboard...</p></div>;
  }

  // A final guard before rendering anything.
  if (status === 'unauthorized') {
     return <div className="flex min-h-screen items-center justify-center"><p>Redirecionando para login...</p></div>;
  }

  const isCreatingWorkspace = pathname === '/dashboard/new-workspace';
  if ((!workspaces || workspaces.length === 0) && isCreatingWorkspace) {
      return <>{children}</>;
  }

  const isMapPage = pathname?.includes('/map');
  if (isMapPage) {
    return <div className="h-screen w-screen">{children}</div>;
  }
  
  // If the user is a collaborator, the useEffect should have already redirected them.
  // This prevents rendering the admin sidebar for them.
  if (status === 'authorized_collaborator') {
    return <div className="flex min-h-screen items-center justify-center"><p>Redirecionando para área do colaborador...</p></div>;
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
