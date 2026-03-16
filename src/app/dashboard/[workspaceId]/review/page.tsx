
'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, updateDoc, writeBatch, setDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Trash2, Plus, GripVertical, AlertTriangle, Palette, Globe, Type, Lightbulb, Users, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DraftKnowledge, Playbook, TrainingModule, Insight, Workspace, BrandKit, Color, Typography as TypographyType, OrgChart, OrgChartNode } from '@/lib/firestore-types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { publishDraft } from '@/lib/actions/workspace-actions';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { refineText } from '@/lib/actions/ai-actions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';

// Schemas for form validation
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
  id: z.string(),
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

const colorSchema = z.object({
    name: z.string().min(1, 'Nome da cor é obrigatório'),
    hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Formato de cor inválido (ex: #RRGGBB)'),
});

const typographySchema = z.object({
    name: z.string().min(1, 'O uso da fonte é obrigatório'),
    family: z.string().min(1, 'A família da fonte é obrigatória'),
    weight: z.string().optional(),
    example: z.string().optional(),
});

const brandKitSchema = z.object({
    colorPalette: z.array(colorSchema).optional(),
    typography: z.array(typographySchema).optional(),
    toneOfVoice: z.array(z.string().min(1, "O tom de voz não pode ser vazio")).optional(),
});

const orgChartNodeSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1, "O nome do cargo/pessoa é obrigatório"),
    title: z.string().optional(),
    parentId: z.string().optional(),
});

const orgChartSchema = z.object({
    nodes: z.array(orgChartNodeSchema).optional(),
});

const formSchema = z.object({
  categories: z.array(knowledgeCategorySchema),
  playbooks: z.array(playbookSchema),
  trainingModules: z.array(trainingModuleSchema),
  brandKit: brandKitSchema.optional(),
  organizationalChart: orgChartSchema.optional(),
});

type FormValues = z.infer<typeof formSchema>;


