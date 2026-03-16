
'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, updateDoc, writeBatch } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Trash2, Plus, GripVertical, AlertTriangle, Palette, Globe, Type, Lightbulb } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DraftKnowledge, Playbook, TrainingModule, Insight, Workspace, BrandKit, Color, Typography as TypographyType } from '@/lib/firestore-types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { publishDraft } from '@/lib/actions/workspace-actions';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const knowledgeItemSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  detalhes: z.string().optional(),
});

const knowledgeCategorySchema = z.object({
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  icone: z.string().min(1, 'Ícone é obrigatório'),
  itens: z.array(knowledgeItemSchema),
});

const playbookStepSchema = z.object({
  numero: z.number().int(),
  titulo: z.string().min(1, "Título do passo é obrigatório"),
  descricao: z.string().min(1, "Descrição do passo é obrigatória"),
});

const playbookSchema = z.object({
  id: z.string(), // Keep the ID to update the correct doc
  processo: z.string().min(1, "Nome do processo é obrigatório"),
  passos: z.array(playbookStepSchema),
});

const trainingModuleSchema = z.object({
  id: z.string(),
  modulo: z.number().int(),
  titulo: z.string().min(1, "Título do módulo é obrigatório"),
  duracao: z.string().min(1, "Duração é obrigatória"),
  objetivo: z.string().min(1, "Objetivo é obrigatório"),
  topicos: z.array(z.string().min(1, "Tópico não pode ser vazio")),
  formato: z.enum(['presencial', 'vídeo', 'slides', 'prático']),
});

const formSchema = z.object({
  categories: z.array(knowledgeCategorySchema),
  playbooks: z.array(playbookSchema),
  trainingModules: z.array(trainingModuleSchema),
});

type FormValues = z.infer<typeof formSchema>;

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
             <div className="space-y-8">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
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
                <AlertTitle>Nenhum Brand Kit proposto</AlertTitle>
                <AlertDescription>
                    Nenhuma informação de marca foi extraída neste lote.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-8">
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
        </div>
    );
}

