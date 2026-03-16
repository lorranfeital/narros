'use client';

import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, AlertTriangle, GitCommit, GitPullRequest, Trash2, Plus, ArrowRight, Check, X } from 'lucide-react';
import React, { useState, useTransition } from 'react';
import { SyncProposal, SyncApprovalStatus, SyncProposalType, WorkspaceStatus } from '@/lib/firestore-types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { updateSyncProposalStatus, publishSync } from '@/lib/actions/workspace-actions';

function getProposalTypeInfo(type: SyncProposalType): { text: string; icon: React.ReactNode, variant: "success" | "default" | "destructive" } {
    switch (type) {
        case SyncProposalType.NEW:
            return { text: 'Novo', icon: <Plus className="h-4 w-4" />, variant: 'success' };
        case SyncProposalType.UPDATED:
            return { text: 'Atualizado', icon: <GitCommit className="h-4 w-4" />, variant: 'default' };
        case SyncProposalType.OBSOLETE:
            return { text: 'Obsoleto', icon: <Trash2 className="h-4 w-4" />, variant: 'destructive' };
        default:
            return { text: 'Desconhecido', icon: <AlertTriangle className="h-4 w-4" />, variant: 'secondary' };
    }
}

function ProposalCard({ proposal }: { proposal: SyncProposal }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleUpdateStatus = (status: SyncApprovalStatus) => {
        startTransition(async () => {
            try {
                await updateSyncProposalStatus(proposal.workspaceId, proposal.id, status);
                toast({ title: `Proposta ${status === SyncApprovalStatus.APPROVED ? 'aprovada' : 'rejeitada'}.` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro ao atualizar proposta.', description: (error as Error).message });
            }
        });
    };

    const typeInfo = getProposalTypeInfo(proposal.type);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                    <Badge variant={typeInfo.variant} className="gap-2">
                        {typeInfo.icon}
                        <span>{typeInfo.text}</span>
                    </Badge>
                    <CardTitle className="text-base font-medium leading-none">{proposal.entityId}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8 bg-background" onClick={() => handleUpdateStatus(SyncApprovalStatus.REJECTED)} disabled={isPending}>
                        <X className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 bg-background" onClick={() => handleUpdateStatus(SyncApprovalStatus.APPROVED)} disabled={isPending}>
                        <Check className="h-4 w-4 text-green-600" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 text-sm">
                {proposal.type === SyncProposalType.NEW && (
                    <div className="space-y-1 rounded-md border border-green-200 bg-green-50 p-3 dark:bg-green-950">
                        <p className="font-semibold text-green-800 dark:text-green-300">Nova descrição:</p>
                        <p className="text-green-700 dark:text-green-400">{proposal.after.descricao}</p>
                    </div>
                )}
                {proposal.type === SyncProposalType.OBSOLETE && (
                     <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 dark:bg-red-950">
                        <p className="font-semibold text-red-800 dark:text-red-300">Descrição obsoleta:</p>
                        <p className="text-red-700 dark:text-red-400 line-through">{proposal.before.descricao}</p>
                    </div>
                )}
                {proposal.type === SyncProposalType.UPDATED && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 dark:bg-red-950">
                           <p className="font-semibold text-red-800 dark:text-red-300">Antes:</p>
                           <p className="text-red-700 dark:text-red-400 line-through">{proposal.before.descricao}</p>
                        </div>
                         <div className="space-y-1 rounded-md border border-green-200 bg-green-50 p-3 dark:bg-green-950">
                            <p className="font-semibold text-green-800 dark:text-green-300">Depois:</p>
                            <p className="text-green-700 dark:text-green-400">{proposal.after.descricao}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


export default function SyncPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const workspaceId = params.workspaceId as string;
    const [isPublishing, setIsPublishing] = useState(false);

    // Fetch pending and approved proposals
    const pendingQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/sync_proposals`), where('approvalStatus', '==', SyncApprovalStatus.PENDING));
    }, [firestore, workspaceId]);
    
    const approvedQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/sync_proposals`), where('approvalStatus', '==', SyncApprovalStatus.APPROVED));
    }, [firestore, workspaceId]);

    const { data: pendingProposals, isLoading: isPendingLoading } = useCollection<SyncProposal>(pendingQuery);
    const { data: approvedProposals, isLoading: isApprovedLoading } = useCollection<SyncProposal>(approvedQuery);

    const handlePublish = async () => {
        if (!user || (approvedProposals?.length ?? 0) === 0) {
            toast({ variant: 'destructive', title: 'Nenhuma alteração aprovada para publicar.' });
            return;
        }
        setIsPublishing(true);
        toast({ title: 'Publicando alterações...' });
        try {
            await publishSync(workspaceId, user.uid);
            toast({ variant: 'success', title: 'Sucesso!', description: 'A base de conhecimento foi sincronizada e publicada.' });
            router.push(`/dashboard/${workspaceId}/knowledge`);
        } catch (error) {
            console.error('Error publishing sync:', error);
            toast({ variant: 'destructive', title: 'Erro ao publicar', description: (error as Error).message });
            setIsPublishing(false);
        }
    };
    
    const isLoading = isPendingLoading || isApprovedLoading;

    if (isLoading) {
        return (
            <div className="p-12 space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Card>
                    <CardHeader><Skeleton className="h-10 w-full" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const noProposals = (pendingProposals?.length ?? 0) === 0 && (approvedProposals?.length ?? 0) === 0;

     if (noProposals) {
        return (
            <div className="p-12">
                <Alert>
                    <GitPullRequest className="h-4 w-4" />
                    <AlertTitle>Nenhuma sincronização pendente</AlertTitle>
                    <AlertDescription>
                        Não há nenhuma alteração proposta para este workspace no momento.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="p-12 space-y-10">
            <div className="flex items-start justify-between">
                 <div>
                    <h1 className="text-4xl font-bold tracking-tight">Revisão da Sincronização</h1>
                    <p className="text-muted-foreground mt-2">
                        Revise, aprove ou rejeite as alterações propostas pela IA para manter sua base de conhecimento atualizada.
                    </p>
                </div>
                 <Button size="lg" onClick={handlePublish} disabled={isPublishing || (approvedProposals?.length ?? 0) === 0}>
                    {isPublishing ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                    Publicar {approvedProposals?.length ?? 0} Alterações
                </Button>
            </div>
            
            {pendingProposals && pendingProposals.length > 0 && (
                <div>
                    <h2 className="text-2xl font-headline mb-4">Pendentes de Revisão ({pendingProposals.length})</h2>
                    <div className="space-y-4">
                        {pendingProposals.map(p => <ProposalCard key={p.id} proposal={p} />)}
                    </div>
                </div>
            )}
            
            {approvedProposals && approvedProposals.length > 0 && (
                <div>
                    <h2 className="text-2xl font-headline mb-4 text-green-600">Aprovadas ({approvedProposals.length})</h2>
                    <div className="space-y-4 opacity-70">
                         {approvedProposals.map(p => <ProposalCard key={p.id} proposal={p} />)}
                    </div>
                </div>
            )}
            
        </div>
    );
}
