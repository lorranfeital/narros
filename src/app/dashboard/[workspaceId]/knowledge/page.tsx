'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PublishedKnowledge, Playbook, TrainingModule, Insight, Version, Workspace } from '@/lib/firestore-types';
import { BookOpen, Lightbulb, Milestone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Main component
export default function KnowledgePage() {
    const firestore = useFirestore();
    const params = useParams();
    const workspaceId = params.workspaceId as string;

    // Fetch Workspace to get version and last published date
    const workspaceDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'workspaces', workspaceId) : null, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

    // Fetch the single LIVE published knowledge document.
    // The doc ID is the same as the workspace ID.
    const publishedKnowledgeDocRef = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return doc(firestore, `workspaces/${workspaceId}/published_knowledge`, workspaceId);
    }, [firestore, workspaceId]);
    const { data: publishedKnowledge, isLoading: isKnowledgeLoading } = useDoc<PublishedKnowledge>(publishedKnowledgeDocRef);

    // Fetch published playbooks
    const playbooksQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/playbooks`), where('status', '==', 'published'));
    }, [firestore, workspaceId]);
    const { data: playbooks, isLoading: isPlaybooksLoading } = useCollection<Playbook>(playbooksQuery);

    // Fetch published training modules
    const trainingModulesQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/training_modules`), where('status', '==', 'published'));
    }, [firestore, workspaceId]);
    const { data: trainingModules, isLoading: isTrainingLoading } = useCollection<TrainingModule>(trainingModulesQuery);

    // Fetch insights (for now, all of them)
    const insightsQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/insights`));
    }, [firestore, workspaceId]);
    const { data: insights, isLoading: isInsightsLoading } = useCollection<Insight>(insightsQuery);

    // Fetch version history
    const versionsQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/versions`), orderBy('version', 'desc'));
    }, [firestore, workspaceId]);
    const { data: versions, isLoading: isVersionsLoading } = useCollection<Version>(versionsQuery);


    const isLoading = isWorkspaceLoading || isKnowledgeLoading || isPlaybooksLoading || isTrainingLoading || isInsightsLoading || isVersionsLoading;

    if (isLoading) {
        return (
            <div className="p-12 space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!publishedKnowledge && !isLoading) {
         return (
            <div className="p-12">
                <Alert variant="default" className="bg-secondary">
                    <BookOpen className="h-4 w-4" />
                    <AlertTitle>Base de conhecimento não publicada</AlertTitle>
                    <AlertDescription>
                        Este workspace ainda não possui uma base de conhecimento publicada. Adicione conteúdo e gere um rascunho para começar.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    const lastPublishedDate = workspace?.lastPublishedAt?.toDate();

    return (
        <div className="p-12 space-y-10">
            <div>
                <div className="flex justify-between items-center">
                    <h1 className="text-4xl font-bold tracking-tight">Base de Conhecimento</h1>
                    {workspace?.version ? (
                        <div className="text-right">
                            <Badge variant="success">Versão {workspace.version}</Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                                Última publicação: {lastPublishedDate ? format(lastPublishedDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'N/A'}
                            </p>
                        </div>
                    ) : null}
                </div>
                <p className="text-muted-foreground mt-2">
                    Este é o conhecimento validado e atualmente em uso na operação de {workspace?.name}.
                </p>
            </div>

            <Tabs defaultValue="knowledge" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="knowledge">Base de Conhecimento</TabsTrigger>
                    <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
                    <TabsTrigger value="training">Treinamentos</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>
                
                <TabsContent value="knowledge" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Categorias e Itens</CardTitle>
                            <CardDescription>Navegue pelo conhecimento estruturado da sua empresa.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="w-full">
                                {publishedKnowledge?.categories.map((category) => (
                                    <AccordionItem key={category.categoria} value={category.categoria}>
                                        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl">{category.icone}</span>
                                                <span>{category.categoria}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pl-4 border-l-2 ml-8 space-y-4">
                                            {category.itens.map(item => (
                                                <div key={item.titulo} className="pt-2">
                                                    <h4 className="font-semibold">{item.titulo}</h4>
                                                    <p className="text-muted-foreground mt-1">{item.descricao}</p>
                                                </div>
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="playbooks" className="mt-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Playbooks Operacionais</CardTitle>
                            <CardDescription>Processos passo-a-passo para garantir a consistência.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           {(playbooks && playbooks.length > 0) ? playbooks.map(playbook => (
                               <div key={playbook.id} className="border-b pb-6 last:border-b-0">
                                   <h3 className="text-xl font-headline font-semibold">{playbook.processo}</h3>
                                   <div className="mt-4 space-y-4">
                                       {playbook.passos.map(step => (
                                            <div key={step.numero} className="flex gap-4">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{step.numero}</div>
                                                <div>
                                                    <h5 className="font-semibold">{step.titulo}</h5>
                                                    <p className="text-muted-foreground text-sm">{step.descricao}</p>
                                                </div>
                                            </div>
                                       ))}
                                   </div>
                               </div>
                           )) : (
                            <p className="text-muted-foreground">Nenhum playbook publicado.</p>
                           )}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="training" className="mt-6">
                   <Card>
                        <CardHeader>
                            <CardTitle>Módulos de Treinamento</CardTitle>
                            <CardDescription>Sugestões de treinamento geradas a partir do conteúdo.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           {(trainingModules && trainingModules.length > 0) ? trainingModules.map(module => (
                               <div key={module.id} className="border p-4 rounded-lg">
                                   <h3 className="text-xl font-headline font-semibold">Módulo {module.modulo}: {module.titulo}</h3>
                                   <p className="text-muted-foreground mt-2"><span className="font-semibold">Objetivo:</span> {module.objetivo}</p>
                                   <div className="mt-4 flex gap-4 text-sm">
                                       <Badge variant="secondary">Duração: {module.duracao}</Badge>
                                       <Badge variant="secondary">Formato: {module.formato}</Badge>
                                   </div>
                                    <h5 className="font-semibold mt-4 mb-2">Tópicos abordados:</h5>
                                    <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                                        {module.topicos.map(topic => <li key={topic}>{topic}</li>)}
                                    </ul>
                               </div>
                           )) : (
                            <p className="text-muted-foreground">Nenhum módulo de treinamento publicado.</p>
                           )}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="insights" className="mt-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Insights Gerados</CardTitle>
                            <CardDescription>Gaps, riscos e oportunidades identificados pela IA.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {(insights && insights.length > 0) ? insights.map(insight => (
                               <Alert key={insight.id} variant={insight.tipo === 'risco' ? 'destructive' : 'default'}>
                                    <Lightbulb className="h-4 w-4" />
                                    <AlertTitle className="capitalize">{insight.tipo}</AlertTitle>
                                    <AlertDescription>
                                        {insight.texto}
                                    </AlertDescription>
                                </Alert>
                           )) : (
                             <p className="text-muted-foreground">Nenhum insight encontrado.</p>
                           )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            {versions && versions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Versões</CardTitle>
                        <CardDescription>Linha do tempo de todas as publicações feitas neste workspace.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                           {versions.map(version => (
                                <div key={version.id} className="flex items-center gap-4 text-sm">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                        <Milestone className="h-4 w-4 text-muted-foreground"/>
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-medium">{version.summary}</p>
                                        <p className="text-muted-foreground">Versão {version.version}</p>
                                    </div>
                                    <div className="text-right text-muted-foreground">
                                        {version.createdAt?.toDate ? format(version.createdAt.toDate(), "dd/MM/yyyy") : 'Data indisponível'}
                                    </div>
                                </div>
                           ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
