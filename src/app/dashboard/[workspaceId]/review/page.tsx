'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Trash2, Plus, GripVertical, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DraftKnowledge, Playbook, TrainingModule, Insight } from '@/lib/firestore-types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { publishDraft } from '@/lib/actions/workspace-actions';

const knowledgeItemSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
});

const knowledgeCategorySchema = z.object({
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  icone: z.string().min(1, 'Ícone é obrigatório'),
  itens: z.array(knowledgeItemSchema),
});

const formSchema = z.object({
  categories: z.array(knowledgeCategorySchema),
});

type FormValues = z.infer<typeof formSchema>;


export default function ReviewPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const workspaceId = params.workspaceId as string;

    const [isPublishing, setIsPublishing] = useState(false);

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

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            categories: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'categories',
    });

    // Populate form with fetched draft data
    useEffect(() => {
        if (draft) {
            form.reset({ categories: draft.categories });
        }
    }, [draft, form]);

    const handleSaveChanges = async (values: FormValues) => {
        if (!draft) return;
        try {
            const draftRef = doc(firestore, `workspaces/${workspaceId}/draft_knowledge`, draft.id);
            await updateDoc(draftRef, { categories: values.categories });
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
            await publishDraft(workspaceId, draft.id, user.uid);
            toast({ title: 'Sucesso!', description: 'A base de conhecimento foi publicada.' });
            router.push(`/dashboard/${workspaceId}/knowledge`);
        } catch (error) {
            console.error('Error publishing draft:', error);
            toast({ variant: 'destructive', title: 'Erro ao publicar', description: (error as Error).message });
            setIsPublishing(false);
        }
    };

    if (isDraftLoading) {
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
    
    if (!draft) {
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
                            <Accordion type="multiple" defaultValue={draft.categories.map(c => c.categoria)} className="w-full">
                                {fields.map((categoryField, categoryIndex) => (
                                    <AccordionItem key={categoryField.id} value={categoryField.categoria}>
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
                    
                    {/* TODO: Implement editing for Playbooks, Training, and Insights */}
                    
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
             <FormLabel>Descrição</FormLabel>
             <Controller
                control={control}
                name={`categories.${categoryIndex}.itens.${itemIndex}.descricao`}
                render={({ field }) => <Textarea {...field} placeholder="Descrição do item" />}
            />
            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(itemIndex)}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ titulo: '', descricao: '' })}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar Item
      </Button>
    </div>
  );
}
