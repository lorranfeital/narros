'use client';

import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function WorkspacePage() {
  const firestore = useFirestore();
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const workspaceDocRef = useMemoFirebase(() => {
    if (!firestore || !workspaceId) return null;
    return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);

  const { data: workspace, isLoading, error } = useDoc<any>(workspaceDocRef);

  if (isLoading) {
    return (
      <div className="p-12">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-1/3 mt-4" />
        <Card className="mt-10">
            <CardHeader>
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-4 w-2/5 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-40" />
            </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return <div className="p-12 text-destructive">Ocorreu um erro ao carregar o workspace.</div>;
  }
  
  if (!workspace) {
    return <div className="p-12">Workspace não encontrado.</div>;
  }


  return (
    <div className="p-12">
      <h1 className="text-4xl font-headline font-bold tracking-tight">{workspace.name}</h1>
      <p className="text-muted-foreground mt-2">
        Este é o seu centro de comando. Cole conteúdo bruto para que a IA organize o conhecimento.
      </p>

      <Card className="mt-10">
        <CardHeader>
            <CardTitle>Análise de Conteúdo</CardTitle>
            <CardDescription>
                Cole qualquer conteúdo bruto (transcrição de áudio, PDF, anotações) para iniciar.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Fazer upload de arquivo
                </Button>
                <div className="relative w-full max-w-xs">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                        Ou
                        </span>
                    </div>
                </div>
            </div>
            <Textarea 
                placeholder="Cole seu conteúdo aqui..."
                className="min-h-[200px] text-base"
            />
             <Button>Analisar conteúdo</Button>
        </CardContent>
      </Card>

    </div>
  );
}
