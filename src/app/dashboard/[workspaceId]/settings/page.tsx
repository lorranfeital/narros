
'use client';

import { useUser, useFirestore, useMemoFirebase, useStorage } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { updateProfile } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { BrandKit } from '@/lib/firestore-types';

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
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [logoPrincipalFile, setLogoPrincipalFile] = React.useState<File | null>(null);
  const [isUploadingPrincipal, setIsUploadingPrincipal] = React.useState(false);
  const [logoNegativoFile, setLogoNegativoFile] = React.useState<File | null>(null);
  const [isUploadingNegativo, setIsUploadingNegativo] = React.useState(false);

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
  const workspaceDocRef = useMemoFirebase(() => {
    if (!firestore || !workspaceId) return null;
    return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);
  const { data: currentWorkspace, isLoading: isWorkspacesLoading } = useDoc<any>(workspaceDocRef);

  const brandKitDocRef = useMemoFirebase(() => {
    if (!firestore || !workspaceId) return null;
    return doc(firestore, `workspaces/${workspaceId}/brand_kit`, 'live');
  }, [firestore, workspaceId]);
  const { data: currentBrandKit } = useDoc<BrandKit>(brandKitDocRef);

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
    if (!firestore || !workspaceDocRef) return;
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
    if (!logoFile || !currentWorkspace || !storage || !user || !workspaceDocRef) return;

    setIsUploading(true);
    const logoStoragePath = `workspaces/${currentWorkspace.id}/logo`;
    const logoStorageReference = storageRef(storage, logoStoragePath);

    try {
      const metadata = {
        customMetadata: {
          'ownerId': user.uid,
        },
      };

      await uploadBytes(logoStorageReference, logoFile, metadata);
      const downloadURL = await getDownloadURL(logoStorageReference);
      await updateDoc(workspaceDocRef, { logoUrl: downloadURL });

      toast({
        title: 'Ícone atualizado!',
        description: 'O novo ícone do seu workspace foi salvo com sucesso.',
      });
      setLogoFile(null);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Algo deu errado.',
        description: 'Não foi possível enviar o ícone. Verifique as permissões de armazenamento (CORS).',
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleLogoPrincipalUpload() {
    if (!logoPrincipalFile || !storage || !user || !brandKitDocRef) return;

    setIsUploadingPrincipal(true);
    const logoStoragePath = `workspaces/${workspaceId}/brandkit/logo-principal.png`;
    const logoStorageReference = storageRef(storage, logoStoragePath);

    try {
      await uploadBytes(logoStorageReference, logoPrincipalFile);
      const downloadURL = await getDownloadURL(logoStorageReference);
      await setDoc(brandKitDocRef, { logoPrincipalUrl: downloadURL }, { merge: true });

      toast({ title: 'Logo principal atualizado!' });
      setLogoPrincipalFile(null);
    } catch (error) {
      console.error('Error uploading principal logo:', error);
      toast({ variant: 'destructive', title: 'Erro ao enviar logo principal.' });
    } finally {
      setIsUploadingPrincipal(false);
    }
  }

  async function handleLogoNegativoUpload() {
    if (!logoNegativoFile || !storage || !user || !brandKitDocRef) return;

    setIsUploadingNegativo(true);
    const logoStoragePath = `workspaces/${workspaceId}/brandkit/logo-negativo.png`;
    const logoStorageReference = storageRef(storage, logoStoragePath);

    try {
      await uploadBytes(logoStorageReference, logoNegativoFile);
      const downloadURL = await getDownloadURL(logoStorageReference);
      await setDoc(brandKitDocRef, { logoNegativoUrl: downloadURL }, { merge: true });

      toast({ title: 'Logo negativo atualizado!' });
      setLogoNegativoFile(null);
    } catch (error) {
      console.error('Error uploading negative logo:', error);
      toast({ variant: 'destructive', title: 'Erro ao enviar logo negativo.' });
    } finally {
      setIsUploadingNegativo(false);
    }
  }


  return (
    <div className="p-12">
      <h1 className="text-4xl font-bold tracking-tight">Configurações</h1>
      <p className="text-muted-foreground mt-2">Gerencie as configurações da sua conta e de seus workspaces.</p>

      <Tabs defaultValue="profile" className="mt-10 max-w-2xl">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="connections">Conexões</TabsTrigger>
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                    <h3 className="font-medium leading-none tracking-tight">Ícone do Workspace (Favicon)</h3>
                    <div className="flex items-start gap-6 pt-2">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={currentWorkspace?.logoUrl} />
                            <AvatarFallback>{currentWorkspace?.name?.charAt(0) ?? 'W'}</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="logo-upload">Arquivo do ícone</Label>
                            <Input id="logo-upload" type="file" accept="image/png, image/jpeg, image/gif, image/svg+xml" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                            <p className="text-sm text-muted-foreground">Preferencialmente um arquivo quadrado (ex: .ico, .svg, ou .png 1:1).</p>
                        </div>
                    </div>
                     {logoFile && (
                        <Button onClick={handleLogoUpload} disabled={isUploading} className="mt-2">
                            {isUploading ? 'Enviando...' : 'Salvar ícone'}
                        </Button>
                    )}
                </div>
                <Separator className="my-8" />
                 <div className="space-y-4">
                    <h3 className="font-medium leading-none tracking-tight">Logo Principal</h3>
                    <div className="flex items-start gap-6 pt-2">
                        <Avatar className="h-16 w-32 rounded-sm bg-muted/50 p-1">
                            <AvatarImage src={currentBrandKit?.logoPrincipalUrl} className="object-contain" />
                            <AvatarFallback>Logo</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="logo-principal-upload">Arquivo do logo</Label>
                            <Input id="logo-principal-upload" type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => setLogoPrincipalFile(e.target.files?.[0] || null)} />
                            <p className="text-sm text-muted-foreground">Versão primária/colorida do logo (ex: horizontal).</p>
                        </div>
                    </div>
                     {logoPrincipalFile && (
                        <Button onClick={handleLogoPrincipalUpload} disabled={isUploadingPrincipal} className="mt-2">
                            {isUploadingPrincipal ? 'Enviando...' : 'Salvar logo principal'}
                        </Button>
                    )}
                </div>
                <Separator className="my-8" />
                 <div className="space-y-4">
                    <h3 className="font-medium leading-none tracking-tight">Logo Negativo</h3>
                    <div className="flex items-start gap-6 pt-2">
                        <Avatar className="h-16 w-32 rounded-sm bg-foreground p-1">
                            <AvatarImage src={currentBrandKit?.logoNegativoUrl} className="object-contain" />
                            <AvatarFallback className="bg-transparent text-background">Logo</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="logo-negativo-upload">Arquivo do logo</Label>
                            <Input id="logo-negativo-upload" type="file" accept="image/png, image/svg+xml" onChange={(e) => setLogoNegativoFile(e.target.files?.[0] || null)} />
                            <p className="text-sm text-muted-foreground">Versão branca/negativa do logo para fundos escuros.</p>
                        </div>
                    </div>
                     {logoNegativoFile && (
                        <Button onClick={handleLogoNegativoUpload} disabled={isUploadingNegativo} className="mt-2">
                            {isUploadingNegativo ? 'Enviando...' : 'Salvar logo negativo'}
                        </Button>
                    )}
                </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Workspace não encontrado ou você não tem permissão para vê-lo.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="connections">
            <Card>
                <CardHeader>
                  <CardTitle>Conexões</CardTitle>
                  <CardDescription>
                    Gerencie conexões com outros workspaces para compartilhar conhecimento.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-medium">Solicitar Nova Conexão</h3>
                      <p className="text-sm text-muted-foreground">
                        Procure por um workspace para enviar uma solicitação de conexão.
                      </p>
                      <div className="mt-4 flex gap-2">
                        <Input placeholder="Nome do workspace..." />
                        <Button>Buscar</Button>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium">Conexões Ativas</h3>
                      <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
                        <p className="text-sm text-muted-foreground">Nenhuma conexão ativa ainda.</p>
                      </div>
                    </div>

                      <Separator />

                      <div>
                          <h3 className="text-lg font-medium">Solicitações Pendentes</h3>
                          <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
                          <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
                          </div>
                      </div>
                  </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
