
'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PublishedKnowledge, Playbook, TrainingModule, Insight, Version, Workspace, BrandKit, Color, Typography as TypographyType } from '@/lib/firestore-types';
import { BookOpen, Lightbulb, Milestone, Palette, Type, Globe, CheckCircle, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { resolveSourceName } from '@/lib/actions/workspace-actions';


// Reusable component to display the source of a generated item
function SourceChip({ workspaceId, batchId }: { workspaceId: string, batchId: string | undefined }) {
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!batchId) {
      setIsLoading(false);
      setSourceName(null);
      return;
    }
    
    let isMounted = true;
    setIsLoading(true);
    
    resolveSourceName(workspaceId, batchId).then(name => {
      if (isMounted) {
        setSourceName(name);
        setIsLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [workspaceId, batchId]);

  if (isLoading) {
    return <Skeleton className="h-6 w-24 mt-2" />;
  }

  if (!sourceName) {
    return null;
  }

  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md w-fit">
      <FileText className="h-3 w-3" />
      <span className="truncate">{sourceName}</span>
    </div>
  );
}


function BrandKitDisplay({ workspace, brandKit, isLoading }: { workspace: Workspace | null, brandKit: BrandKit | null, isLoading: boolean }) {
    React.useEffect(() => {
        if (!brandKit?.typography) return;

        // Use a Set to avoid requesting the same font family multiple times
        const fontFamilies = new Set(brandKit.typography.map(t => t.family.replace(/ /g, '+')));
        
        if (fontFamilies.size === 0) return;

        const queryString = Array.from(fontFamilies).map(family => `family=${family}`).join('&');
        const linkId = 'dynamic-google-fonts-stylesheet';
        const newHref = `https://fonts.googleapis.com/css2?${queryString}&display=swap`;
        
        let link = document.getElementById(linkId) as HTMLLinkElement | null;
        
        // If the link doesn't exist, create it. If it exists, update its href.
        if (link) {
            if (link.href !== newHref) {
                link.href = newHref;
            }
        } else {
            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = newHref;
            document.head.appendChild(link);
        }
    }, [brandKit]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-4 w-2/5" />
                </CardHeader>
                <CardContent className="space-y-8">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        )
    }

    const logos = [
        ...(workspace?.logoUrl ? [{ name: 'Ícone', url: workspace.logoUrl, darkBg: false }] : []),
        ...(brandKit?.logoPrincipalUrl ? [{ name: 'Logo Principal', url: brandKit.logoPrincipalUrl, darkBg: false }] : []),
        ...(brandKit?.logoNegativoUrl ? [{ name: 'Logo Negativo', url: brandKit.logoNegativoUrl, darkBg: true }] : [])
    ];
    
    const hasBrandKitContent = logos.length > 0 || (brandKit?.colorPalette && brandKit.colorPalette.length > 0) || (brandKit?.typography && brandKit.typography.length > 0) || (brandKit?.toneOfVoice && brandKit.toneOfVoice.length > 0);

    if (!hasBrandKitContent && !isLoading) {
        return (
            <Alert>
                <Palette className="h-4 w-4" />
                <AlertTitle>Nenhuma Marca encontrada</AlertTitle>
                <AlertDescription>
                    Nenhuma informação de marca, identidade visual ou comunicação foi encontrada. Adicione documentos sobre sua marca para gerar a seção de Marca.
                </AlertDescription>
            </Alert>
        )
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Marca</CardTitle>
                <CardDescription>A identidade visual e verbal da sua marca, extraída pela IA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 {logos.length > 0 && (
                     <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Globe className="h-5 w-5" /> Logos e Variações</h3>
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {logos.map((logo) => (
                                <div key={logo.name} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border p-4", logo.darkBg ? 'bg-foreground' : 'bg-muted/30')}>
                                     <div className="relative w-24 h-24">
                                        <Image
                                            src={logo.url}
                                            alt={logo.name}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <p className={cn("font-medium text-sm text-center mt-2", logo.darkBg ? 'text-background' : '')}>{logo.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {brandKit?.colorPalette && brandKit.colorPalette.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Palette className="h-5 w-5" /> Paleta de Cores</h3>
                        <div className="flex flex-wrap gap-4">
                            {brandKit.colorPalette.map((color: Color) => (
                                <div key={color.hex} className="flex flex-col items-center gap-2">
                                    <div className="w-20 h-20 rounded-lg shadow-inner border" style={{ backgroundColor: color.hex }} />
                                    <div className="text-center">
                                        <p className="font-medium text-sm">{color.name}</p>
                                        <p className="text-xs text-muted-foreground uppercase font-mono">{color.hex}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                 {brandKit?.typography && brandKit.typography.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Type className="h-5 w-5" /> Tipografia</h3>
                        <div className="space-y-4">
                            {brandKit.typography.map((typo: TypographyType) => (
                                <div key={typo.family + typo.name} className="p-4 rounded-lg bg-muted/50">
                                    <p className="text-sm text-muted-foreground">{typo.name}</p>
                                    <p style={{ fontFamily: typo.family, fontWeight: typo.weight || '400' }} className="text-3xl truncate">{typo.example || 'Aa Bb Cc Dd Ee'}</p>
                                    <p className="text-sm font-mono mt-2">{typo.family}{typo.weight ? `, ${typo.weight}` : ''}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                 {brandKit?.toneOfVoice && brandKit.toneOfVoice.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Lightbulb className="h-5 w-5" /> Tom de Voz</h3>
                        <div className="flex flex-wrap gap-2">
                            {brandKit.toneOfVoice.map((tone: string) => (
                                <Badge key={tone} variant="secondary" className="text-base py-1 px-3">{tone}</Badge>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


// Main component
export default function KnowledgePage() {
    const firestore = useFirestore();
    const params = useParams();
    const { toast } = useToast();
    const workspaceId = params.workspaceId as string;

    // Fetch Workspace to get version and last published date
    const workspaceDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'workspaces', workspaceId) : null, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

    // Fetch the single LIVE published knowledge document.
    const publishedKnowledgeDocRef = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return doc(firestore, `workspaces/${workspaceId}/published_knowledge`, workspaceId);
    }, [firestore, workspaceId]);
    const { data: publishedKnowledge, isLoading: isKnowledgeLoading } = useDoc<PublishedKnowledge>(publishedKnowledgeDocRef);

    // Fetch the single LIVE brand kit document
    const brandKitDocRef = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return doc(firestore, `workspaces/${workspaceId}/brand_kit`, 'live');
    }, [firestore, workspaceId]);
    const { data: brandKit, isLoading: isBrandKitLoading } = useDoc<BrandKit>(brandKitDocRef);

    // Fetch published playbooks
    const playbooksQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/playbooks`), where('status', '==', 'published'));
    }, [firestore, workspaceId]);
    const { data: playbooks, isLoading: isPlaybooksLoading } = useCollection<Playbook>(playbooksQuery);

    // Fetch published training modules
    const trainingModulesQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(
            collection(firestore, `workspaces/${workspaceId}/training_modules`),
            orderBy('modulo', 'asc')
        );
    }, [firestore, workspaceId]);
    const { data: allTrainingModules, isLoading: isTrainingLoading } = useCollection<TrainingModule>(trainingModulesQuery);
    
    // Filter for published modules on the client side
    const trainingModules = React.useMemo(() => 
        allTrainingModules?.filter(module => module.status === 'published'), 
    [allTrainingModules]);


    // Fetch insights (only unresolved ones)
    const insightsQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/insights`), where('resolved', '==', false));
    }, [firestore, workspaceId]);
    const { data: insights, isLoading: isInsightsLoading } = useCollection<Insight>(insightsQuery);

    // Fetch version history
    const versionsQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/versions`), orderBy('version', 'desc'));
    }, [firestore, workspaceId]);
    const { data: versions, isLoading: isVersionsLoading } = useCollection<Version>(versionsQuery);


    const isLoading = isWorkspaceLoading || isKnowledgeLoading || isPlaybooksLoading || isTrainingLoading || isInsightsLoading || isVersionsLoading || isBrandKitLoading;
    
    const handleResolveInsight = (insightId: string) => {
        if (!firestore || !workspaceId) return;
        const insightRef = doc(firestore, `workspaces/${workspaceId}/insights`, insightId);
        updateDocumentNonBlocking(insightRef, { resolved: true });
        toast({
            title: "Insight Resolvido",
            description: "O insight foi marcado como resolvido e removido da lista.",
        });
    };

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
    
    if (!publishedKnowledge && !brandKit && !workspace?.logoUrl && !isLoading) {
         return (
            <div className="p-12">
                <Alert variant="default" className="bg-secondary">
                    <BookOpen className="h-4 w-4" />
                    <AlertTitle>Conhecimento não publicado</AlertTitle>
                    <AlertDescription>
                        Este workspace ainda não possui conhecimento publicado. Adicione conteúdo e gere um rascunho para começar.
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
                    <h1 className="text-4xl font-bold tracking-tight">Conhecimento</h1>
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
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="knowledge">Conhecimento</TabsTrigger>
                    <TabsTrigger value="brandkit">Marca</TabsTrigger>
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
                             {!publishedKnowledge?.categories && <p className="text-muted-foreground">Nenhum conhecimento operacional publicado.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="brandkit" className="mt-6">
                   <BrandKitDisplay workspace={workspace} brandKit={brandKit} isLoading={isLoading} />
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
                                   {playbook.sourceBatchId && <div className="mt-2"><SourceChip workspaceId={workspaceId} batchId={playbook.sourceBatchId} /></div>}
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
                                   {module.sourceBatchId && <div className="mt-2"><SourceChip workspaceId={workspaceId} batchId={module.sourceBatchId} /></div>}
                                   <p className="text-muted-foreground mt-2"><span className="font-semibold">Objetivo:</span> {module.objetivo}</p>
                                   <div className="mt-4 flex gap-4 text-sm">
                                       <Badge variant="secondary">Duração: {module.duracao}</Badge>
                                       <Badge variant="secondary">Formato: {module.formato}</Badge>
                                   </div>
                                    <h5 className="font-semibold mt-4 mb-2">Tópicos abordados:</h5>
                                    <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                                        {module.topicos.map(topic => <li key={topic}>{topic}</li>)}
                                    </ul>
                                    <div className="mt-6 bg-secondary/50 p-3 rounded-md">
                                        <h4 className="font-semibold text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Próximos Passos</h4>
                                        <p className="text-sm text-muted-foreground mt-2">Use este roteiro sugerido pela IA como base para criar o material final do seu treinamento, seja em formato de vídeo, apresentação ou um guia prático.</p>
                                    </div>
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
                            <CardTitle>Insights Acionáveis</CardTitle>
                            <CardDescription>Gaps, riscos e oportunidades identificados pela IA. Resolva-os para removê-los da lista.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {(insights && insights.length > 0) ? insights.map(insight => (
                               <Alert key={insight.id} variant={insight.tipo === 'risco' ? 'destructive' : 'default'}>
                                   <div className="flex items-start justify-between">
                                       <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Lightbulb className="h-4 w-4" />
                                                <AlertTitle className="capitalize">{insight.tipo}</AlertTitle>
                                            </div>
                                            <AlertDescription>
                                                {insight.texto}
                                            </AlertDescription>
                                            <SourceChip workspaceId={workspaceId} batchId={insight.sourceBatchId} />
                                       </div>
                                       <Button variant="ghost" size="sm" onClick={() => handleResolveInsight(insight.id)} className="ml-4 shrink-0">
                                           <CheckCircle className="mr-2 h-4 w-4" />
                                           Resolver
                                       </Button>
                                   </div>
                                </Alert>
                           )) : (
                            <div className="text-center p-8 border rounded-lg bg-card/50">
                                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                                <h3 className="mt-4 text-lg font-medium">Tudo em ordem!</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Nenhum insight pendente de resolução.</p>
                            </div>
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
