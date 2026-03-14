
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Workspace, WorkspaceStatus } from "@/lib/firestore-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";

function getStatusText(status: WorkspaceStatus | undefined) {
    if (!status) return 'Status desconhecido';
    switch (status) {
        case WorkspaceStatus.PUBLISHED:
            return 'Publicado';
        case WorkspaceStatus.DRAFT_READY:
            return 'Rascunho pronto';
        case WorkspaceStatus.SYNC_PENDING:
            return 'Sincronização pendente';
        case WorkspaceStatus.NEVER_PUBLISHED:
            return 'Nunca publicado';
        default:
            return 'Nunca publicado';
    }
}

function capitalizeFirstLetter(str: string | undefined) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function WorkspaceCard({ workspace }: { workspace: Workspace }) {
    const status = getStatusText(workspace.status);
    return (
        <Link href={`/dashboard/${workspace.id}`} passHref>
            <Card className="h-full hover:border-primary/50 hover:bg-muted/50 transition-all">
                <CardHeader className="flex-row items-center gap-4">
                     <Avatar>
                        <AvatarImage src={workspace.logoUrl} />
                        <AvatarFallback>{workspace.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-lg font-semibold">{workspace.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{capitalizeFirstLetter(workspace.type)} &middot; {workspace.sector}</p>
                    </div>
                </CardHeader>
                <CardFooter className="flex justify-between items-center">
                     <Badge variant={workspace.status === 'published' ? 'success' : 'secondary'}>{status}</Badge>
                     {workspace.lastPublishedAt && (
                        <p className="text-xs text-muted-foreground">
                            Pub: {format(workspace.lastPublishedAt.toDate(), "dd/MM/yy", { locale: ptBR })}
                        </p>
                    )}
                </CardFooter>
            </Card>
        </Link>
    );
}

function NewWorkspaceCard() {
    return (
        <Link href="/dashboard/new-workspace" passHref>
            <Card className="h-full flex items-center justify-center border-dashed hover:border-primary hover:text-primary transition-all min-h-[145px]">
                <div className="text-center">
                    <Plus className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 font-medium text-muted-foreground">Novo workspace</p>
                </div>
            </Card>
        </Link>
    );
}

export default function DashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const workspacesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'workspaces'), where('members', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: workspaces, isLoading: isWorkspacesLoading } = useCollection<Workspace>(workspacesQuery);

    const isLoading = isUserLoading || isWorkspacesLoading;

    return (
        <div className="p-12">
            <div className="mb-10">
                {isLoading ? (
                    <>
                        <Skeleton className="h-10 w-1/3 mb-2" />
                        <Skeleton className="h-5 w-1/2" />
                    </>
                ) : (
                    <>
                        <h1 className="text-4xl font-bold tracking-tight font-headline">Bom dia, {user?.displayName?.split(' ')[0]}</h1>
                        <p className="text-muted-foreground mt-2">
                            Gerencie seus workspaces ou crie um novo para começar.
                        </p>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {isLoading ? (
                    <>
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </>
                ) : (
                    <>
                        {workspaces?.map((ws) => <WorkspaceCard key={ws.id} workspace={ws} />)}
                        <NewWorkspaceCard />
                    </>
                )}
            </div>
        </div>
    );
}
