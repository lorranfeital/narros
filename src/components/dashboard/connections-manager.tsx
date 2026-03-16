
'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { searchWorkspaces, SearchableWorkspace, requestWorkspaceConnection, updateWorkspaceLinkStatus, deleteWorkspaceLink } from '@/lib/actions/connections-actions';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Hourglass, CheckCircle, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, or } from 'firebase/firestore';
import { WorkspaceLink, WorkspaceLinkStatus } from '@/lib/firestore-types';


type SearchResultWithStatus = SearchableWorkspace & {
    connectionStatus: 'connect' | 'pending' | 'connected';
};

export function ConnectionsManager() {
    const params = useParams();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();
    const workspaceId = params.workspaceId as string;

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResultWithStatus[]>([]);
    const [isSearching, startSearchTransition] = useTransition();
    const [requestingId, setRequestingId] = useState<string | null>(null);
    const [actionId, setActionId] = useState<string | null>(null);
    const [isActionPending, startActionTransition] = useTransition();

    // Fetch all existing connections related to the current workspace
    const connectionsQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(
            collection(firestore, 'workspaceLinks'),
            or(
                where('sourceWorkspaceId', '==', workspaceId),
                where('targetWorkspaceId', '==', workspaceId)
            )
        );
    }, [firestore, workspaceId]);
    const { data: connections, isLoading: areConnectionsLoading } = useCollection<WorkspaceLink>(connectionsQuery);

    const connectionStatusMap = useMemo(() => {
        const map = new Map<string, 'pending' | 'connected'>();
        if (!connections) return map;

        connections.forEach(link => {
            const otherWorkspaceId = link.sourceWorkspaceId === workspaceId ? link.targetWorkspaceId : link.sourceWorkspaceId;
            if (link.status === WorkspaceLinkStatus.ACTIVE) {
                map.set(otherWorkspaceId, 'connected');
            } else if (link.status === WorkspaceLinkStatus.PENDING) {
                map.set(otherWorkspaceId, 'pending');
            }
        });
        return map;
    }, [connections, workspaceId]);
    
    const { activeConnections, incomingRequests, outgoingRequests } = useMemo(() => {
        const active: WorkspaceLink[] = [];
        const incoming: WorkspaceLink[] = [];
        const outgoing: WorkspaceLink[] = [];

        if (!connections) {
            return { activeConnections: [], incomingRequests: [], outgoingRequests: [] };
        }

        connections.forEach(link => {
            if (link.status === WorkspaceLinkStatus.ACTIVE) {
                active.push(link);
            } else if (link.status === WorkspaceLinkStatus.PENDING) {
                if (link.targetWorkspaceId === workspaceId) {
                    incoming.push(link);
                } else {
                    outgoing.push(link);
                }
            }
        });

        return { activeConnections: active, incomingRequests: incoming, outgoingRequests: outgoing };
    }, [connections, workspaceId]);


    const handleSearch = () => {
        if (searchTerm.trim().length < 2) {
            toast({
                variant: 'destructive',
                title: 'Busca inválida',
                description: 'Por favor, digite pelo menos 2 caracteres para buscar.',
            });
            return;
        }
        startSearchTransition(async () => {
            const results = await searchWorkspaces(searchTerm, workspaceId);
            const resultsWithStatus: SearchResultWithStatus[] = results.map(r => ({
                ...r,
                connectionStatus: connectionStatusMap.get(r.id) || 'connect'
            }));
            setSearchResults(resultsWithStatus);
        });
    };

    const handleRequestConnection = async (target: SearchableWorkspace) => {
        if (!user) return;
        setRequestingId(target.id);
        try {
            await requestWorkspaceConnection({
                sourceWorkspaceId: workspaceId,
                targetWorkspaceId: target.id,
                targetWorkspaceName: target.name,
                targetWorkspaceLogoUrl: target.logoUrl,
                userId: user.uid,
            });
            toast({
                title: "Solicitação enviada!",
                description: `Uma solicitação de conexão foi enviada para ${target.name}.`
            });
            // Immediately update the UI state for this item to 'pending'
            setSearchResults(prev => prev.map(r => r.id === target.id ? { ...r, connectionStatus: 'pending' } : r));
        } catch (error) {
            console.error("Error requesting connection:", error);
            toast({
                variant: 'destructive',
                title: "Erro ao solicitar conexão",
                description: (error as Error).message
            });
        } finally {
            setRequestingId(null);
        }
    }
    
    const handleUpdateRequest = (linkId: string, status: WorkspaceLinkStatus.ACTIVE | WorkspaceLinkStatus.REJECTED) => {
        if (!user) return;
        setActionId(linkId);
        startActionTransition(async () => {
            try {
                await updateWorkspaceLinkStatus(linkId, status, user.uid, workspaceId);
                toast({ title: `Solicitação ${status === 'active' ? 'aceita' : 'recusada'}!` });
            } catch (error) {
                toast({ variant: 'destructive', title: "Erro ao processar solicitação", description: (error as Error).message });
            } finally {
                setActionId(null);
            }
        });
    }

    const handleDeleteRequest = (linkId: string) => {
        if (!user) return;
        setActionId(linkId);
        startActionTransition(async () => {
            try {
                await deleteWorkspaceLink(linkId, user.uid, workspaceId);
                toast({ title: 'Conexão removida.' });
            } catch (error) {
                toast({ variant: 'destructive', title: "Erro ao remover conexão", description: (error as Error).message });
            } finally {
                setActionId(null);
            }
        });
    }

    const isLoading = areConnectionsLoading || isSearching;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Conexões</CardTitle>
                <CardDescription>
                Gerencie conexões com outros workspaces para compartilhar conhecimento.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="text-lg font-medium">Solicitar Nova Conexão</h3>
                    <p className="text-sm text-muted-foreground">
                    Procure por um workspace para enviar uma solicitação de conexão.
                    </p>
                    <div className="mt-4 flex gap-2">
                    <Input 
                        placeholder="Nome do workspace..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isSearching || areConnectionsLoading}>
                        {(isSearching || areConnectionsLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Buscar
                    </Button>
                    </div>

                    {/* Search Results */}
                    {isSearching && <div className="mt-4 text-sm text-muted-foreground">Buscando...</div>}
                    {!isSearching && searchResults.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {searchResults.map(result => (
                                <div key={result.id} className="flex items-center justify-between rounded-md border p-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={result.logoUrl} />
                                            <AvatarFallback>{result.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-medium">{result.name}</p>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleRequestConnection(result)}
                                        disabled={result.connectionStatus !== 'connect' || requestingId === result.id}
                                    >
                                        {requestingId === result.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {result.connectionStatus === 'pending' && <><Hourglass className="mr-2 h-4 w-4" /> Pendente</>}
                                        {result.connectionStatus === 'connected' && <><Check className="mr-2 h-4 w-4" /> Conectado</>}
                                        {result.connectionStatus === 'connect' && 'Conectar'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                     {!isSearching && searchTerm && searchResults.length === 0 && (
                        <p className="mt-4 text-sm text-muted-foreground">Nenhum workspace encontrado.</p>
                     )}
                </div>

                <Separator />

                <div>
                    <h3 className="text-lg font-medium">Solicitações Recebidas</h3>
                    {areConnectionsLoading ? <Skeleton className="h-20 w-full mt-4" /> : (
                        incomingRequests.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                {incomingRequests.map(link => (
                                    <div key={link.id} className="flex items-center justify-between rounded-md border p-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8"><AvatarImage src={link.sourceWorkspaceLogoUrl} /><AvatarFallback>{link.sourceWorkspaceName.charAt(0)}</AvatarFallback></Avatar>
                                            <p className="font-medium">{link.sourceWorkspaceName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleUpdateRequest(link.id, WorkspaceLinkStatus.REJECTED)} disabled={isActionPending && actionId === link.id}>
                                                {(isActionPending && actionId === link.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Recusar
                                            </Button>
                                            <Button size="sm" onClick={() => handleUpdateRequest(link.id, WorkspaceLinkStatus.ACTIVE)} disabled={isActionPending && actionId === link.id}>
                                                 {(isActionPending && actionId === link.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aceitar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
                                <p className="text-sm text-muted-foreground">Nenhuma solicitação recebida.</p>
                            </div>
                        )
                    )}
                </div>

                <Separator />
                
                <div>
                    <h3 className="text-lg font-medium">Conexões Ativas</h3>
                    {areConnectionsLoading ? <Skeleton className="h-20 w-full mt-4" /> : (
                        activeConnections.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                {activeConnections.map(link => {
                                     const otherWs = link.sourceWorkspaceId === workspaceId ? { id: link.targetWorkspaceId, name: link.targetWorkspaceName, logoUrl: link.targetWorkspaceLogoUrl } : { id: link.sourceWorkspaceId, name: link.sourceWorkspaceName, logoUrl: link.sourceWorkspaceLogoUrl };
                                    return (
                                        <div key={link.id} className="flex items-center justify-between rounded-md border p-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8"><AvatarImage src={otherWs.logoUrl} /><AvatarFallback>{otherWs.name.charAt(0)}</AvatarFallback></Avatar>
                                                <p className="font-medium">{otherWs.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="success" className="gap-1.5"><CheckCircle className="h-3 w-3" /> Conectado</Badge>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest(link.id)} disabled={isActionPending && actionId === link.id}>
                                                     {(isActionPending && actionId === link.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Desconectar
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
                                <p className="text-sm text-muted-foreground">Nenhuma conexão ativa.</p>
                            </div>
                        )
                    )}
                </div>

                <Separator />

                <div>
                    <h3 className="text-lg font-medium">Solicitações Enviadas</h3>
                     {areConnectionsLoading ? <Skeleton className="h-20 w-full mt-4" /> : (
                        outgoingRequests.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                {outgoingRequests.map(link => (
                                     <div key={link.id} className="flex items-center justify-between rounded-md border p-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8"><AvatarImage src={link.targetWorkspaceLogoUrl} /><AvatarFallback>{link.targetWorkspaceName.charAt(0)}</AvatarFallback></Avatar>
                                            <p className="font-medium">{link.targetWorkspaceName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                             <Badge variant="secondary" className="gap-1.5"><Hourglass className="h-3 w-3" /> Pendente</Badge>
                                             <Button variant="outline" size="sm" onClick={() => handleDeleteRequest(link.id)} disabled={isActionPending && actionId === link.id}>
                                                {(isActionPending && actionId === link.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
                                <p className="text-sm text-muted-foreground">Nenhuma solicitação enviada.</p>
                            </div>
                        )
                     )}
                </div>
            </CardContent>
        </Card>
    );
}
