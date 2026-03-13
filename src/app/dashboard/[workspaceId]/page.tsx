
'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useStorage, useUser } from '@/firebase';
import { doc, collection, query, where, deleteDoc, getDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Trash2, Loader2, Sparkles, AlertTriangle, ArrowRight, GitPullRequest, Clock, Database, ListChecks } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import React, { useState } from 'react';
import { IngestionState, ProcessingStatus, Source, Workspace, SourceType, WorkspaceStatus } from '@/lib/firestore-types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { processContentBatch } from '@/lib/actions/workspace-actions';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Component to render a single source item
function SourceItem({ source, onDelete }: { source: Source & {id: string}, onDelete: (sourceId: string, storagePath?: string) => void }) {
    const getIcon = () => {
        switch (source.type) {
            case SourceType.TEXT:
                return <FileText className="h-5 w-5 text-muted-foreground" />;
            case SourceType.FILE:
                return <Upload className="h-5 w-5 text-muted-foreground" />;
            default:
                return <FileText className="h-5 w-5 text-muted-foreground" />;
        }
    };
    
    return (
        <div className="flex items-center gap-4 rounded-lg border p-3 pr-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                {getIcon()}
            </div>
            <div className="flex-grow overflow-hidden">
                <p className="truncate font-medium">{source.sourceName || (source.type === SourceType.TEXT ? 'Texto colado' : 'Fonte desconhecida')}</p>
                <p className="text-sm text-muted-foreground">
                    {source.type === SourceType.TEXT ? `${source.rawText?.substring(0, 50)}...` : `Tipo: ${source.mimeType}`}
                </p>
            </div>
            <Badge variant="secondary">{source.processingStatus}</Badge>
            <Button variant="ghost" size="icon" onClick={() => onDelete(source.id, source.storagePath)}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
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

export default function WorkspacePage() {
    const firestore = useFirestore();
    const storage = useStorage();
    const { user } = useUser();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const workspaceId = params.workspaceId as string;

    const [rawText, setRawText] = useState('');
    const [textSourceName, setTextSourceName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Workspace data
    const workspaceDocRef = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return doc(firestore, 'workspaces', workspaceId);
    }, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

    // This state is now derived from the workspace doc
    const isProcessing = workspace?.ingestionState === IngestionState.PROCESSING;

    // Sources queue
    const sourcesQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        // We only show items that are part of the current ingestion cycle
        return query(
            collection(firestore, `workspaces/${workspaceId}/sources`),
            where('processingStatus', '==', ProcessingStatus.PENDING)
        );
    }, [firestore, workspaceId]);
    const { data: sources, isLoading: isSourcesLoading } = useCollection<Source>(sourcesQuery);

    const handleAddText = async () => {
        if (!rawText.trim() || !user || !workspaceId || !firestore) return;
        setIsSubmitting(true);
        try {
            const sourcesColRef = collection(firestore, `workspaces/${workspaceId}/sources`);
            const newDoc = doc(sourcesColRef); // Generate ID client-side
            const batchId = sources?.[0]?.batchId || newDoc.id; // Use existing batch or create new one
            
            const data: any = {
                type: SourceType.TEXT,
                rawText: rawText.trim(),
                processingStatus: ProcessingStatus.PENDING,
                batchId: batchId,
                createdAt: new Date(),
                createdBy: user.uid,
            };

            if (textSourceName.trim()) {
                data.sourceName = textSourceName.trim();
            }
    
            await setDocumentNonBlocking(newDoc, data, {});

            toast({ title: 'Texto adicionado à fila.' });
            setRawText('');
            setTextSourceName('');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao adicionar texto.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !workspaceId || !storage || !firestore) return;
        setIsSubmitting(true);
        
        const sourcesColRef = collection(firestore, `workspaces/${workspaceId}/sources`);
        const newSourceDocRef = doc(sourcesColRef);
        const filePath = `workspaces/${workspaceId}/sources/${newSourceDocRef.id}/${file.name}`;
        const fileStorageRef = storageRef(storage, filePath);

        try {
            const metadata = {
                customMetadata: {
                    'uploaderId': user.uid
                }
            };
            await uploadBytes(fileStorageRef, file, metadata);

            const batchId = sources?.[0]?.batchId || newSourceDocRef.id;

            await setDocumentNonBlocking(newSourceDocRef, {
                type: SourceType.FILE,
                sourceName: file.name,
                mimeType: file.type,
                storagePath: filePath,
                processingStatus: ProcessingStatus.PENDING,
                batchId: batchId,
                createdAt: new Date(),
                createdBy: user.uid,
            }, {});
            
            toast({ title: 'Arquivo adicionado à fila.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao enviar arquivo.' });
        } finally {
            setIsSubmitting(false);
            e.target.value = '';
        }
    }

    const handleDeleteSource = async (sourceId: string, storagePath?: string) => {
        if (!workspaceId || !firestore) return;
        try {
            await deleteDoc(doc(firestore, `workspaces/${workspaceId}/sources`, sourceId));
            
            if (storagePath && storage) {
                const fileRef = storageRef(storage, storagePath);
                await deleteObject(fileRef);
            }

            toast({ title: 'Fonte removida da fila.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao remover fonte.' });
        }
    };

    const handleFinalizeBatch = async () => {
        if (!workspace || sources?.length === 0 || !workspaceDocRef || !sources?.[0]?.batchId) return;
        
        toast({
            title: "Processamento iniciado!",
            description: "A IA está analisando seu conteúdo. Isso pode levar alguns minutos."
        });
        
        try {
            await processContentBatch(workspaceId, sources[0].batchId);
            
            // Refetch workspace data to get the new status
            const updatedWorkspaceSnap = await getDoc(workspaceDocRef);
            const newStatus = updatedWorkspaceSnap.data()?.status;

            if (newStatus === WorkspaceStatus.DRAFT_READY) {
                 toast({
                    title: "Rascunho gerado com sucesso!",
                    description: "Seu conteúdo foi processado e um novo rascunho está pronto para revisão."
                });
                router.push(`/dashboard/${workspaceId}/review`);
            } else if (newStatus === WorkspaceStatus.SYNC_PENDING) {
                 toast({
                    title: "Sincronização pendente!",
                    description: "A IA encontrou alterações e um novo sync está pronto para revisão."
                });
                router.push(`/dashboard/${workspaceId}/sync`);
            }
           
        } catch (error) {
             console.error("Erro ao processar o lote:", error);
             toast({ variant: 'destructive', title: 'Erro ao processar conteúdo.', description: (error as Error).message });
        }
    }
    
    const isLoading = isWorkspaceLoading || isSourcesLoading;
    const isActionDisabled = isSubmitting || isProcessing;
    
    if (isLoading) {
        return (
            <div className="p-12 space-y-10">
                <div>
                    <Skeleton className="h-10 w-1/2" />
                    <Skeleton className="h-4 w-1/3 mt-4" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-4 w-2/5 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-40" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!workspace) {
        return <div className="p-12">Workspace não encontrado.</div>;
    }

    const isQueueEmpty = !sources || sources.length === 0;

    return (
        <div className="p-12 space-y-10">
             <div>
                <h1 className="text-4xl font-bold tracking-tight">{workspace.name}</h1>
                <p className="text-muted-foreground mt-2">
                    Adicione conteúdo bruto à fila para que a IA possa organizá-lo.
                </p>
            </div>
            
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2" title={`Status: ${getStatusText(workspace.status)}`}>
                    <Badge variant={
                        workspace.status === 'published' ? 'success' : 
                        workspace.status === 'sync_pending' ? 'processing' :
                        workspace.status === 'draft_ready' ? 'default' :
                        'secondary'
                    }>{getStatusText(workspace.status)}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    <span>Fila: <span className="font-semibold text-foreground">{sources?.length || 0} itens</span></span>
                </div>
                {workspace.lastProcessedAt && (
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Processado: <span className="font-semibold text-foreground">{formatDistanceToNow(workspace.lastProcessedAt.toDate(), { locale: ptBR, addSuffix: true })}</span></span>
                    </div>
                )}
                {workspace.lastPublishedAt && (
                    <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span>Publicado: <span className="font-semibold text-foreground">{formatDistanceToNow(workspace.lastPublishedAt.toDate(), { locale: ptBR, addSuffix: true })}</span></span>
                    </div>
                )}
                 {workspace.status === 'sync_pending' && workspace.pendingSyncCount && workspace.pendingSyncCount > 0 &&(
                    <div className="flex items-center gap-2">
                        <GitPullRequest className="h-4 w-4" />
                        <span>Pendentes: <span className="font-semibold text-foreground">{workspace.pendingSyncCount}</span></span>
                    </div>
                )}
            </div>

            {workspace.status === WorkspaceStatus.SYNC_PENDING && (
                 <Alert className="border-blue-500/50 text-blue-600 dark:text-blue-400 [&>svg]:text-blue-500">
                    <GitPullRequest className="h-4 w-4" />
                    <AlertTitle className="font-bold text-blue-700 dark:text-blue-300">Sincronização pendente</AlertTitle>
                    <AlertDescription>
                        Um novo lote de conteúdo foi processado e há {workspace.pendingSyncCount || 0} alterações propostas.
                        <Button variant="link" asChild className="p-0 pl-2 h-auto text-blue-600 dark:text-blue-400">
                            <Link href={`/dashboard/${workspaceId}/sync`}>
                                Revisar alterações <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {workspace.status === WorkspaceStatus.DRAFT_READY && (
                <Alert className="border-amber-500/50 text-amber-600 dark:text-amber-400 [&>svg]:text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="font-bold text-amber-700 dark:text-amber-300">Rascunho pronto para revisão</AlertTitle>
                    <AlertDescription>
                        Um novo rascunho foi gerado a partir do último lote de conteúdo.
                        <Button variant="link" asChild className="p-0 pl-2 h-auto text-amber-600 dark:text-amber-400">
                            <Link href={`/dashboard/${workspaceId}/review`}>
                                Revisar agora <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Adicionar conteúdo</CardTitle>
                    <CardDescription>
                        Cole textos ou faça upload de arquivos. Eles entrarão na fila de processamento.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                         <Label htmlFor="text-source-name">Nome da Fonte (opcional)</Label>
                         <Input
                            id="text-source-name"
                            placeholder="Ex: Transcrição da reunião de alinhamento"
                            value={textSourceName}
                            onChange={(e) => setTextSourceName(e.target.value)}
                            disabled={isActionDisabled}
                        />
                    </div>
                    <Textarea
                        placeholder="Cole seu conteúdo aqui..."
                        className="min-h-[150px] text-base"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        disabled={isActionDisabled}
                    />
                    <div className="flex items-center gap-4">
                         <Button onClick={handleAddText} disabled={isActionDisabled || !rawText.trim()}>
                            {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2" />}
                            Adicionar texto
                         </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">Ou</span>
                            </div>
                        </div>

                         <Button variant="outline" asChild>
                            <label htmlFor="file-upload" className={`cursor-pointer ${isActionDisabled ? 'pointer-events-none opacity-50' : ''}`}>
                                <Upload className="mr-2 h-4 w-4" />
                                Fazer upload de arquivo
                                <input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} disabled={isActionDisabled} />
                            </label>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div>
                <h2 className="text-2xl font-headline font-semibold">Fila de Conteúdo</h2>
                <p className="text-muted-foreground mt-1">Conteúdo aguardando processamento.</p>

                <div className="mt-6 space-y-4">
                    {isQueueEmpty ? (
                         <Alert>
                            <Sparkles className="h-4 w-4" />
                            <AlertTitle>Fila vazia!</AlertTitle>
                            <AlertDescription>
                                Adicione conteúdo no card acima para começar.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        sources.map(source => (
                            <SourceItem key={source.id} source={source} onDelete={handleDeleteSource} />
                        ))
                    )}
                </div>
            </div>

            {!isQueueEmpty && (
                <Card className="bg-secondary">
                    <CardHeader>
                        <CardTitle className="font-headline">Pronto para começar?</CardTitle>
                        <CardDescription>
                           {sources.length} {sources.length === 1 ? 'item está' : 'itens estão'} na fila. Ao clicar abaixo, a IA começará a analisar todo o lote.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button size="lg" onClick={handleFinalizeBatch} disabled={isActionDisabled}>
                            {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                            {isProcessing ? 'Processando...' : 'Finalizar e gerar rascunho'}
                        </Button>
                    </CardFooter>
                </Card>
            )}

        </div>
    );
}
