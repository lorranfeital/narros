// This file was created by the AI.
// This is the main page for the collaborator view.

'use client';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import {
  Workspace,
  User,
  TrainingModule,
  TrainingProgress,
  TrainingProgressStatus,
  PublishedKnowledge,
} from '@/lib/firestore-types';
import {
  doc,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, ArrowRight, BookOpen, Search, Plus } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Helper to determine the status of a module
const getModuleStatus = (
  moduleId: string,
  progress: TrainingProgress[] | null
) => {
  const record = progress?.find((p) => p.moduleId === moduleId);
  return record?.status || TrainingProgressStatus.NOT_STARTED;
};

// Onboarding Section Component
function OnboardingSection({
  modules,
  progress,
  isLoading,
  workspaceId,
}: {
  modules: (TrainingModule & { id: string })[] | null;
  progress: TrainingProgress[] | null;
  isLoading: boolean;
  workspaceId: string;
}) {
    const progressPercentage = useMemo(() => {
        if (!modules || !progress) return 0;
        const total = modules.length;
        if (total === 0) return 0;
        const completed = modules.filter(
            (module) => getModuleStatus(module.id, progress) === TrainingProgressStatus.COMPLETED
        ).length;
        return (completed / total) * 100;
    }, [modules, progress]);


  const nextModule = useMemo(() => {
    return modules?.find(
      (m) =>
        getModuleStatus(m.id, progress) !== TrainingProgressStatus.COMPLETED
    );
  }, [modules, progress]);

  if (isLoading) {
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">ONBOARDING</h2>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">ONBOARDING</h2>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Sua jornada de integração</CardTitle>
                <span className="text-sm font-medium text-muted-foreground">{Math.round(progressPercentage)}% concluído</span>
            </div>
            <Progress value={progressPercentage} className="h-2 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {modules?.map((module) => {
                const status = getModuleStatus(module.id, progress);
                const isCompleted = status === TrainingProgressStatus.COMPLETED;
                const isInProgress = status === TrainingProgressStatus.IN_PROGRESS;
                
                let icon = <Circle className="h-5 w-5 text-muted-foreground/30" />;
                if (isCompleted) icon = <CheckCircle className="h-5 w-5 text-green-500" />;
                if (isInProgress) icon = <Circle className="h-5 w-5 text-primary fill-current" />;

                return (
                  <div key={module.id} className="flex items-center gap-3">
                    {icon}
                    <span className={cn('font-medium', isCompleted && 'text-muted-foreground line-through')}>
                      {module.titulo}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
           {nextModule && (
            <CardFooter>
              <Button asChild className="w-auto clip-primary" variant="default">
                <Link href={`/collaborator/${workspaceId}/trainings/${nextModule.id}`}>
                  Continuar onboarding
                  <ArrowRight className="ml-2" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>
    </div>
  );
}

// Knowledge Preview Component
function KnowledgePreview({
  knowledge,
  isLoading,
  workspaceId
}: {
  knowledge: PublishedKnowledge | null;
  isLoading: boolean;
  workspaceId: string;
}) {
  if (isLoading) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {knowledge?.categories.slice(0, 4).map((cat) => (
        <Card key={cat.categoria} className="hover:border-primary/50 transition-colors">
             <Link href={`/collaborator/${workspaceId}/knowledge`} className='h-full block'>
                <CardContent className="p-4 flex items-center gap-4 h-full">
                    <span className="text-3xl">{cat.icone}</span>
                    <div>
                        <p className="font-semibold text-sm">{cat.categoria}</p>
                        <p className="text-xs text-muted-foreground">
                            {cat.itens.length} documentos
                        </p>
                    </div>
                </CardContent>
             </Link>
        </Card>
        ))}
    </div>
  );
}

// New component for the right sidebar stat cards
function ProgressStatCard({ value, label, isLoading }: { value: string; label: string; isLoading: boolean; }) {
  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-4xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// New component for the right sidebar assistant card
function AssistantCard({ workspaceId }: { workspaceId: string }) {
    return (
        <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Assistente</h3>
            <Button asChild className="w-full">
                <Link href={`/collaborator/${workspaceId}/assistant`}>
                    <Plus className="mr-2 h-4 w-4" /> Nova conversa
                </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">Tire dúvidas sobre a operação com IA</p>
        </div>
    );
}

// MyTrainingsSection Component
function MyTrainingsSection({
  modules,
  progress,
  isLoading,
  workspaceId,
}: {
  modules: (TrainingModule & { id: string })[] | null;
  progress: TrainingProgress[] | null;
  isLoading: boolean;
  workspaceId: string;
}) {
    const getStatusInfo = (status: TrainingProgressStatus) => {
        switch (status) {
            case TrainingProgressStatus.COMPLETED:
                return {
                    dotColor: 'bg-green-500',
                    text: 'Concluído',
                    icon: <CheckCircle className="h-4 w-4" />,
                    textColor: 'text-green-500'
                };
            case TrainingProgressStatus.IN_PROGRESS:
                return {
                    dotColor: 'bg-amber-500',
                    text: 'Em andamento',
                    icon: null,
                    textColor: 'text-muted-foreground'
                };
            default:
                return {
                    dotColor: 'bg-muted-foreground/30',
                    text: 'Não iniciado',
                    icon: null,
                    textColor: 'text-muted-foreground'
                };
        }
    };
    
    const visibleModules = useMemo(() => {
        if (!modules) return [];
        const notCompleted = modules.filter(m => getModuleStatus(m.id, progress) !== TrainingProgressStatus.COMPLETED);
        if (notCompleted.length > 0) return notCompleted.slice(0, 3);
        return modules.slice(0, 3);
    }, [modules, progress]);

    if (isLoading) {
        return (
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">MEUS TREINAMENTOS</h2>
                <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        );
    }


    return (
        <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">MEUS TREINAMENTOS</h2>
            <div className="space-y-3">
                {visibleModules.map(module => {
                    const status = getModuleStatus(module.id, progress);
                    const statusInfo = getStatusInfo(status);
                    return (
                        <Link href={`/collaborator/${workspaceId}/trainings/${module.id}`} key={module.id} className="block">
                            <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', statusInfo.dotColor)}></span>
                                    <div>
                                        <p className="font-semibold">{module.titulo}</p>
                                        <p className="text-sm text-muted-foreground capitalize">{module.formato} &middot; {module.duracao}</p>
                                    </div>
                                </div>
                                <div className={cn("flex items-center gap-2 text-sm font-medium", statusInfo.textColor)}>
                                    {statusInfo.icon}
                                    <span>{statusInfo.text}</span>
                                </div>
                            </div>
                        </Link>
                    )
                })}
                 {visibleModules.length === 0 && !isLoading && (
                     <div className="text-center p-8 border-2 border-dashed rounded-lg">
                        <p className="text-sm text-muted-foreground">Nenhum treinamento atribuído.</p>
                     </div>
                 )}
            </div>
        </div>
    );
}

export default function CollaboratorHomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const router = useRouter();

  // Fetch workspace data
  const workspaceDocRef = useMemoFirebase(
    () => (firestore && workspaceId ? doc(firestore, 'workspaces', workspaceId) : null),
    [firestore, workspaceId]
  );
  const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

  // Fetch user profile data
  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userDocRef);

  // Fetch training modules
  const modulesQuery = useMemoFirebase(
    () =>
      firestore && workspaceId
        ? query(
            collection(firestore, `workspaces/${workspaceId}/training_modules`),
            orderBy('modulo', 'asc')
          )
        : null,
    [firestore, workspaceId]
  );
  const { data: allModules, isLoading: areModulesLoading } = useCollection<TrainingModule>(modulesQuery);

  const modules = useMemo(() => {
    return allModules?.filter(m => m.status === 'published') || null;
  }, [allModules]);

  // Fetch user's training progress
  const progressQuery = useMemoFirebase(
    () =>
      firestore && workspaceId && user
        ? query(
            collection(firestore, `workspaces/${workspaceId}/trainingProgress`),
            where('userId', '==', user.uid)
          )
        : null,
    [firestore, workspaceId, user]
  );
  const { data: progress, isLoading: isProgressLoading } = useCollection<TrainingProgress>(progressQuery);

  // Fetch published knowledge for preview
  const knowledgeDocRef = useMemoFirebase(
    () =>
      firestore && workspaceId
        ? doc(firestore, `workspaces/${workspaceId}/published_knowledge`, workspaceId)
        : null,
    [firestore, workspaceId]
  );
  const { data: publishedKnowledge, isLoading: isKnowledgeLoading } = useDoc<PublishedKnowledge>(knowledgeDocRef);

  const { onboardingPercentage, completedTrainings, totalTrainings } = useMemo(() => {
    if (!modules || !progress) return { onboardingPercentage: 0, completedTrainings: 0, totalTrainings: 0 };
    const total = modules.length;
    const completed = modules.filter(
      (module) => getModuleStatus(module.id, progress) === TrainingProgressStatus.COMPLETED
    ).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { onboardingPercentage: Math.round(percentage), completedTrainings: completed, totalTrainings: total };
  }, [modules, progress]);


  const isLoading = isUserLoading || isWorkspaceLoading || isProfileLoading || areModulesLoading || isProgressLoading || isKnowledgeLoading;

  // Redirect to onboarding if user hasn't completed it for this workspace
  useEffect(() => {
    if (!isLoading && userProfile && workspaceId) {
      if (!userProfile.onboardingCompletedWorkspaces?.includes(workspaceId)) {
        router.replace(`/collaborator/${workspaceId}/onboarding`);
      }
    }
  }, [isLoading, userProfile, workspaceId, router]);

  const [searchQuery, setSearchQuery] = useState('');
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/collaborator/${workspaceId}/assistant?initial_message=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="flex h-full">
      {/* Scrollable Main Content */}
      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto max-w-4xl p-8 space-y-8">
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-1/4 mb-2" />
                <Skeleton className="h-8 w-1/3 mb-2" />
                <Skeleton className="h-5 w-1/2" />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground">{workspace?.name || 'Workspace'}</p>
                <h1 className="text-3xl font-bold mt-1">Bom dia, {userProfile?.name.split(' ')[0]}</h1>
                <p className="text-muted-foreground">
                    {completedTrainings} de {totalTrainings || 0} etapas de onboarding concluídas
                </p>
              </>
            )}
          </div>
          
          <OnboardingSection modules={modules} progress={progress} isLoading={isLoading} workspaceId={workspaceId} />

          <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Base de conhecimento</h2>
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                placeholder="Pergunte qualquer coisa sobre a operação..."
                className="h-11 text-base pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </form>
            <KnowledgePreview knowledge={publishedKnowledge} isLoading={isLoading} workspaceId={workspaceId} />
          </div>
          
          <MyTrainingsSection modules={modules} progress={progress} isLoading={isLoading} workspaceId={workspaceId} />

        </main>
      </div>

      {/* Fixed Right Sidebar */}
      <aside className="w-80 border-l bg-secondary/30 p-6 space-y-6 hidden lg:block">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Meu Progresso</h2>
        <div className="grid grid-cols-1 gap-4">
            <ProgressStatCard
                label="Onboarding"
                value={`${onboardingPercentage}%`}
                isLoading={isLoading}
            />
            <ProgressStatCard
                label="Treinamentos"
                value={`${completedTrainings}/${totalTrainings}`}
                isLoading={isLoading}
            />
            <ProgressStatCard
                label="Categorias disponíveis"
                value={String(publishedKnowledge?.categories?.length ?? '—')}
                isLoading={isLoading}
            />
        </div>
        <AssistantCard workspaceId={workspaceId} />
      </aside>
    </div>
  );
}