function PlaybookEditor({ control }: { control: any }) {
  const { fields } = useFieldArray({
    control,
    name: "playbooks",
  });

  return (
    <div className="space-y-6">
      {fields.map((playbookField, playbookIndex) => (
        <div key={playbookField.id} className="border-b pb-6 last:border-b-0">
          <FormField
            control={control}
            name={`playbooks.${playbookIndex}.processo`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl font-headline font-semibold">Nome do Processo</FormLabel>
                <FormControl>
                  <Input {...field} className="text-xl font-headline font-semibold" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="mt-4 space-y-4">
            <PlaybookSteps control={control} playbookIndex={playbookIndex} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaybookSteps({ control, playbookIndex }: { control: any, playbookIndex: number }) {
  const { fields } = useFieldArray({
    control,
    name: `playbooks.${playbookIndex}.passos`,
  });

  return (
    <>
      {fields.map((stepField, stepIndex) => (
        <div key={stepField.id} className="flex gap-4 items-start">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold flex-shrink-0 mt-1">
            {control.getValues(`playbooks.${playbookIndex}.passos.${stepIndex}.numero`)}
          </div>
          <div className="flex-1 space-y-2">
            <FormField
              control={control}
              name={`playbooks.${playbookIndex}.passos.${stepIndex}.titulo`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} placeholder="Título do passo" className="font-semibold" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`playbooks.${playbookIndex}.passos.${stepIndex}.descricao`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} placeholder="Descrição do passo" className="text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      ))}
    </>
  );
}

function TrainingModuleTopics({ control, moduleIndex }: { control: any; moduleIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `trainingModules.${moduleIndex}.topicos`,
  });

  return (
    <div className="space-y-2 mt-2">
      {fields.map((topicField, topicIndex) => (
        <div key={topicField.id} className="flex items-center gap-2">
          <FormField
            control={control}
            name={`trainingModules.${moduleIndex}.topicos.${topicIndex}`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input {...field} placeholder="Descreva o tópico" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(topicIndex)}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append('')}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar Tópico
      </Button>
    </div>
  );
}


function TrainingModuleEditor({ control }: { control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "trainingModules",
  });

  return (
    <div className="space-y-6">
      {fields.map((moduleField, moduleIndex) => (
        <div key={moduleField.id} className="border p-4 rounded-lg bg-card/50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-headline font-semibold">
                Módulo {control.getValues(`trainingModules.${moduleIndex}.modulo`)}
            </h3>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(moduleIndex)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="space-y-4">
            <FormField
                control={control}
                name={`trainingModules.${moduleIndex}.titulo`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Título do Módulo</FormLabel>
                    <FormControl><Input {...field} placeholder="Ex: Onboarding de Vendas" /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`trainingModules.${moduleIndex}.objetivo`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Objetivo</FormLabel>
                    <FormControl><Textarea {...field} placeholder="O que o colaborador poderá fazer após este módulo?" /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`trainingModules.${moduleIndex}.duracao`}
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Duração</FormLabel>
                        <FormControl><Input {...field} placeholder="Ex: 45 min" /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name={`trainingModules.${moduleIndex}.formato`}
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Formato</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione um formato" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="presencial">Presencial</SelectItem>
                                <SelectItem value="vídeo">Vídeo</SelectItem>
                                <SelectItem value="slides">Slides</SelectItem>
                                <SelectItem value="prático">Prático</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
             </div>
             <div>
                <FormLabel>Tópicos Abordados</FormLabel>
                <TrainingModuleTopics control={control} moduleIndex={moduleIndex} />
             </div>
          </div>
        </div>
      ))}
       <Button type="button" variant="outline" size="sm" className="mt-6" 
        onClick={() => append({
            id: crypto.randomUUID(), // Temp ID
            modulo: fields.length + 1,
            titulo: 'Novo Módulo',
            objetivo: '',
            duracao: '30 min',
            formato: 'slides',
            topicos: []
        })}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar Módulo de Treinamento
    </Button>
    </div>
  );
}



export default function ReviewPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const workspaceId = params.workspaceId as string;

    const [isPublishing, setIsPublishing] = useState(false);
    
    const workspaceDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'workspaces', workspaceId) : null, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

    // Fetch the draft knowledge document
    const draftQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(
            collection(firestore, `workspaces/${workspaceId}/draft_knowledge`),
            where('status', '==', 'draft')
        );
    }, [firestore, workspaceId]);
    
    const { data: drafts, isLoading: isDraftLoading } = useCollection<DraftKnowledge>(draftQuery);
    const draft = drafts?.[0];

    // Fetch related draft entities
    const playbooksQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId || !draft?.sourceBatchId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/playbooks`), where('sourceBatchId', '==', draft.sourceBatchId));
    }, [firestore, workspaceId, draft?.sourceBatchId]);
    const { data: playbooks, isLoading: isPlaybooksLoading } = useCollection<Playbook>(playbooksQuery);

    const trainingModulesQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId || !draft?.sourceBatchId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/training_modules`), where('sourceBatchId', '==', draft.sourceBatchId));
    }, [firestore, workspaceId, draft?.sourceBatchId]);
    const { data: trainingModules, isLoading: isTrainingLoading } = useCollection<TrainingModule>(trainingModulesQuery);
    
    const brandKitDraftRef = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return doc(firestore, `workspaces/${workspaceId}/brand_kit`, 'draft');
    }, [firestore, workspaceId]);
    const { data: brandKitDraft, isLoading: isBrandKitLoading } = useDoc<BrandKit>(brandKitDraftRef);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            categories: [],
            playbooks: [],
            trainingModules: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'categories',
    });

    // Populate form with fetched draft data
    useEffect(() => {
        if (draft) {
             const mappedTrainingModules = trainingModules ? trainingModules.map(tm => ({
                id: tm.id,
                modulo: tm.modulo,
                titulo: tm.titulo,
                duracao: tm.duracao,
                objetivo: tm.objetivo,
                topicos: tm.topicos || [],
                formato: tm.formato || 'slides',
            })) : [];

            form.reset({
                categories: draft.categories || [],
                playbooks: playbooks || [],
                trainingModules: mappedTrainingModules,
            });
        }
    }, [draft, playbooks, trainingModules, form]);

    const handleSaveChanges = async (values: FormValues) => {
        if (!draft || !firestore) return;
        try {
            const batch = writeBatch(firestore);

            // Update DraftKnowledge doc
            const draftRef = doc(firestore, `workspaces/${workspaceId}/draft_knowledge`, draft.id);
            batch.update(draftRef, { categories: values.categories });

            // Update Playbook docs
            if (values.playbooks) {
                values.playbooks.forEach(playbook => {
                    const playbookRef = doc(firestore, `workspaces/${workspaceId}/playbooks`, playbook.id);
                    const { id, ...playbookData } = playbook; // Exclude ID from data payload
                    batch.update(playbookRef, playbookData);
                });
            }
             // Update TrainingModule docs
            if (values.trainingModules) {
                 values.trainingModules.forEach(module => {
                    const moduleRef = doc(firestore, `workspaces/${workspaceId}/training_modules`, module.id);
                    const { id, ...moduleData } = module;
                    batch.update(moduleRef, moduleData);
                });
            }
            
            await batch.commit();

            toast({ title: 'Rascunho salvo!', description: 'Suas alterações foram salvas.' });
        } catch (error) {
            console.error('Error saving draft:', error);
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: (error as Error).message });
        }
    };

    const handlePublish = async () => {
        if (!draft || !user) return;
        setIsPublishing(true);
        toast({ title: 'Publicando...', description: 'Sua base de conhecimento está sendo publicada.' });
        try {
            await form.handleSubmit(handleSaveChanges)(); // Save any pending changes before publishing
            await publishDraft(workspaceId, draft.id, user.uid);
            toast({ title: 'Sucesso!', description: 'A base de conhecimento foi publicada.' });
            router.push(`/dashboard/${workspaceId}/knowledge`);
        } catch (error) {
            console.error('Error publishing draft:', error);
            toast({ variant: 'destructive', title: 'Erro ao publicar', description: (error as Error).message });
            setIsPublishing(false);
        }
    };

    const isLoading = isWorkspaceLoading || isDraftLoading || isPlaybooksLoading || isTrainingLoading || isBrandKitLoading;

    if (isLoading && !draft) {
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
    
    if (!draft && !isDraftLoading) {
        return (
            <div className="p-12">
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Nenhum rascunho encontrado</AlertTitle>
                    <AlertDescription>
                        Não há nenhum rascunho para revisar no momento. Gere um novo rascunho na página de ingestão de conteúdo.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="p-12 space-y-10">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Revisão do Rascunho</h1>
                <p className="text-muted-foreground mt-2">
                    Revise, edite e aprove o conteúdo gerado pela IA antes de publicar.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Base de Conhecimento</CardTitle>
                            <CardDescription>Edite as categorias e itens gerados.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" defaultValue={draft?.categories.map(c => c.categoria)} className="w-full">
                                {fields.map((categoryField, categoryIndex) => (
                                    <AccordionItem key={categoryField.id} value={form.getValues(`categories.${categoryIndex}.categoria`)}>
                                        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                                            <div className="flex items-center gap-4 flex-1">
                                                 <Controller
                                                    control={form.control}
                                                    name={`categories.${categoryIndex}.icone`}
                                                    render={({ field }) => <Input {...field} className="w-16 text-2xl p-2 h-auto text-center bg-secondary" />}
                                                />
                                                 <Controller
                                                    control={form.control}
                                                    name={`categories.${categoryIndex}.categoria`}
                                                    render={({ field }) => <Input {...field} className="text-lg font-semibold border-none shadow-none p-0 focus-visible:ring-0" />}
                                                />
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pl-4 border-l-2 ml-8">
                                            <CategoryItems control={form.control} categoryIndex={categoryIndex} />
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                             <Button type="button" variant="outline" size="sm" className="mt-6" onClick={() => append({ categoria: 'Nova Categoria', icone: '✨', itens: [] })}>
                                <Plus className="mr-2 h-4 w-4" /> Adicionar Categoria
                            </Button>
                        </CardContent>
                    </Card>

                    {(isBrandKitLoading || brandKitDraft) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Brand Kit Proposto</CardTitle>
                                <CardDescription>Esta é a identidade visual e verbal que a IA extraiu. Ela será publicada junto com a base de conhecimento.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isBrandKitLoading ? <Skeleton className="h-48 w-full" /> : 
                                    <BrandKitDisplay workspace={workspace} brandKit={brandKitDraft} isLoading={isBrandKitLoading} />
                                }
                            </CardContent>
                        </Card>
                    )}
                    
                    {/* Playbooks Section */}
                    {(isPlaybooksLoading || (playbooks && playbooks.length > 0)) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Playbooks Propostos</CardTitle>
                                <CardDescription>Estes são os processos passo a passo identificados pela IA. Você pode editá-los antes de publicar.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isPlaybooksLoading ? <Skeleton className="h-24 w-full" /> : 
                                    <PlaybookEditor control={form.control} />
                                }
                            </CardContent>
                        </Card>
                    )}


                    {/* Training Modules Section */}
                    {(isTrainingLoading || (trainingModules && trainingModules.length > 0)) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Módulos de Treinamento Sugeridos</CardTitle>
                                <CardDescription>Estes são os treinamentos que a IA sugere criar. Agora você pode editá-los antes de publicar.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isTrainingLoading ? <Skeleton className="h-24 w-full" /> : 
                                    <TrainingModuleEditor control={form.control} />
                                }
                            </CardContent>
                        </Card>
                    )}
                    
                    <div className="flex justify-end gap-4">
                        <Button type="submit" variant="secondary" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                            Salvar Rascunho
                        </Button>
                        <Button size="lg" onClick={handlePublish} disabled={isPublishing}>
                            {isPublishing ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                            Publicar Base
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}

