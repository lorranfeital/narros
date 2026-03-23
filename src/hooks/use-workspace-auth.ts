'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Workspace } from '@/lib/firestore-types';
import { useParams } from 'next/navigation';

type AuthStatus = 'loading' | 'unauthorized' | 'forbidden' | 'authorized_admin' | 'authorized_collaborator';

export function useWorkspaceAuthorization(): { status: AuthStatus, user: any, workspace: Workspace | null } {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const workspaceId = params.workspaceId as string;

    const workspaceDocRef = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return doc(firestore, 'workspaces', workspaceId);
    }, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

    if (isUserLoading || (workspaceId && isWorkspaceLoading)) {
        return { status: 'loading' as AuthStatus, user, workspace };
    }

    if (!user) {
        return { status: 'unauthorized' as AuthStatus, user, workspace };
    }

    // This handles routes like /dashboard that don't have a workspaceId in the URL
    if (!workspaceId) {
        return { status: 'authorized_admin', user, workspace: null };
    }
    
    // From here, we know workspaceId exists.
    if (!workspace) {
        return { status: 'forbidden' as AuthStatus, user, workspace };
    }
    
    const isOwner = workspace.ownerId === user.uid;
    const role = workspace.roles?.[user.uid];
    const isMember = isOwner || !!role;

    if (!isMember) {
        return { status: 'forbidden' as AuthStatus, user, workspace };
    }

    if (role === 'member' || role === 'collaborator') {
        return { status: 'authorized_collaborator' as AuthStatus, user, workspace };
    }
    
    // Is owner, admin, or curator
    return { status: 'authorized_admin' as AuthStatus, user, workspace };
}
