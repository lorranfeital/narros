'use client';

import { useUser, useFirestore, useMemoFirebase, useStorage } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, doc, query, updateDoc, where } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { updateProfile } from 'firebase/auth';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';

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
  type: z.enum(['empresa', 'grupo', 'franquia', 'rede', 'loja', 'clínica', 'escritório', 'outro']),
  sector: sectorEnum,
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

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
    defaultValues: { name: '', type: 'empresa', sector: 'Alimentação' },
  });

  React.useEffect(() => {
    if (currentWorkspace) {
      workspaceForm.reset({
        name: currentWorkspace.name || '',
        type: currentWorkspace.type || 'empresa',
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

  async function handleLogoUpload() {
    if (!logoFile || !currentWorkspace || !storage) return;

    setIsUploading(true);
    const logoStoragePath = `workspaces/${currentWorkspace.id}/logo`;
    const logoStorageReference = storageRef(storage, logoStoragePath);
    const workspaceDocRef = doc(firestore, 'workspaces', currentWorkspace.id);

    try {
      await uploadBytes(logoStorageReference, logoFile);
      const downloadURL = await getDownloadURL(logoStorageReference);
      await updateDoc(workspaceDocRef, { logoUrl: downloadURL });

      toast({
        title: 'Logo atualizado!',
        description: 'O novo logo do seu workspace foi salvo com sucesso.',
      });
      setLogoFile(null);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Algo deu errado.',
        description: 'Não foi possível enviar o logo. Verifique as permissões de armazenamento.',
      });
    } finally {
      setIsUploading(false);
    }
  }


  return (
    <div className="p-12">
      <h1 className="text-4xl font-bold tracking-tight">Configurações</h1>
      <p className="text-muted-foreground mt-2">Gerencie as configurações da sua conta e de seus workspaces.</p>

      <Tabs defaultValue="profile" className="mt-10 max-w-2xl">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
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
        </TabsContent>
        <TabsContent value="workspace">
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
                <>
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
                                <SelectItem value="empresa">Empresa</SelectItem>
                                <SelectItem value="grupo">Grupo</SelectItem>
                                <SelectItem value="franquia">Franquia</SelectItem>
                                <SelectItem value="rede">Rede</SelectItem>
                                <SelectItem value="loja">Loja</SelectItem>
                                <SelectItem value="clínica">Clínica</SelectItem>
                                <SelectItem value="escritório">Escritório</SelectItem>
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
                <Separator className="my-8" />
                <div className="space-y-4">
                    <h3 className="font-medium leading-none tracking-tight">Logo do Workspace</h3>
                    <div className="flex items-start gap-6 pt-2">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={currentWorkspace?.logoUrl} />
                            <AvatarFallback>{currentWorkspace?.name?.charAt(0) ?? 'W'}</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="logo-upload">Arquivo do logo</Label>
                            <Input id="logo-upload" type="file" accept="image/png, image/jpeg, image/gif" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                            <FormDescription>Selecione uma imagem para ser o logo do seu workspace.</FormDescription>
                        </div>
                    </div>
                     {logoFile && (
                        <Button onClick={handleLogoUpload} disabled={isUploading} className="mt-2">
                            {isUploading ? 'Enviando...' : 'Salvar logo'}
                        </Button>
                    )}
                </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Você ainda não possui um workspace. Crie um no seu dashboard para poder gerenciá-lo aqui.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
