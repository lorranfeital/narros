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
    // 1. NUNCA tomar decisões de redirecionamento se os dados essenciais ainda estiverem carregando.
    if (isUserLoading || isWorkspaceLoading) {
      return; 
    }

    // 2. Se o carregamento terminou e não há usuário, o lugar dele é na tela de login.
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // 3. Se o carregamento terminou e o workspace não foi encontrado (seja por permissão ou inexistência),
    // o acesso é não autorizado. Esta é a guarda crucial para evitar a "race condition".
    if (!workspace) {
        router.push('/unauthorized');
        return;
    }

    // 4. Só agora, com usuário e workspace confirmados, verificamos as permissões de acesso.
    const isOwner = workspace.ownerId === user.uid;
    const userRole = workspace.roles?.[user.uid];
    const isMember = isOwner || !!userRole;

    if (!isMember) {
      router.push('/unauthorized');
      return;
    }
    
    // 5. Se o usuário for um administrador ou curador, seu lugar é no dashboard principal, não aqui.
    if (isOwner || userRole === 'admin' || userRole === 'curator') {
      router.replace(`/dashboard/${workspaceId}`);
      return;
    }

    // Se passar por todas as verificações, o acesso está correto e o useEffect não faz nada.

  }, [isUserLoading, isWorkspaceLoading, user, workspace, router, workspaceId]);


  // --- Lógica de Renderização ---
  
  // Exibe a tela de carregamento enquanto o usuário ou o workspace estão sendo carregados,
  // E crucialmente, TAMBÉM se o workspace ainda for nulo após o carregamento inicial.
  // Isso impede a renderização de conteúdo parcial antes que o useEffect possa redirecionar com segurança.
  if (isUserLoading || isWorkspaceLoading || !workspace) {
     return (
      <div className="flex h-screen items-center justify-center">
        <p>Verificando permissões...</p>
      </div>
    );
  }
  
  // Neste ponto, temos certeza que temos um usuário e um workspace.
  // O useEffect acima já está cuidando de redirecionar quem não deveria estar aqui (e.g., admins).
  const userRole = workspace.roles?.[user.uid];
  const isAuthorizedCollaborator = userRole === 'member' || userRole === 'collaborator';
     
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

  // Caso de borda: O usuário é um membro válido (e.g. admin) mas o useEffect ainda não o redirecionou.
  // Mostramos uma tela de "Redirecionando..." para evitar qualquer flash de conteúdo indevido.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  );
}
