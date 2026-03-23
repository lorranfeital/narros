// This file was created by the AI.
'use client';

import React from 'react';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import {
  TrainingModule,
  TrainingProgressStatus,
} from '@/lib/firestore-types';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { updateTrainingProgress } from '@/lib/actions/workspace-actions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ModuleDetailPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const workspaceId = params.workspaceId as string;
  const moduleId = params.moduleId as string;

  const [isCompleting, setIsCompleting] = React.useState(false);

  // Fetch module data
  const moduleDocRef = useMemoFirebase(
    () =>
      firestore && workspaceId && moduleId
        ? doc(firestore, `workspaces/${workspaceId}/training_modules`, moduleId)
        : null,
    [firestore, workspaceId, moduleId]
  );
  const { data: module, isLoading } = useDoc<TrainingModule>(moduleDocRef);

  React.useEffect(() => {
    // Mark as in_progress when the user lands on the page
    if (user && workspaceId && moduleId) {
      updateTrainingProgress(workspaceId, user.uid, moduleId, TrainingProgressStatus.IN_PROGRESS);
    }
  }, [user, workspaceId, moduleId]);


  const handleMarkAsCompleted = async () => {
    if (!user) return;
    setIsCompleting(true);
    try {
        await updateTrainingProgress(workspaceId, user.uid, moduleId, TrainingProgressStatus.COMPLETED);
        toast({ title: "Módulo concluído!", description: "Seu progresso foi salvo." });
        router.push(`/collaborator/${workspaceId}/trainings`);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro ao salvar progresso."});
        console.error(error);
    } finally {
        setIsCompleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!module) {
    return <div className="p-8">Módulo não encontrado.</div>;
  }

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Badge variant="secondary">{module.formato} - {module.duracao}</Badge>
            <Button variant="link" asChild>
                <Link href={`/collaborator/${workspaceId}/trainings`}>Voltar para treinamentos</Link>
            </Button>
          </div>
          <CardTitle className="text-3xl mt-4">{module.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground">{module.objetivo}</p>
          <h3 className="font-semibold text-lg mt-8 mb-4">Tópicos:</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            {module.topicos.map((topic, i) => (
              <li key={i}>{topic}</li>
            ))}
          </ul>
          {/* Here you would render the full content of the module, possibly from a markdown field */}
        </CardContent>
        <CardFooter>
             <Button size="lg" onClick={handleMarkAsCompleted} disabled={isCompleting}>
                {isCompleting ? "Salvando..." : <><CheckCircle className="mr-2"/> Marcar como concluído</>}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
