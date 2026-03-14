'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Workspace } from "@/lib/firestore-types";
import { Loader2 } from 'lucide-react';

export default function DashboardRedirectPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const workspacesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'workspaces'), where('members', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: workspaces, isLoading: isWorkspacesLoading } = useCollection<Workspace>(workspacesQuery);

    useEffect(() => {
        // Wait until both user and workspaces are loaded to prevent race conditions
        if (isUserLoading || isWorkspacesLoading) {
            return;
        }

        // If user has at least one workspace, redirect to the first one.
        if (workspaces && workspaces.length > 0) {
            router.replace(`/dashboard/${workspaces[0].id}`);
        }
        
        // If user has no workspaces, the dashboard layout (`src/app/dashboard/layout.tsx`)
        // already handles redirecting to `/dashboard/new-workspace`.
        // This page component will just show a loading state in the meantime.

    }, [workspaces, isUserLoading, isWorkspacesLoading, router]);

    // Display a loading message while checking for workspaces and redirecting.
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Carregando seu workspace...</p>
        </div>
    );
}
