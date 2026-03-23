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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { BrandKit, Workspace } from '@/lib/firestore-types';
import { ConnectionsManager } from '@/components/dashboard/connections-manager';
import { MembersManager } from '@/components/dashboard/members-manager';
import { cn } from '@/lib/utils';

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

  // Workspace Form
  const workspaceDocRef = useMemoFirebase(() => {
    if (!firestore || !workspaceId) return null;
    return doc(firestore, 'workspaces', workspaceId);
  }, [firestore, workspaceId]);
  const { data: currentWorkspace, isLoading: isWorkspacesLoading } = useDoc<Workspace>(workspaceDocRef);

  const brandKitDocRef = useMemoFirebase(() => {
    if (!firestore || !workspaceId) return null;
    return doc(firestore, `workspaces/${workspaceId}/brand_kit`, 'live');
  }, [firestore, workspaceId]);
  const { data: currentBrandKit } = useDoc<BrandKit>(brandKitDocRef);

  const workspaceForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: { name: '', type: 'empresa', sector: 'Alimentação' },
  });
  
  const userRole = currentWorkspace?.ownerId === user?.uid ? 'admin' : currentWorkspace?.roles?.[user?.uid ?? ''];
  const isAdmin = userRole === 'admin';

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
    if (!firestore || !workspaceDocRef || !isAdmin) return;
    try {
      await updateDoc(workspaceDocRef, {
        ...data,
        name_lowercase: data.name.toLowerCase(),
      });
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
    if (!logoFile || !currentWorkspace || !storage || !user || !workspaceDocRef || !isAdmin) return;

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
    if (!logoPrincipalFile || !storage || !user || !brandKitDocRef || !isAdmin) return;

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
    if (!logoNegativoFile || !storage || !user || !brandKitDocRef || !isAdmin) return;

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
      <h1 className="text-4xl font-bold tracking-tight">Configurações do Workspace</h1>
      <p className="text-muted-foreground mt-2">Gerencie as configurações deste workspace, membros e suas conexões.</p>

      <Tabs defaultValue="workspace" className="mt-10 max-w-2xl">
        <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-3" : "grid-cols-1")}>
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            {isAdmin && <TabsTrigger value="connections">Conexões</TabsTrigger>}
            {isAdmin && <TabsTrigger value="members">Membros</TabsTrigger>}
        </TabsList>
        <TabsContent value="workspace">
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
              <CardDescription>
                Gerencie as informações do seu workspace.
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
                            <Input placeholder="Nome do seu workspace" {...field} disabled={!isAdmin} />
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={!isAdmin}>
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={!isAdmin}>
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
                    {isAdmin && (
                        <Button type="submit" disabled={workspaceForm.formState.isSubmitting}>
                            {workspaceForm.formState.isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                        </Button>
                    )}
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
                            <Input id="logo-upload" type="file" accept="image/png, image/jpeg, image/gif, image/svg+xml" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} disabled={!isAdmin}/>
                            <p className="text-sm text-muted-foreground">Preferencialmente um arquivo quadrado (ex: .ico, .svg, ou .png 1:1).</p>
                        </div>
                    </div>
                     {logoFile && isAdmin && (
                        <Button onClick={handleLogoUpload} disabled={isUploading} className="mt-2">
                            {isUploading ? 'Enviando...' : 'Salvar ícone'}
                        </Button>
                    )}
                </div>
                {isAdmin && (
                    <>
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
                )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Workspace não encontrado ou você não tem permissão para vê-lo.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {isAdmin && (
            <TabsContent value="connections">
                <ConnectionsManager />
            </TabsContent>
        )}
        {isAdmin && (
            <TabsContent value="members">
                <MembersManager />
            </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
