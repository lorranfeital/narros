'use client';

import { useRouter, useParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { Workspace } from "@/lib/firestore-types";
import { CollaboratorSidebar } from "@/components/collaborator/sidebar";
import { cn } from "@/lib/utils";

export default function CollaboratorLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const workspaceDocRef = useMemoFirebase(() => {
    if (!firestore || !workspaceId) return null;
    return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);
  
  const { data: workspace, isLoading: isWorkspaceLoading, error: workspaceError } = useDoc<Workspace>(workspaceDocRef);
  
  useEffect(() => {
    // NUNCA redirecionar se ainda estiver carregando
    if (isUserLoading || isWorkspaceLoading) {
      return; 
    }
    
    // Após o carregamento, verificar o usuário primeiro
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // Se o carregamento terminou e o workspace ainda é nulo, significa que não foi encontrado ou houve um erro.
    if (!workspace) {
        router.push('/unauthorized');
        return;
    }

    // Só agora verificar permissões
    const isOwner = workspace.ownerId === user.uid;
    const userRole = workspace.roles?.[user.uid];
    const isMember = isOwner || !!userRole;

    if (!isMember) {
      router.push('/unauthorized');
      return;
    }
    
    // Redirecionar admins/curadores para fora da visão de colaborador
    if (isOwner || userRole === 'admin' || userRole === 'curator') {
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }

  }, [isUserLoading, isWorkspaceLoading, user, workspace, router, workspaceId, workspaceError]);

  // Lidar com o estado de carregamento de forma robusta.
  // A chave é esperar que AMBOS terminem de carregar E que o workspace seja confirmado.
  // Isso previne a renderização prematura de 'children'.
  if (isUserLoading || isWorkspaceLoading || !workspace) {
     return (
      <div className="flex h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }
  
  // Verificação final antes de renderizar, para ter certeza absoluta.
  const isAuthorizedCollaborator = workspace.roles?.[user?.uid || ''] === 'member' || workspace.roles?.[user?.uid || ''] === 'collaborator';
     
  if (isAuthorizedCollaborator) {
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

  // Se o usuário não for um colaborador autorizado mas passou pelas verificações do useEffect (ex: admin),
  // mostrar uma mensagem de redirecionamento enquanto o useEffect trata do redirecionamento.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  );
}
