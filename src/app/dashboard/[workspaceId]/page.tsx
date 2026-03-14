
'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  Sparkles, 
  BookCopy, 
  ChevronRight, 
  FilePlus, 
  GitPullRequest, 
  Search, 
  BookOpen, 
  FileText, 
  Loader2, 
  GraduationCap, 
  Lightbulb,
  MapPin,
  AlertTriangle,
  ArrowRight,
  ArrowUpCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import React, { useState } from 'react';
import { Workspace, PublishedKnowledge, Playbook, TrainingModule, Insight, WorkspaceStatus, SyncProposal, SyncApprovalStatus, Version, InsightType, VersionEventType, DraftKnowledge, BrandKit } from '@/lib/firestore-types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { chatWithKnowledgeAssistant, ChatWithKnowledgeAssistantOutput } from '@/ai/flows/chat-with-knowledge-assistant';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// -- BLOCKS & SUB-COMPONENTS --

function capitalizeFirstLetter(str: string | undefined) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function DashboardHeader({ workspace }: { workspace: Workspace | null }) {
    if (!workspace) return <Skeleton className="h-20 w-full" />;

    const lastUpdatedAt = workspace.lastPublishedAt ?? workspace.lastProcessedAt ?? workspace.createdAt;

    const StatusIndicator = () => {
        let statusColor = 'bg-gray-400';
        let statusText = 'Desconhecido';
        let pulsing = false;
        let actionLink: React.ReactNode = null;

        switch (workspace.status) {
            case WorkspaceStatus.PUBLISHED:
                statusColor = 'bg-green-500';
                statusText = 'Base publicada';
                break;
            case WorkspaceStatus.DRAFT_READY:
                statusColor = 'bg-amber-500';
                statusText = 'Rascunho pendente';
                actionLink = <Link href={`/dashboard/${workspace.id}/review`} className="ml-2 hover:underline">Revisar →</Link>
                break;
            case WorkspaceStatus.SYNC_PENDING:
                statusColor = 'bg-amber-500';
                pulsing = true;
                statusText = 'Atualização aguardando revisão';
                actionLink = <Link href={`/dashboard/${workspace.id}/sync`} className="ml-2 hover:underline">Revisar →</Link>
                break;
            case WorkspaceStatus.NEVER_PUBLISHED:
                statusColor = 'bg-gray-400';
                statusText = 'Base não publicada';
                break;
        }

        return (
            <div className="flex items-center">
                 <div className="relative flex h-2 w-2 mr-2">
                    {pulsing && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                    <span className={cn("relative inline-flex rounded-full h-2 w-2", statusColor)}></span>
                </div>
                <span>{statusText}</span>
                {actionLink}
            </div>
        );
    }

    return (
        <div>
            <p className="text-sm text-muted-foreground">Bom dia, {useUser().user?.displayName?.split(' ')[0]}</p>
            <h1 className="font-headline text-3xl font-normal tracking-tight mt-1">{workspace.name}</h1>
            <div className="text-sm text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{capitalizeFirstLetter(workspace.type)}</span>
                <span className="text-muted-foreground/50">&middot;</span>
                <span>{workspace.sector}</span>
                {workspace.status !== WorkspaceStatus.NEVER_PUBLISHED && (
                    <>
                        <span className="text-muted-foreground/50">&middot;</span>
                        <StatusIndicator />
                    </>
                )}
                 {workspace.version && workspace.status === WorkspaceStatus.PUBLISHED ? (
                    <>
                        <span className="text-muted-foreground/50">&middot;</span>
                        <span>Versão {workspace.version}</span>
                    </>
                ) : null}
                {lastUpdatedAt && (
                     <>
                        <span className="text-muted-foreground/50">&middot;</span>
                        <span>Atualizada em {format(lastUpdatedAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </>
                )}
            </div>
        </div>
    );
}

function AskHeroBlock({ workspace, primaryColor }: { workspace: Workspace, primaryColor?: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const [question, setQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [answer, setAnswer] = useState<ChatWithKnowledgeAssistantOutput | null>(null);

    const isAssistantDisabled = workspace.status === WorkspaceStatus.NEVER_PUBLISHED || workspace.status === WorkspaceStatus.DRAFT_READY;

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || isAsking || isAssistantDisabled) return;

        setIsAsking(true);
        setAnswer(null);

        try {
            const result = await chatWithKnowledgeAssistant({
                query: question,
                workspaceId: workspace.id,
                chatHistory: [],
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
        "Como funciona nossa política de taxas?",
        "Como cadastrar um novo cliente?",
        "Qual o fluxo de aprovação de fundos?",
    ];

    return (
        <div className="rounded-xl border bg-card/50 p-8">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Assistente da empresa</label>
             <form onSubmit={handleAskQuestion} className="relative mt-4 mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Pergunte qualquer coisa sobre a operação"
                    className="h-14 text-base pl-12 pr-40"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={isAsking || isAssistantDisabled}
                />
                <Button 
                    type="submit" 
                    size="lg" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10" 
                    disabled={isAsking || !question.trim() || isAssistantDisabled}
                    style={primaryColor ? { backgroundColor: primaryColor } : {}}
                >
                    {isAsking ? <Loader2 className="animate-spin" /> : "Perguntar"}
                    {!isAsking && <ArrowRight />}
                </Button>
            </form>
             <div className="text-sm text-muted-foreground">
                {isAssistantDisabled ? (
                    <span>Publique sua base de conhecimento para ativar o assistente.</span>
                ) : !isAsking && !answer && (
                    <>
                        <span className="font-medium">Tente: </span>
                        {exampleQuestions.map((q, i) => (
                            <button key={i} onClick={() => setQuestion(q)} className="hover:text-primary transition-colors text-left">
                                "{q}"{i < exampleQuestions.length -1 && <span className="mx-1.5">&middot;</span>}
                            </button>
                        ))}
                    </>
                )}
            </div>

            {isAsking && <div className="mt-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /><span>Analisando a base de conhecimento...</span></div>}
            
            {answer && (
                <div className="mt-6 pt-6 border-t space-y-4 animate-in fade-in-50">
                    <p className="whitespace-pre-wrap leading-relaxed">{answer.response}</p>
                    {answer.citations && answer.citations.length > 0 && (
                        <div>
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
        </div>
    )
}

function KnowledgeStats({ data, isLoading, primaryColor }: { data: any, isLoading: boolean, primaryColor?: string }) {

    const stats = [
        { title: 'Categorias', value: data.categoryCount, icon: BookCopy, href: `/dashboard/${data.workspaceId}/knowledge` },
        { title: 'Playbooks', value: data.playbooksCount, icon: BookOpen, href: `/dashboard/${data.workspaceId}/knowledge` },
        { title: 'Treinamentos', value: data.trainingModulesCount, icon: GraduationCap, href: `/dashboard/${data.workspaceId}/knowledge` },
        { title: 'Insights', value: data.insightsCount, icon: Sparkles, href: `/dashboard/${data.workspaceId}/knowledge` },
    ];
    
    return (
        <div>
            <h3 className="text-base font-semibold">Conhecimento da empresa</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
                {isLoading ? (
                    <>
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </>
                ) : (
                    stats.map(({ title, value, icon: Icon, href }) => (
                         <Link key={title} href={href}>
                            <div className="rounded-lg border bg-card p-6 hover:border-primary/50 transition-colors h-full">
                                <Icon className="h-7 w-7 text-primary" style={primaryColor ? { color: primaryColor } : {}} />
                                <p className="font-headline text-4xl mt-2">{value}</p>
                                <p className="text-sm text-muted-foreground">{title}</p>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}

function QuickActions({ workspaceId, syncCount }: { workspaceId: string, syncCount: number }) {
    const actions = [
        { title: "Adicionar conhecimento", href: `/dashboard/${workspaceId}/content`, icon: FilePlus, badge: 0 },
        { title: "Revisar alterações", href: `/dashboard/${workspaceId}/sync`, icon: GitPullRequest, badge: syncCount },
        { title: "Explorar base de conhecimento", href: `/dashboard/${workspaceId}/knowledge`, icon: BookOpen, badge: 0 },
    ];

    return (
        <div className="mt-8">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Ações Rápidas</h3>
            <div className="rounded-lg border bg-card">
                {actions.map((action, index) => (
                    <Link key={action.title} href={action.href}>
                        <div className={cn(
                            "flex items-center justify-between p-4 hover:bg-muted/50 transition-colors",
                            index < actions.length - 1 && "border-b"
                        )}>
                            <div className="flex items-center gap-3">
                                <action.icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">{action.title}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                {action.badge > 0 && <Badge variant="processing">{action.badge}</Badge>}
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}

function MostConsultedContent({ isLoading }: { isLoading: boolean }) {
    const items = [
        { title: 'Tabela de Tarifas', icon: FileText, href: '#' },
        { title: 'Processo de cadastro de cliente', icon: BookOpen, href: '#' },
        { title: 'Política de compliance', icon: FileText, href: '#' },
    ];

    return (
        <div className="mt-8">
            <h3 className="text-base font-semibold mb-4">Conteúdo mais usado</h3>
            <div className="rounded-lg border bg-card">
                 {isLoading ? (
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-8 w-2/3" />
                    </div>
                ) : items.length > 0 ? (
                    items.map((item, index) => (
                        <Link key={item.title} href={item.href}>
                            <div className={cn(
                                "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors",
                                index < items.length - 1 && "border-b"
                            )}>
                                <item.icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">{item.title}</span>
                                <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="p-8 text-center">
                        <p className="text-sm text-muted-foreground">Ainda não há dados de conteúdo mais consultado.</p>
                    </div>
                )}
            </div>
        </div>
    )
}


function AIInsights({ insights, isLoading }: { insights: Insight[] | null, isLoading: boolean }) {
    const getInsightAppearance = (type: InsightType) => {
        switch (type) {
            case 'gap':
                return { icon: MapPin, label: 'Gap', className: 'border-amber-400 bg-amber-500/5 text-amber-600 dark:text-amber-400' };
            case 'risco':
                return { icon: AlertTriangle, label: 'Risco', className: 'border-red-500 bg-red-500/5 text-red-600 dark:text-red-400' };
            case 'oportunidade':
                return { icon: Lightbulb, label: 'Oportunidade', className: 'border-green-500 bg-green-500/5 text-green-600 dark:text-green-400' };
            default:
                return { icon: Sparkles, label: 'Insight', className: 'border-gray-300 bg-gray-500/5 text-gray-500' };
        }
    };
    
    return (
         <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Insights da IA</h3>
                {insights && insights.length > 0 && <Badge variant="secondary">{insights.length} total</Badge>}
            </div>
            <div className="space-y-2">
                {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                
                {!isLoading && insights && insights.length > 0 ? (
                    insights.slice(0, 4).map(insight => {
                        const { icon: Icon, label, className } = getInsightAppearance(insight.tipo);
                        return (
                            <div key={insight.id} className={cn("p-4 rounded-md border-l-[3px]", className)}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-snug">{insight.texto}</p>
                            </div>
                        );
                    })
                ) : !isLoading && (
                    <div className="text-center p-8 border rounded-lg bg-card/50">
                        <p className="text-sm text-muted-foreground">Nenhum insight encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function RecentActivity({ versions, isLoading }: { versions: Version[] | null, isLoading: boolean }) {
    const getActivityIcon = (type: VersionEventType) => {
        switch (type) {
            case VersionEventType.INITIAL_PUBLISH: return ArrowUpCircle;
            case VersionEventType.SYNC_PUBLISH: return GitPullRequest;
            default: return FileText;
        }
    };

    return (
        <div className="mt-8">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Atividade recente</h3>
             {isLoading && <Skeleton className="h-6 w-1/2" />}
             {!isLoading && versions && versions.length > 0 ? (
                <div className="flex flex-col md:flex-row gap-x-8 gap-y-2 text-sm text-muted-foreground">
                    {versions.map(version => {
                        const Icon = getActivityIcon(version.type);
                        const fullSummary = version.summary.includes('Versão') || version.summary.includes('versão')
                            ? version.summary 
                            : `${version.summary.replace(/\.$/, '')} · Versão ${version.version}`;
                        
                        return (
                             <div key={version.id} className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span>
                                    {fullSummary} &middot; {formatDistanceToNow(version.createdAt.toDate(), { locale: ptBR, addSuffix: true })}
                                </span>
                            </div>
                        )
                    })}
                </div>
            ) : !isLoading && (
                <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            )}
        </div>
    )
}


// -- MAIN PAGE COMPONENT --
export default function WorkspaceDashboardPage() {
    const firestore = useFirestore();
    const params = useParams();
    const workspaceId = params.workspaceId as string;

    // --- Data Fetching ---
    const workspaceDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'workspaces', workspaceId) : null, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);
    
    // Fetch draft data only if workspace status is 'draft'
    const draftQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId || workspace?.status !== WorkspaceStatus.DRAFT_READY) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/draft_knowledge`), where('status', '==', 'draft'), limit(1));
    }, [firestore, workspaceId, workspace?.status]);
    const { data: drafts } = useCollection<DraftKnowledge>(draftQuery);
    const draftKnowledge = drafts?.[0];

    // Fetch published data for stats
    const publishedKnowledgeDocRef = useMemoFirebase(() => firestore ? doc(firestore, `workspaces/${workspaceId}/published_knowledge`, workspaceId) : null, [firestore, workspaceId]);
    const { data: publishedKnowledge, isLoading: isKnowledgeLoading } = useDoc<PublishedKnowledge>(publishedKnowledgeDocRef);

    const playbooksQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/playbooks`), where('status', '==', 'published')) : null, [firestore, workspaceId]);
    const { data: playbooks, isLoading: isPlaybooksLoading } = useCollection<Playbook>(playbooksQuery);

    const trainingModulesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/training_modules`), where('status', '==', 'published')) : null, [firestore, workspaceId]);
    const { data: trainingModules, isLoading: isTrainingLoading } = useCollection<TrainingModule>(trainingModulesQuery);

    const insightsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/insights`), orderBy('createdAt', 'desc')) : null, [firestore, workspaceId]);
    const { data: insights, isLoading: isInsightsLoading } = useCollection<Insight>(insightsQuery);

    const syncProposalsQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId || workspace?.status !== WorkspaceStatus.SYNC_PENDING) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/sync_proposals`), where('approvalStatus', '==', SyncApprovalStatus.PENDING));
    }, [firestore, workspaceId, workspace?.status]);
    const { data: syncProposals, isLoading: isSyncLoading } = useCollection<SyncProposal>(syncProposalsQuery);

    const versionsQuery = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return query(collection(firestore, `workspaces/${workspaceId}/versions`), orderBy('createdAt', 'desc'), limit(3));
    }, [firestore, workspaceId]);
    const { data: versions, isLoading: isVersionsLoading } = useCollection<Version>(versionsQuery);

    const brandKitDocRef = useMemoFirebase(() => {
        if (!firestore || !workspaceId) return null;
        return doc(firestore, `workspaces/${workspaceId}/brand_kit`, 'live');
    }, [firestore, workspaceId]);
    const { data: brandKit, isLoading: isBrandKitLoading } = useDoc<BrandKit>(brandKitDocRef);


    // -- Derived State & Calculations ---
    const isLoading = isWorkspaceLoading || isKnowledgeLoading || isPlaybooksLoading || isTrainingLoading || isInsightsLoading || isSyncLoading || isVersionsLoading || isBrandKitLoading;
    
    const primaryColor = React.useMemo(() => {
        if (!brandKit?.colorPalette) return undefined;
        const primary = brandKit.colorPalette.find(c => c.name.toLowerCase() === 'primária');
        return primary?.hex;
    }, [brandKit]);

    let knowledgeStats: any;
    if (workspace?.status === WorkspaceStatus.DRAFT_READY && draftKnowledge) {
        knowledgeStats = { categoryCount: draftKnowledge.categories.length, playbooksCount: 0, trainingModulesCount: 0, insightsCount: 0 };
    } else {
        knowledgeStats = {
            workspaceId: workspaceId,
            categoryCount: publishedKnowledge?.categories?.length ?? 0,
            playbooksCount: playbooks?.length ?? 0,
            trainingModulesCount: trainingModules?.length ?? 0,
            insightsCount: insights?.length ?? 0
        };
    }
    
    if (!workspace) {
        return (
             <div className="p-12 space-y-10">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
                <div className="grid grid-cols-5 gap-8">
                    <div className="col-span-3 space-y-4">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                     <div className="col-span-2">
                         <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-12 space-y-10">
            <DashboardHeader workspace={workspace} />
            <AskHeroBlock workspace={workspace} primaryColor={primaryColor} />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
                 <div className="md:col-span-3 space-y-8">
                    <KnowledgeStats data={knowledgeStats} isLoading={isLoading} primaryColor={primaryColor} />
                    <QuickActions workspaceId={workspaceId} syncCount={syncProposals?.length ?? 0} />
                    <MostConsultedContent isLoading={isLoading} />
                 </div>
                 <div className="md:col-span-2">
                    <AIInsights insights={insights} isLoading={isLoading} />
                 </div>
            </div>
            
            <RecentActivity versions={versions} isLoading={isVersionsLoading} />
        </div>
    );
}

    