// Editor Components
function BrandKitEditor({ control }: { control: any }) {
    const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({ control, name: "brandKit.colorPalette" });
    const { fields: typoFields, append: appendTypo, remove: removeTypo } = useFieldArray({ control, name: "brandKit.typography" });
    const { fields: toneFields, append: appendTone, remove: removeTone } = useFieldArray({ control, name: "brandKit.toneOfVoice" });

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Palette className="h-5 w-5" /> Paleta de Cores</h3>
                <div className="space-y-4">
                    {colorFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 p-3 border rounded-md">
                            <FormField control={control} name={`brandKit.colorPalette.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} placeholder="Ex: Primária" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={control} name={`brandKit.colorPalette.${index}.hex`} render={({ field }) => ( <FormItem><FormLabel>Hex</FormLabel><FormControl><Input {...field} placeholder="#FF5733" /></FormControl><FormMessage /></FormItem> )} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeColor(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendColor({ name: '', hex: '#000000' })}> <Plus className="mr-2 h-4 w-4" /> Adicionar Cor</Button>
                </div>
            </div>
            <Separator />
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Type className="h-5 w-5" /> Tipografia</h3>
                 <div className="space-y-4">
                    {typoFields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-md space-y-2">
                             <div className="grid grid-cols-2 gap-2">
                                <FormField control={control} name={`brandKit.typography.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Uso</FormLabel><FormControl><Input {...field} placeholder="Títulos" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={control} name={`brandKit.typography.${index}.family`} render={({ field }) => ( <FormItem><FormLabel>Família da Fonte</FormLabel><FormControl><Input {...field} placeholder="Montserrat" /></FormControl><FormMessage /></FormItem> )} />
                             </div>
                             <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                                <FormField control={control} name={`brandKit.typography.${index}.weight`} render={({ field }) => ( <FormItem><FormLabel>Peso</FormLabel><FormControl><Input {...field} placeholder="700" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={control} name={`brandKit.typography.${index}.example`} render={({ field }) => ( <FormItem><FormLabel>Exemplo</FormLabel><FormControl><Input {...field} placeholder="Exemplo de Texto" /></FormControl><FormMessage /></FormItem> )} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeTypo(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendTypo({ name: '', family: '', weight: '400', example: '' })}> <Plus className="mr-2 h-4 w-4" /> Adicionar Fonte</Button>
                </div>
            </div>
            <Separator />
             <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Lightbulb className="h-5 w-5" /> Tom de Voz</h3>
                 <div className="space-y-2">
                    {toneFields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                            <FormField control={control} name={`brandKit.toneOfVoice.${index}`} render={({ field }) => ( <FormItem className="flex-1"><FormLabel className="sr-only">Tom de Voz {index + 1}</FormLabel><FormControl><Input {...field} placeholder="Adjetivo ou frase..." /></FormControl><FormMessage /></FormItem> )} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTone(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendTone('')}> <Plus className="mr-2 h-4 w-4" /> Adicionar Tom</Button>
                </div>
            </div>
        </div>
    );
}

function OrgChartEditor({ control }: { control: any }) {
    const { fields, append, remove } = useFieldArray({ control, name: "organizationalChart.nodes" });

    return (
        <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-md grid grid-cols-4 gap-x-2 text-sm font-medium text-muted-foreground">
                <p>ID do Nó (não editável)</p>
                <p>Nome (Pessoa/Departamento)</p>
                <p>Cargo/Título</p>
                <p>ID do Pai (Hierarquia)</p>
            </div>
            {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-start gap-2">
                    <FormField control={control} name={`organizationalChart.nodes.${index}.id`} render={({ field }) => ( <FormItem><FormLabel className="sr-only">ID do Nó</FormLabel><FormControl><Input {...field} disabled className="font-mono text-xs" /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={control} name={`organizationalChart.nodes.${index}.name`} render={({ field }) => ( <FormItem><FormLabel className="sr-only">Nome (Pessoa/Departamento)</FormLabel><FormControl><Input {...field} placeholder="João Silva" /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={control} name={`organizationalChart.nodes.${index}.title`} render={({ field }) => ( <FormItem><FormLabel className="sr-only">Cargo/Título</FormLabel><FormControl><Input {...field} placeholder="Diretor de Vendas" /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={control} name={`organizationalChart.nodes.${index}.parentId`} render={({ field }) => ( <FormItem><FormLabel className="sr-only">ID do Pai</FormLabel><FormControl><Input {...field} placeholder="ceo" className="font-mono text-xs" /></FormControl><FormMessage /></FormItem> )} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `node-${Date.now()}`, name: 'Nova Posição', title: '', parentId: '' })}> <Plus className="mr-2 h-4 w-4" /> Adicionar Nó</Button>
        </div>
    );
}

function PlaybookEditor({ control }: { control: any }) {
  const { fields } = useFieldArray({ control, name: "playbooks" });

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

function PlaybookSteps({ control, playbookIndex }: { control: any; playbookIndex: number }) {
  const { fields } = useFieldArray({ control, name: `playbooks.${playbookIndex}.passos` });

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
                  <FormLabel>Título do passo</FormLabel>
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
                  <FormLabel>Descrição do passo</FormLabel>
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
  const { fields, append, remove } = useFieldArray({ control, name: `trainingModules.${moduleIndex}.topicos` });

  return (
    <div className="space-y-2 mt-2">
      {fields.map((topicField, topicIndex) => (
        <div key={topicField.id} className="flex items-center gap-2">
          <FormField
            control={control}
            name={`trainingModules.${moduleIndex}.topicos.${topicIndex}`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Tópico {topicIndex + 1}</FormLabel>
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
  const { fields, append, remove } = useFieldArray({ control, name: "trainingModules" });

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
                  <FormControl>
                    <Input {...field} placeholder="Ex: Onboarding de Vendas" />
                  </FormControl>
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
                  <FormControl>
                    <Textarea {...field} placeholder="O que o colaborador poderá fazer após este módulo?" />
                  </FormControl>
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
                    <FormControl>
                      <Input {...field} placeholder="Ex: 45 min" />
                    </FormControl>
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
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um formato" />
                        </SelectTrigger>
                      </FormControl>
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
              <Label>Tópicos Abordados</Label>
              <TrainingModuleTopics control={control} moduleIndex={moduleIndex} />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-6"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            modulo: fields.length + 1,
            titulo: 'Novo Módulo',
            objetivo: '',
            duracao: '30 min',
            formato: 'slides',
            topicos: [],
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" /> Adicionar Módulo
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
    
    // Data Fetching
    const workspaceDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'workspaces', workspaceId) : null, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

    const draftQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/draft_knowledge`), where('status', '==', 'draft')) : null, [firestore, workspaceId]);
    const { data: drafts, isLoading: isDraftLoading } = useCollection<DraftKnowledge>(draftQuery);
    const draft = drafts?.[0];

    const playbooksQuery = useMemoFirebase(() => !firestore || !draft?.sourceBatchId ? null : query(collection(firestore, `workspaces/${workspaceId}/playbooks`), where('sourceBatchId', '==', draft.sourceBatchId)), [firestore, draft?.sourceBatchId]);
    const { data: playbooks, isLoading: isPlaybooksLoading } = useCollection<Playbook>(playbooksQuery);

    const trainingModulesQuery = useMemoFirebase(() => !firestore || !draft?.sourceBatchId ? null : query(collection(firestore, `workspaces/${workspaceId}/training_modules`), where('sourceBatchId', '==', draft.sourceBatchId)), [firestore, draft?.sourceBatchId]);
    const { data: trainingModules, isLoading: isTrainingLoading } = useCollection<TrainingModule>(trainingModulesQuery);
    
    const brandKitDraftRef = useMemoFirebase(() => firestore ? doc(firestore, `workspaces/${workspaceId}/brand_kit`, 'draft') : null, [firestore, workspaceId]);
    const { data: brandKitDraft, isLoading: isBrandKitLoading } = useDoc<BrandKit>(brandKitDraftRef);

    const orgChartDraftRef = useMemoFirebase(() => firestore ? doc(firestore, `workspaces/${workspaceId}/org_charts`, 'draft') : null, [firestore, workspaceId]);
    const { data: orgChartDraft, isLoading: isOrgChartLoading } = useDoc<OrgChart>(orgChartDraftRef);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            categories: [], playbooks: [], trainingModules: [],
            brandKit: { colorPalette: [], typography: [], toneOfVoice: [] },
            organizationalChart: { nodes: [] },
        },
    });

    const { fields: categoryFields, append: appendCategory } = useFieldArray({ control: form.control, name: 'categories' });

    useEffect(() => {
        if (draft || playbooks || trainingModules || brandKitDraft || orgChartDraft) {
             const mappedTrainingModules = trainingModules ? trainingModules.map(tm => ({ id: tm.id, modulo: tm.modulo, titulo: tm.titulo, duracao: tm.duracao, objetivo: tm.objetivo, topicos: tm.topicos || [], formato: tm.formato || 'slides' })) : [];
            form.reset({
                categories: draft?.categories || [],
                playbooks: playbooks || [],
                trainingModules: mappedTrainingModules,
                brandKit: brandKitDraft ? { colorPalette: brandKitDraft.colorPalette || [], typography: brandKitDraft.typography || [], toneOfVoice: brandKitDraft.toneOfVoice || [] } : undefined,
                organizationalChart: orgChartDraft ? { nodes: orgChartDraft.nodes || [] } : undefined,
            });
        }
    }, [draft, playbooks, trainingModules, brandKitDraft, orgChartDraft, form]);

    const handleSaveChanges = async (values: FormValues) => {
        if (!draft || !firestore) return;
        try {
            const batch = writeBatch(firestore);
            const draftRef = doc(firestore, `workspaces/${workspaceId}/draft_knowledge`, draft.id);
            batch.update(draftRef, { categories: values.categories });

            if (values.playbooks) { values.playbooks.forEach(playbook => { const playbookRef = doc(firestore, `workspaces/${workspaceId}/playbooks`, playbook.id); const { id, ...playbookData } = playbook; batch.update(playbookRef, playbookData); }); }
            if (values.trainingModules) { values.trainingModules.forEach(module => { const moduleRef = doc(firestore, `workspaces/${workspaceId}/training_modules`, module.id); const { id, ...moduleData } = module; batch.update(moduleRef, moduleData); }); }
            if (values.brandKit) { const brandKitRef = doc(firestore, `workspaces/${workspaceId}/brand_kit`, 'draft'); batch.set(brandKitRef, values.brandKit, { merge: true }); }
            if (values.organizationalChart) { const orgChartRef = doc(firestore, `workspaces/${workspaceId}/org_charts`, 'draft'); batch.set(orgChartRef, values.organizationalChart, { merge: true }); }
            
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
            await form.handleSubmit(handleSaveChanges)();
            await publishDraft(workspaceId, draft.id, user.uid);
            toast({ title: 'Sucesso!', description: 'A base de conhecimento foi publicada.' });
            router.push(`/dashboard/${workspaceId}/knowledge`);
        } catch (error) {
            console.error('Error publishing draft:', error);
            toast({ variant: 'destructive', title: 'Erro ao publicar', description: (error as Error).message });
            setIsPublishing(false);
        }
    };

    const isLoading = isWorkspaceLoading || isDraftLoading || isPlaybooksLoading || isTrainingLoading || isBrandKitLoading || isOrgChartLoading;

    if (isLoading && !draft) { return ( <div className="p-12 space-y-6"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-4 w-2/3" /> <Card> <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader> <CardContent className="space-y-4"> <Skeleton className="h-12 w-full" /> <Skeleton className="h-12 w-full" /> </CardContent> </Card> </div> ); }
    
    if (!draft && !isDraftLoading) { return ( <div className="p-12"> <Alert> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Nenhum rascunho encontrado</AlertTitle> <AlertDescription> Não há nenhum rascunho para revisar no momento. Gere um novo rascunho na página de ingestão de conteúdo. </AlertDescription> </Alert> </div> ) }

    return (
        <div className="p-12 space-y-10">
            <div> <h1 className="text-4xl font-bold tracking-tight">Revisão do Rascunho</h1> <p className="text-muted-foreground mt-2"> Revise, edite e aprove o conteúdo gerado pela IA antes de publicar. </p> </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-8">
                    <Card>
                        <CardHeader> <CardTitle>Base de Conhecimento</CardTitle> <CardDescription>Edite as categorias e itens gerados.</CardDescription> </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" defaultValue={draft?.categories.map(c => c.categoria)} className="w-full">
                                {categoryFields.map((categoryField, categoryIndex) => (
                                    <AccordionItem key={categoryField.id} value={form.getValues(`categories.${categoryIndex}.categoria`)}>
                                        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                                            <div className="flex items-center gap-4 flex-1">
                                                 <Controller control={form.control} name={`categories.${categoryIndex}.icone`} render={({ field }) => <Input {...field} className="w-16 text-2xl p-2 h-auto text-center bg-secondary" />} />
                                                 <Controller control={form.control} name={`categories.${categoryIndex}.categoria`} render={({ field }) => <Input {...field} className="text-lg font-semibold border-none shadow-none p-0 focus-visible:ring-0" />} />
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pl-4 border-l-2 ml-8"> <CategoryItems control={form.control} categoryIndex={categoryIndex} /> </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                             <Button type="button" variant="outline" size="sm" className="mt-6" onClick={() => appendCategory({ categoria: 'Nova Categoria', icone: '✨', itens: [] })}> <Plus className="mr-2 h-4 w-4" /> Adicionar Categoria </Button>
                        </CardContent>
                    </Card>

                    {(isBrandKitLoading || brandKitDraft) && (
                        <Card>
                            <CardHeader> <CardTitle>Brand Kit Proposto</CardTitle> <CardDescription>Esta é a identidade visual e verbal que a IA extraiu. Edite ou aprove como está.</CardDescription> </CardHeader>
                            <CardContent> {isBrandKitLoading ? <Skeleton className="h-48 w-full" /> : <BrandKitEditor control={form.control} />} </CardContent>
                        </Card>
                    )}

                    {(isOrgChartLoading || orgChartDraft) && (
                        <Card>
                            <CardHeader> <CardTitle>Organograma Proposto</CardTitle> <CardDescription>Esta é a estrutura hierárquica que a IA detectou. Ajuste os cargos e relações.</CardDescription> </CardHeader>
                            <CardContent> {isOrgChartLoading ? <Skeleton className="h-48 w-full" /> : <OrgChartEditor control={form.control} />} </CardContent>
                        </Card>
                    )}
                    
                    {(isPlaybooksLoading || (playbooks && playbooks.length > 0)) && (
                        <Card>
                            <CardHeader> <CardTitle>Playbooks Propostos</CardTitle> <CardDescription>Estes são os processos passo a passo identificados pela IA. Você pode editá-los antes de publicar.</CardDescription> </CardHeader>
                            <CardContent> {isPlaybooksLoading ? <Skeleton className="h-24 w-full" /> : <PlaybookEditor control={form.control} />} </CardContent>
                        </Card>
                    )}

                    {(isTrainingLoading || (trainingModules && trainingModules.length > 0)) && (
                        <Card>
                            <CardHeader> <CardTitle>Módulos de Treinamento Sugeridos</CardTitle> <CardDescription>Estes são os treinamentos que a IA sugere criar. Agora você pode editá-los antes de publicar.</CardDescription> </CardHeader>
                            <CardContent> {isTrainingLoading ? <Skeleton className="h-24 w-full" /> : <TrainingModuleEditor control={form.control} />} </CardContent>
                        </Card>
                    )}
                    
                    <div className="flex justify-end gap-4">
                        <Button type="submit" variant="secondary" disabled={form.formState.isSubmitting}> {form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />} Salvar Rascunho </Button>
                        <Button size="lg" onClick={handlePublish} disabled={isPublishing}> {isPublishing ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />} Publicar Base </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}

function CategoryItems({ control, categoryIndex }: { control: any, categoryIndex: number }) {
  const { fields, append, remove } = useFieldArray({ control, name: `categories.${categoryIndex}.itens` });
  const { getValues, setValue } = useFormContext();
  const { toast } = useToast();
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);

  const handleRefine = async (
    itemIndex: number,
    refinementType: 'clarify' | 'simplify' | 'expand' | 'summarize'
  ) => {
    setRefiningIndex(itemIndex);
    const fieldName = `categories.${categoryIndex}.itens.${itemIndex}.detalhes`;
    const currentText = getValues(fieldName);

    if (!currentText || currentText.trim().length < 10) {
        toast({
            variant: "destructive",
            title: "Texto muito curto",
            description: "Escreva um pouco mais antes de usar a IA para refinar.",
        });
        setRefiningIndex(null);
        return;
    }

    try {
        const result = await refineText({
            textToRefine: currentText,
            refinementType: refinementType,
        });
        setValue(fieldName, result.refinedText, { shouldDirty: true });
        toast({
            title: "Texto refinado!",
            description: "O conteúdo foi atualizado pela IA.",
        });
    } catch (error) {
        console.error("Error refining text:", error);
        toast({
            variant: "destructive",
            title: "Erro ao refinar texto",
            description: (error as Error).message,
        });
    } finally {
        setRefiningIndex(null);
    }
  };


  return (
    <div className="space-y-6 pt-4">
      {fields.map((itemField, itemIndex) => {
        const isRefining = refiningIndex === itemIndex;
        return (
          <div key={itemField.id} className="space-y-4 rounded-md border p-4 bg-background/50 relative pr-12">
            <FormField
              control={control}
              name={`categories.${categoryIndex}.itens.${itemIndex}.titulo`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Título do item" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={control}
              name={`categories.${categoryIndex}.itens.${itemIndex}.descricao`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (resumo para UI)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Descrição curta e objetiva do item" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={control}
              name={`categories.${categoryIndex}.itens.${itemIndex}.detalhes`}
              render={({ field }) => (
                <FormItem>
                    <div className="flex justify-between items-center">
                        <FormLabel>Detalhes (conteúdo para IA)</FormLabel>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-2" disabled={isRefining}>
                                {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                Melhorar com IA
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleRefine(itemIndex, 'clarify')} disabled={isRefining}>Clarificar</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleRefine(itemIndex, 'simplify')} disabled={isRefining}>Simplificar</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleRefine(itemIndex, 'expand')} disabled={isRefining}>Expandir</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleRefine(itemIndex, 'summarize')} disabled={isRefining}>Resumir</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  <FormControl>
                    <Textarea {...field} placeholder="Conteúdo completo e estruturado para o assistente de IA..." className="min-h-[120px] font-mono text-xs" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(itemIndex)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ titulo: '', descricao: '', detalhes: '' })}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar Item
      </Button>
    </div>
  );
}

