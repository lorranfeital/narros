'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";
import { Workspace, WorkspaceStatus } from "@/lib/firestore-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from 'date-fns';

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

function getStatusBadgeVariant(status: WorkspaceStatus): BadgeVariant {
  switch (status) {
    case WorkspaceStatus.PUBLISHED:
      return 'success';
    case WorkspaceStatus.SYNC_PENDING:
      return 'processing';
    case WorkspaceStatus.DRAFT_READY:
      return 'default';
    case WorkspaceStatus.NEVER_PUBLISHED:
    default:
      return 'secondary';
  }
}

function getStatusText(status: WorkspaceStatus) {
    switch (status) {
        case WorkspaceStatus.PUBLISHED:
            return 'Publicado';
        case WorkspaceStatus.DRAFT_READY:
            return 'Rascunho pronto';
        case WorkspaceStatus.SYNC_PENDING:
            return 'Sincronização pendente';
        case WorkspaceStatus.NEVER_PUBLISHED:
        default:
            return 'Nunca publicado';
    }
}

function capitalize(str: string) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}


export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const workspacesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'workspaces'), where('members', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: workspaces, isLoading } = useCollection<Workspace>(workspacesQuery);

    return (
        <div className="p-12">
            <h1 className="text-4xl font-bold tracking-tight font-headline">Bom dia, {user?.displayName?.split(' ')[0]}</h1>
            <p className="text-muted-foreground mt-2">Gerencie seus workspaces ou crie um novo para começar.</p>
            
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="h-full min-h-[180px]">
                        <CardHeader className="flex-grow">
                            <div className="flex items-start gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Skeleton className="h-6 w-1/3" />
                        </CardContent>
                    </Card>
                ))}

                {!isLoading && workspaces?.map((ws) => (
                    <Link href={`/dashboard/${ws.id}`} key={ws.id}>
                        <Card className="h-full min-h-[180px] hover:border-primary/50 transition-colors flex flex-col">
                            <CardHeader className="flex-grow">
                               <div className="flex items-start gap-4">
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarImage src={ws.logoUrl} alt={`${ws.name} logo`} />
                                        <AvatarFallback>{ws.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <CardTitle className="text-xl font-body font-semibold">{ws.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-2 pt-1">
                                            <span>{capitalize(ws.type)}</span>
                                            <span>&middot;</span>
                                            <span>{ws.sector}</span>
                                        </CardDescription>
                                    </div>
                               </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <Badge variant={getStatusBadgeVariant(ws.status)}>
                                        <span>{getStatusText(ws.status)}</span>
                                         {ws.status === WorkspaceStatus.SYNC_PENDING && ws.pendingSyncCount && ws.pendingSyncCount > 0 && (
                                            <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">{ws.pendingSyncCount}</span>
                                        )}
                                    </Badge>
                                    {ws.lastPublishedAt && (
                                        <p className="text-xs text-muted-foreground">
                                            Pub: {format(ws.lastPublishedAt.toDate(), "dd/MM/yy")}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
                
                {!isLoading && (
                    <Link href="/dashboard/new-workspace">
                        <Card className="flex h-full min-h-[180px] items-center justify-center border-dashed hover:border-primary/80 transition-colors">
                            <div className="text-center text-muted-foreground">
                                <Plus className="mx-auto h-8 w-8" />
                                <p className="mt-2 font-medium">Novo workspace</p>
                            </div>
                        </Card>
                    </Link>
                )}
            </div>
        </div>
    )
}