// Sub-component to manage items within a category
function CategoryItems({ control, categoryIndex }: { control: any, categoryIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `categories.${categoryIndex}.itens`,
  });

  return (
    <div className="space-y-6 pt-4">
      {fields.map((itemField, itemIndex) => (
        <div key={itemField.id} className="space-y-2 rounded-md border p-4 bg-background/50 relative pr-12">
            <FormLabel>Título</FormLabel>
            <Controller
                control={control}
                name={`categories.${categoryIndex}.itens.${itemIndex}.titulo`}
                render={({ field }) => <Input {...field} placeholder="Título do item" />}
            />
             <FormLabel>Descrição (resumo para UI)</FormLabel>
             <Controller
                control={control}
                name={`categories.${categoryIndex}.itens.${itemIndex}.descricao`}
                render={({ field }) => <Textarea {...field} placeholder="Descrição curta e objetiva do item" />}
            />
             <FormLabel>Detalhes (conteúdo para IA)</FormLabel>
             <Controller
                control={control}
                name={`categories.${categoryIndex}.itens.${itemIndex}.detalhes`}
                render={({ field }) => <Textarea {...field} placeholder="Conteúdo completo e estruturado para o assistente de IA..." className="min-h-[120px] font-mono text-xs" />}
            />
            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(itemIndex)}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ titulo: '', descricao: '', detalhes: '' })}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar Item
      </Button>
    </div>
  );
}

