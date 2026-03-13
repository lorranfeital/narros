'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, doc, query, updateDoc, where } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { updateProfile } from 'firebase/auth';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const sectorEnum = z.enum([
  'Agricultura',
  'Alimentação',
  'Construção',
  'Contabilidade',
  'Consultoria',
  'Educação',
  'Engenharia',
  'Financeiro',
  'Imobiliário',
  'Jurídico',
  'Marketing e Publicidade',
  'Mídia e Entretenimento',
  'Saúde',
  'Serviços',
  'Tecnologia',
  'Transporte e Logística',
  'Turismo e Hotelaria',
  'Varejo',
  'Outro',
]);

const workspaceFormSchema = z.object({
  name: z.string().min(2, { message: 'O nome do workspace deve ter pelo menos 2 caracteres.' }),
  type: z.enum(['franquia', 'rede', 'escritório', 'clínica', 'loja', 'outro']),
  sector: sectorEnum,
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // User Profile Form
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userDocRef);
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: '', email: '' },
  });

  React.useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        name: userProfile.name || '',
        email: userProfile.email || '',
      });
    }
  }, [userProfile, profileForm]);

  async function onProfileSubmit(data: ProfileFormValues) {
    if (!user || !userDocRef) return;
    try {
      await updateDoc(userDocRef, { name: data.name });
      if (user.displayName !== data.name) {
        await updateProfile(user, { displayName: data.name });
      }
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Algo deu errado.',
        description: 'Não foi possível atualizar seu perfil. Tente novamente.',
      });
    }
  }

  // Workspace Form
  const workspacesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'workspaces'), where('ownerId', '==', user.uid));
  }, [user, firestore]);
  const { data: workspaces, isLoading: isWorkspacesLoading } = useCollection<any>(workspacesQuery);
  const currentWorkspace = workspaces?.[0];

  const workspaceForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: { name: '', type: 'franquia', sector: 'Alimentação' },
  });

  React.useEffect(() => {
    if (currentWorkspace) {
      workspaceForm.reset({
        name: currentWorkspace.name || '',
        type: currentWorkspace.type || 'franquia',
        sector: currentWorkspace.sector || 'Alimentação',
      });
    }
  }, [currentWorkspace, workspaceForm]);

  async function onWorkspaceSubmit(data: WorkspaceFormValues) {
    if (!firestore || !currentWorkspace) return;
    const workspaceDocRef = doc(firestore, 'workspaces', currentWorkspace.id);
    try {
      await updateDoc(workspaceDocRef, data);
      toast({
        title: 'Workspace atualizado!',
        description: 'As informações do seu workspace foram salvas.',
      });
    } catch (error) {
      console.error('Error updating workspace:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Algo deu errado.',
        description: 'Não foi possível atualizar seu workspace. Tente novamente.',
      });
    }
  }

  return (
    <div className="p-12">
      <h1 className="text-4xl font-bold tracking-tight">Configurações</h1>
      <p className="text-muted-foreground mt-2">Gerencie as configurações da sua conta e de seus workspaces.</p>

      <div className="mt-10 grid gap-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              Estas são suas informações. O e-mail não pode ser alterado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isProfileLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu e-mail" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                    {profileForm.formState.isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>
              Gerencie as informações do seu workspace principal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isWorkspacesLoading ? (
               <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            ) : currentWorkspace ? (
              <Form {...workspaceForm}>
                <form onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-8">
                  <FormField
                    control={workspaceForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Workspace</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do seu workspace" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={workspaceForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de negócio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="franquia">Franquia</SelectItem>
                            <SelectItem value="rede">Rede</SelectItem>
                            <SelectItem value="escritório">Escritório</SelectItem>
                            <SelectItem value="clínica">Clínica</SelectItem>
                            <SelectItem value="loja">Loja</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={workspaceForm.control}
                    name="sector"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                           <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor de atuação" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                             {sectorEnum.options.map((sector) => (
                                <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={workspaceForm.formState.isSubmitting}>
                    {workspaceForm.formState.isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </form>
              </Form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você ainda não possui um workspace. Crie um no seu dashboard para poder gerenciá-lo aqui.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
