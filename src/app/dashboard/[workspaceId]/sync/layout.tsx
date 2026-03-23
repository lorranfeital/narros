'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { Workspace } from "@/lib/firestore-types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SyncLayout({ children }: { children: ReactNode }) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const workspaceId = params.workspaceId as string;

    const workspaceDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'workspaces', workspaceId) : null, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

    const userRole = workspace?.ownerId === user?.uid ? 'admin' : workspace?.roles?.[user?.uid ?? ''];
    const isAuthorized = userRole === 'admin' || userRole === 'curator';

    useEffect(() => {
        if (isUserLoading || isWorkspaceLoading) return;

        if (!user || !workspace) {
            return;
        }

        if (!isAuthorized) {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Você não tem permissão para acessar esta página.',
            });
            router.replace(`/dashboard/${workspaceId}`);
        }
    }, [isUserLoading, isWorkspaceLoading, user, workspace, router, toast, workspaceId, isAuthorized]);

    if (isUserLoading || isWorkspaceLoading || !workspace) {
        return <div className="flex h-screen items-center justify-center"><p>Verificando permissões...</p></div>;
    }
    
    if (!isAuthorized) {
         return <div className="flex h-screen items-center justify-center"><p>Redirecionando...</p></div>;
    }

    return <>{children}</>;
}
