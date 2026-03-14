
'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, Timestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Send, Sparkles, BookCopy, ChevronRight, FilePlus, GitPullRequest, Search, BookOpen, FileText, Bot, Loader2, GraduationCap, Lightbulb } from 'lucide-react';
import { Input } from '@/components/ui/input';
import React, { useState, useMemo } from 'react';
import { Workspace, PublishedKnowledge, Playbook, TrainingModule, Insight } from '@/lib/firestore-types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { chatWithKnowledgeAssistant, ChatWithKnowledgeAssistantOutput } from '@/ai/flows/chat-with-knowledge-assistant';

// Main component
export default function WorkspaceDashboardPage() {
    const firestore = useFirestore();
    const params = useParams();
    const { user } = useUser();
    const workspaceId = params.workspaceId as string;
    const { toast } = useToast();

    const [question, setQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [answer, setAnswer] = useState<ChatWithKnowledgeAssistantOutput | null>(null);

    // --- Data Fetching ---
    const workspaceDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'workspaces', workspaceId) : null, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

    const publishedKnowledgeDocRef = useMemoFirebase(() => firestore ? doc(firestore, `workspaces/${workspaceId}/published_knowledge`, workspaceId) : null, [firestore, workspaceId]);
    const { data: publishedKnowledge, isLoading: isKnowledgeLoading } = useDoc<PublishedKnowledge>(publishedKnowledgeDocRef);

    const playbooksQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/playbooks`), where('status', '==', 'published')) : null, [firestore, workspaceId]);
    const { data: playbooks, isLoading: isPlaybooksLoading } = useCollection<Playbook>(playbooksQuery);

    const trainingModulesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/training_modules`), where('status', '==', 'published')) : null, [firestore, workspaceId]);
    const { data: trainingModules, isLoading: isTrainingLoading } = useCollection<TrainingModule>(trainingModulesQuery);

    const insightsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/insights`)) : null, [firestore, workspaceId]);
    const { data: insights, isLoading: isInsightsLoading } = useCollection<Insight>(insightsQuery);
    
    // -- Derived State & Calculations ---
    const isLoading = isWorkspaceLoading || isKnowledgeLoading || isPlaybooksLoading || isTrainingLoading || isInsightsLoading;
    const categoryCount = publishedKnowledge?.categories?.length ?? 0;
    const lastUpdatedAt = workspace?.lastPublishedAt ?? workspace?.lastProcessedAt ?? workspace?.createdAt;

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || isAsking) return;

        setIsAsking(true);
        setAnswer(null);

        try {
            const result = await chatWithKnowledgeAssistant({
                query: question,
                workspaceId,
                chatHistory: [], // For now, each question is a new chat
            });
            setAnswer(result);
        } catch (error: any) {
            console.error("Error asking question:", error);
            toast({ variant: 'destructive', title: 'Erro ao buscar resposta', description: error.message });
        } finally {
            setIsAsking(false);
        }
    };
    
    const exampleQuestions = [
        "Como funciona a política de taxas?",
        "Como cadastrar um novo cliente?",
        "Qual o fluxo de aprovação de fundos?",
    ];

    if (isLoading) {
        return (
            <div className="p-8 md:p-12 space-y-10">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-40 w-full" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        )
    }
    
    if (!workspace) return <div className="p-12">Workspace não encontrado.</div>;

    return (
        <div className="p-8 md:p-12 space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Bom dia, {user?.displayName?.split(' ')[0]}</h1>
                <p className="text-xl text-muted-foreground mt-1">{workspace.name}</p>
                <div className="text-sm text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>{workspace.type} &middot; {workspace.sector}</span>
                    {workspace.version && <span>Base publicada &middot; Versão {workspace.version}</span>}
                    {lastUpdatedAt && <span>Última atualização: {format(lastUpdatedAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}</span>}
                </div>
            </div>
            
            {/* Bloco 1: Perguntar */}
            <Card className="shadow-lg">
                <CardContent className="p-6">
                    <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><Bot /> Pergunte à sua empresa</h2>
                    <form onSubmit={handleAskQuestion} className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="O que você quer saber?"
                            className="h-12 text-lg pl-10 pr-32"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            disabled={isAsking}
                        />
                        <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" disabled={isAsking || !question.trim()}>
                            {isAsking ? <Loader2 className="animate-spin" /> : <Send />}
                            {isAsking ? 'Perguntando...' : 'Perguntar'}
                        </Button>
                    </form>
                     {!isAsking && !answer && (
                        <div className="text-sm text-muted-foreground">
                            <strong>Exemplos: </strong>
                            {exampleQuestions.map((q, i) => (
                                <button key={i} onClick={() => setQuestion(q)} className="hover:text-primary transition-colors">
                                    {q}{i < exampleQuestions.length -1 && " • "}
                                </button>
                            ))}
                        </div>
                     )}
                     {isAsking && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /><span>Analisando a base de conhecimento...</span></div>}
                     {answer && (
                        <div className="mt-6 space-y-4 animate-in fade-in-50">
                            <p className="whitespace-pre-wrap leading-relaxed">{answer.response}</p>
                            {answer.citations && answer.citations.length > 0 && (
                                <div className="pt-4 border-t">
                                    <h4 className="text-sm font-semibold text-muted-foreground">Resposta baseada em:</h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {answer.citations.map((citation, i) => (
                                            <Badge key={i} variant="secondary"><FileText className="mr-1.5" />{citation.document}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                     )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                    {/* Bloco 2: Estado do conhecimento */}
                    <div>
                         <h3 className="text-lg font-semibold mb-4">Estado do Conhecimento</h3>
                         <div className="grid grid-cols-2 gap-4">
                            <StatCard title="Categorias" value={categoryCount} icon={BookCopy} />
                            <StatCard title="Playbooks" value={playbooks?.length ?? 0} icon={BookOpen} />
                            <StatCard title="Treinamentos" value={trainingModules?.length ?? 0} icon={GraduationCap} />
                            <StatCard title="Insights" value={insights?.length ?? 0} icon={Lightbulb} />
                        </div>
                    </div>

                     {/* Bloco 3: Ações rápidas */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
                        <div className="space-y-2">
                            <ActionLink href={`/dashboard/${workspaceId}/content`} title="Enviar conteúdo" icon={FilePlus} />
                            <ActionLink href={`/dashboard/${workspaceId}/sync`} title="Revisar alterações" icon={GitPullRequest} badgeCount={workspace.pendingSyncCount} />
                            <ActionLink href={`/dashboard/${workspaceId}/knowledge`} title="Ver base de conhecimento" icon={BookOpen} />
                        </div>
                    </div>
                </div>

                {/* Bloco 4: Insights */}
                <div>
                     <h3 className="text-lg font-semibold mb-4">Insights da IA</h3>
                     <div className="space-y-4">
                         {(insights && insights.length > 0) ? insights.slice(0, 4).map(insight => (
                            <Alert key={insight.id} variant={insight.tipo === 'risco' ? 'destructive' : 'default'}>
                                <Sparkles className="h-4 w-4" />
                                <AlertTitle className="capitalize font-bold">{insight.tipo}</AlertTitle>
                                <AlertDescription>{insight.texto}</AlertDescription>
                            </Alert>
                        )) : (
                            <p className="text-sm text-muted-foreground p-4 text-center bg-muted rounded-lg">Nenhum insight encontrado.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon }: { title: string, value: number, icon: React.ElementType }) {
    return (
        <Card>
            <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm text-muted-foreground">{title}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function ActionLink({ href, title, icon: Icon, badgeCount }: { href: string, title: string, icon: React.ElementType, badgeCount?: number }) {
    return (
        <Link href={href}>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                     {badgeCount && badgeCount > 0 && <Badge variant="processing">{badgeCount}</Badge>}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
            </div>
        </Link>
    )
}
