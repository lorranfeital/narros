'use client';

import { useRouter, useParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { useWorkspaceAuthorization } from "@/hooks/use-workspace-auth";
import { CollaboratorSidebar } from "@/components/collaborator/sidebar";
import { cn } from "@/lib/utils";

export default function CollaboratorLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { status } = useWorkspaceAuthorization();

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    if (status === 'unauthorized') {
      router.push('/login');
      return;
    }
    if (status === 'forbidden') {
      router.push('/unauthorized');
      return;
    }
    if (status === 'authorized_admin') {
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }
  }, [status, router, workspaceId]);

  if (status !== 'authorized_collaborator') {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <CollaboratorSidebar />
      <main className={cn(
        "flex-1 overflow-y-auto transition-all duration-300 ease-in-out"
        )}>
        {children}
      </main>
    </div>
  );
}
