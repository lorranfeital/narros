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
  limit,
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
import { CheckCircle, Circle, ArrowRight, BookOpen } from 'lucide-react';
import { useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
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
  const totalModules = modules?.length || 0;
  const completedModules = useMemo(() => {
    if (!modules || !progress) return 0;
    return modules.filter(
      (module) =>
        getModuleStatus(module.id, progress) ===
        TrainingProgressStatus.COMPLETED
    ).length;
  }, [modules, progress]);

  const progressPercentage =
    totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  const nextModule = useMemo(() => {
    return modules?.find(
      (m) =>
        getModuleStatus(m.id, progress) !== TrainingProgressStatus.COMPLETED
    );
  }, [modules, progress]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Sua jornada de integração</CardTitle>
        <CardDescription>
          Complete os módulos abaixo para finalizar seu onboarding.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center gap-4 mb-4">
          <Progress value={progressPercentage} className="h-2" />
          <span className="text-sm font-medium text-muted-foreground shrink-0">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="space-y-3">
          {modules?.map((module) => {
            const status = getModuleStatus(module.id, progress);
            const isCompleted = status === TrainingProgressStatus.COMPLETED;
            return (
              <div key={module.id} className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span
                  className={cn(isCompleted && 'text-muted-foreground line-through')}
                >
                  {module.titulo}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
       {nextModule && (
        <CardFooter>
          <Button asChild className="w-full md:w-auto" variant="default">
            <Link href={`/collaborator/${workspaceId}/trainings/${nextModule.id}`}>
              Continuar onboarding
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// Knowledge Preview Component
function KnowledgePreview({
  knowledge,
  isLoading,
}: {
  knowledge: PublishedKnowledge | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
      </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg">Base de Conhecimento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
            {knowledge?.categories.slice(0, 4).map((cat) => (
            <Card key={cat.categoria} className="hover:bg-muted/50">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                <span className="text-3xl">{cat.icone}</span>
                <p className="font-semibold mt-2 text-sm">{cat.categoria}</p>
                <p className="text-xs text-muted-foreground">
                    {cat.itens.length} itens
                </p>
                </CardContent>
            </Card>
            ))}
      </CardContent>
    </Card>
  );
}

export default function CollaboratorHomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const params = useParams();
  const workspaceId = params.workspaceId as string;

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

  const isLoading = isUserLoading || isWorkspaceLoading || isProfileLoading || areModulesLoading || isProgressLoading || isKnowledgeLoading;
  
  const completedModules = useMemo(() => {
    if (!modules || !progress) return 0;
    return modules.filter(
      (module) =>
        getModuleStatus(module.id, progress) ===
        TrainingProgressStatus.COMPLETED
    ).length;
  }, [modules, progress]);


  return (
    <div className="p-8 space-y-8">
      <div>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-5 w-1/2" />
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Bom dia, {userProfile?.name.split(' ')[0]}</h1>
            <p className="text-muted-foreground">
              {completedModules} de {modules?.length || 0} etapas de onboarding concluídas.
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <OnboardingSection modules={modules} progress={progress} isLoading={isLoading} workspaceId={workspaceId} />
        <div className="space-y-8">
          <KnowledgePreview knowledge={publishedKnowledge} isLoading={isLoading} />
           <Card>
              <CardHeader>
                  <CardTitle className="text-lg">Meus Treinamentos</CardTitle>
              </CardHeader>
              <CardContent>
                  {isLoading ? <Skeleton className="h-20 w-full" /> : (
                  <Table>
                    <TableBody>
                        {modules?.slice(0,3).map(module => (
                            <TableRow key={module.id}>
                                <TableCell className="font-medium p-2">{module.titulo}</TableCell>
                                <TableCell className="text-right text-muted-foreground p-2">{getModuleStatus(module.id, progress) === 'completed' ? 'Concluído' : 'Pendente'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  )}
                  <Button variant="link" asChild className="p-0 mt-4 text-primary">
                      <Link href={`/collaborator/${workspaceId}/trainings`}>Ver todos</Link>
                  </Button>
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
