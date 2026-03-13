'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useStorage, useUser } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Trash2, Loader2, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import React, { useState } from 'react';
import { IngestionState, ProcessingStatus, Source, Workspace, SourceType } from '@/lib/firestore-types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
                <p className="truncate font-medium">{source.type === SourceType.TEXT ? 'Texto colado' : source.sourceName}</p>
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


export default function WorkspacePage() {
    const firestore = useFirestore();
    const storage = useStorage();
    const { user } = useUser();
    const params = useParams();
    const { toast } = useToast();
    const workspaceId = params.workspaceId as string;

    const [rawText, setRawText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Workspace data
    const workspaceDocRef = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return doc(firestore, 'workspaces', workspaceId);
    }, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

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
        if (!rawText.trim() || !user || !workspace || !workspaceDocRef) return;
        setIsSubmitting(true);
        try {
            const batch = writeBatch(firestore);
            const batchId = sources?.[0]?.batchId || doc(collection(firestore, 'temp')).id;
            
            const newSourceRef = doc(collection(firestore, `workspaces/${workspaceId}/sources`));
            batch.set(newSourceRef, {
                type: SourceType.TEXT,
                rawText: rawText.trim(),
                processingStatus: ProcessingStatus.PENDING,
                batchId: batchId,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
            } as Omit<Source, 'id' | 'workspaceId'>);

            if (workspace.ingestionState !== IngestionState.INGESTING) {
                batch.update(workspaceDocRef, { ingestionState: IngestionState.INGESTING });
            }

            await batch.commit();

            toast({ title: 'Texto adicionado à fila.' });
            setRawText('');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao adicionar texto.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !workspace || !workspaceDocRef) return;
        setIsSubmitting(true);
        
        const newSourceRef = doc(collection(firestore, `workspaces/${workspaceId}/sources`));
        const filePath = `workspaces/${workspaceId}/sources/${newSourceRef.id}/${file.name}`;
        const fileStorageRef = storageRef(storage, filePath);

        try {
            // 1. Upload file to Storage
            await uploadBytes(fileStorageRef, file);

            // 2. Create source doc in Firestore and update workspace state in a batch
            const batch = writeBatch(firestore);
            const batchId = sources?.[0]?.batchId || doc(collection(firestore, 'temp')).id;

            batch.set(newSourceRef, {
                type: SourceType.FILE,
                sourceName: file.name,
                mimeType: file.type,
                storagePath: filePath,
                processingStatus: ProcessingStatus.PENDING,
                batchId: batchId,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
            } as Omit<Source, 'id' | 'workspaceId'>);
            
            if (workspace.ingestionState !== IngestionState.INGESTING) {
                 batch.update(workspaceDocRef, { ingestionState: IngestionState.INGESTING });
            }
            
            await batch.commit();

            toast({ title: 'Arquivo adicionado à fila.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao enviar arquivo.' });
        } finally {
            setIsSubmitting(false);
            e.target.value = ''; // Reset file input
        }
    }

    const handleDeleteSource = async (sourceId: string, storagePath?: string) => {
        if (!workspaceId) return;
        try {
            // Delete Firestore document
            await deleteDoc(doc(firestore, `workspaces/${workspaceId}/sources`, sourceId));
            
            // If there's a file, delete it from Storage
            if (storagePath) {
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
        if (!workspace || sources?.length === 0 || !workspaceDocRef) return;
        setIsSubmitting(true);

        // This is where the call to the Genkit flow will happen.
        // For now, we'll just update the states.
        try {
            const batch = writeBatch(firestore);
            
            // Update workspace state
            batch.update(workspaceDocRef, { 
                ingestionState: IngestionState.PROCESSING,
                lastProcessedAt: serverTimestamp()
             });

            // Update status of all sources in the batch
            sources?.forEach(source => {
                const sourceRef = doc(firestore, `workspaces/${workspaceId}/sources`, source.id);
                batch.update(sourceRef, { processingStatus: ProcessingStatus.PROCESSING });
            });
            
            await batch.commit();
            
            toast({
                title: "Processamento iniciado!",
                description: "A IA está analisando seu conteúdo. Você será notificado quando terminar."
            });
        } catch (error) {
             console.error(error);
             toast({ variant: 'destructive', title: 'Erro ao iniciar processamento.' });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const isLoading = isWorkspaceLoading || isSourcesLoading;

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
                <h1 className="text-4xl font-headline font-bold tracking-tight">{workspace.name}</h1>
                <p className="text-muted-foreground mt-2">
                    Adicione conteúdo bruto à fila para que a IA possa organizá-lo.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Adicionar conteúdo</CardTitle>
                    <CardDescription>
                        Cole textos ou faça upload de arquivos. Eles entrarão na fila de processamento.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Cole seu conteúdo aqui..."
                        className="min-h-[150px] text-base"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <div className="flex items-center gap-4">
                         <Button onClick={handleAddText} disabled={isSubmitting || !rawText.trim()}>
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
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                Fazer upload de arquivo
                                <input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} disabled={isSubmitting} />
                            </label>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div>
                <h2 className="text-2xl font-headline font-semibold">Fila de Ingestão</h2>
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
                        <CardTitle>Pronto para começar?</CardTitle>
                        <CardDescription>
                           {sources.length} {sources.length === 1 ? 'item está' : 'itens estão'} na fila. Ao clicar abaixo, a IA começará a analisar todo o lote.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button size="lg" onClick={handleFinalizeBatch} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                            Finalizar e gerar rascunho
                        </Button>
                    </CardFooter>
                </Card>
            )}

        </div>
    );
}
