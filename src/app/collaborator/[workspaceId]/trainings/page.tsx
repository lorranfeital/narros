// This file was created by the AI.
'use client';

import React, { useState, useMemo } from 'react';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import {
  TrainingModule,
  TrainingProgress,
  TrainingProgressStatus,
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
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Circle, Play, BookOpen } from 'lucide-react';
import Link from 'next/link';

// Helper to determine the status of a module
const getModuleStatus = (
  moduleId: string,
  progress: TrainingProgress[] | null
): TrainingProgressStatus => {
  const record = progress?.find((p) => p.moduleId === moduleId);
  return record?.status || TrainingProgressStatus.NOT_STARTED;
};

// Module Card Component
function ModuleCard({
  module,
  status,
  workspaceId,
}: {
  module: TrainingModule & { id: string };
  status: TrainingProgressStatus;
  workspaceId: string;
}) {
  const getStatusInfo = () => {
    switch (status) {
      case TrainingProgressStatus.COMPLETED:
        return {
          icon: <CheckCircle className="text-green-500" />,
          text: 'Concluído',
          color: 'text-green-500',
          progress: 100,
        };
      case TrainingProgressStatus.IN_PROGRESS:
        return {
          icon: <Play className="text-primary" />,
          text: 'Em andamento',
          color: 'text-primary',
          progress: 50,
        };
      default:
        return {
          icon: <Circle className="text-muted-foreground" />,
          text: 'Não iniciado',
          color: 'text-muted-foreground',
          progress: 0,
        };
    }
  };

  const statusInfo = getStatusInfo();
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
            <div>
                 <p className={`text-sm font-medium flex items-center gap-2 ${statusInfo.color}`}>
                    {statusInfo.icon}
                    {statusInfo.text}
                </p>
                <h3 className="text-lg font-bold mt-2">{module.titulo}</h3>
                <p className="text-sm text-muted-foreground mt-1">{module.objetivo}</p>
            </div>
             <div className="text-xs text-muted-foreground flex items-center gap-4">
                <span>{module.formato}</span>
                <span>{module.duracao}</span>
            </div>
        </div>
        <Progress value={statusInfo.progress} className="mt-4 h-1" />
        <Button asChild className="mt-4">
             <Link href={`/collaborator/${workspaceId}/trainings/${module.id}`}>
                {status === TrainingProgressStatus.COMPLETED ? 'Revisar' : (status === TrainingProgressStatus.IN_PROGRESS ? 'Continuar' : 'Iniciar')}
             </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CollaboratorTrainingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [filter, setFilter] = useState('all');

  // Fetch published training modules
  const modulesQuery = useMemoFirebase(
    () =>
      firestore && workspaceId
        ? query(
            collection(firestore, `workspaces/${workspaceId}/training_modules`),
            where('status', '==', 'published'),
            orderBy('modulo', 'asc')
          )
        : null,
    [firestore, workspaceId]
  );
  const { data: modules, isLoading: areModulesLoading } = useCollection<TrainingModule>(modulesQuery);

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

  const filteredModules = useMemo(() => {
    if (!modules) return [];
    if (filter === 'all') return modules;
    return modules.filter(module => {
        const status = getModuleStatus(module.id, progress);
        if (filter === 'not_started' && status === TrainingProgressStatus.NOT_STARTED) return true;
        if (filter === 'in_progress' && status === TrainingProgressStatus.IN_PROGRESS) return true;
        if (filter === 'completed' && status === TrainingProgressStatus.COMPLETED) return true;
        return false;
    });
  }, [modules, progress, filter]);

  const isLoading = areModulesLoading || isProgressLoading || isUserLoading;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Meus Treinamentos</h1>
        <p className="text-muted-foreground">
          Módulos atribuídos pela empresa para sua jornada de aprendizado.
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="not_started">Não iniciados</TabsTrigger>
          <TabsTrigger value="in_progress">Em andamento</TabsTrigger>
          <TabsTrigger value="completed">Concluídos</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {isLoading ? (
            Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
        ) : (
            filteredModules.map(module => (
                <ModuleCard 
                    key={module.id} 
                    module={module} 
                    status={getModuleStatus(module.id, progress)}
                    workspaceId={workspaceId}
                />
            ))
        )}
      </div>
    </div>
  );
}
