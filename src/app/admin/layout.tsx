
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { doc } from 'firebase/firestore';
import { PlatformAdmin } from "@/lib/firestore-types";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const platformAdminRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'platformAdmins', user.uid);
    }, [user, firestore]);

    const { data: platformAdmin, isLoading: isAdminLoading } = useDoc<PlatformAdmin>(platformAdminRef);

    if (isUserLoading || isAdminLoading) {
        return <div className="flex h-screen items-center justify-center"><p>Verificando permissões...</p></div>;
    }

    if (!user) {
        router.push('/login');
        return null;
    }

    if (!platformAdmin) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive">Acesso Negado</h1>
                    <p className="text-muted-foreground mt-2">Você não tem permissão para acessar esta área.</p>
                    <Button onClick={() => router.push('/dashboard')} className="mt-4">Voltar para o dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
}
