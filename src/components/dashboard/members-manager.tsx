
'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User, Workspace, WorkspaceRole } from '@/lib/firestore-types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, User as UserIcon, Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

import { inviteUserToWorkspace, updateUserRole, removeUserFromWorkspace, updateUserName } from '@/lib/actions/members-actions';

function UserRow({
    member,
    role,
    isOwner,
    isCurrentUser,
    onRoleChange,
    onRemove,
    onNameChange,
    isProcessing,
    isViewingUserAdmin,
}: {
    member: User;
    role: WorkspaceRole;
    isOwner: boolean;
    isCurrentUser: boolean;
    onRoleChange: (userId: string, newRole: WorkspaceRole) => void;
    onRemove: (userId: string) => void;
    onNameChange: (userId: string, newName: string) => void;
    isProcessing: boolean;
    isViewingUserAdmin: boolean;
}) {
  const [name, setName] = useState(member.name || '');

  useEffect(() => {
      setName(member.name || '');
  }, [member.name]);

  return (
    <div className="flex items-center justify-between space-x-4 p-2 rounded-md hover:bg-muted/50">
      <div className="flex items-center space-x-4">
        <Avatar>
          <AvatarImage src={(member as any).photoURL} />
          <AvatarFallback>{member.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium leading-none">{member.name} {isCurrentUser && '(Você)'}</p>
            {isViewingUserAdmin && !isOwner && (
                 <AlertDialog onOpenChange={(open) => !open && setName(member.name || '')}>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isProcessing}>
                            <Pencil className="h-3 w-3" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Alterar nome de {member.name}</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta alteração será refletida em toda a plataforma para este usuário.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                            <Label htmlFor="name-input">Nome do membro</Label>
                            <Input id="name-input" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                if (name !== member.name && name?.trim()) {
                                    onNameChange(member.id, name);
                                }
                            }} disabled={isProcessing || name === member.name || !name || !name.trim()}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
         {isOwner ? (
            <p className="text-sm font-medium text-muted-foreground mr-4">Proprietário</p>
         ) : (
            <>
            <Select 
                defaultValue={role} 
                onValueChange={(newRole) => onRoleChange(member.id, newRole as WorkspaceRole)}
                disabled={isCurrentUser || isProcessing}
            >
                <SelectTrigger className="w-[120px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="curator">Curador</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="collaborator">Colaborador</SelectItem>
                </SelectContent>
            </Select>
            
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isCurrentUser || isProcessing}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Remover {member.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O usuário perderá o acesso a este workspace.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onRemove(member.id)} className="bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </>
         )}
      </div>
    </div>
  );
}

export function MembersManager() {
    const params = useParams();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: currentUser, isUserLoading } = useUser();
    const workspaceId = params.workspaceId as string;

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
    const [isSubmitting, startTransition] = useTransition();

    const workspaceDocRef = useMemo(() => {
        if (!firestore || !workspaceId) return null;
        return doc(firestore, 'workspaces', workspaceId);
    }, [firestore, workspaceId]);
    const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

    const [members, setMembers] = useState<User[]>([]);
    const [areMembersLoading, setAreMembersLoading] = useState(true);
    const memberIds = useMemo(() => workspace?.members || [], [workspace]);

    useEffect(() => {
        if (!firestore || !workspace) return;

        if (memberIds.length === 0) {
            setMembers([]);
            setAreMembersLoading(false);
            return;
        }

        const fetchMembers = async () => {
            setAreMembersLoading(true);
            try {
                const userPromises = memberIds.map(uid => getDoc(doc(firestore, 'users', uid)));
                const userSnaps = await Promise.all(userPromises);
                const fetchedUsers = userSnaps
                    .filter(snap => snap.exists())
                    .map(snap => ({ ...snap.data(), id: snap.id } as User));
                setMembers(fetchedUsers);
            } catch (error: any) {
                console.error("Failed to fetch members:", error);
                toast({ variant: 'destructive', title: "Erro ao buscar membros", description: "Você pode não ter permissão para ver todos os membros." });
            } finally {
                setAreMembersLoading(false);
            }
        };

        fetchMembers();
    }, [firestore, workspace, memberIds, toast]);
    
    const handleInviteUser = () => {
        if (!currentUser) return;
        startTransition(async () => {
            const result = await inviteUserToWorkspace(workspaceId, inviteEmail, inviteRole, currentUser.uid);
            if (result.success) {
                toast({ title: "Sucesso!", description: result.message });
                setInviteEmail('');
            } else {
                toast({ variant: 'destructive', title: "Erro ao convidar", description: result.message });
            }
        });
    }

    const handleRoleChange = (userId: string, newRole: WorkspaceRole) => {
        if (!currentUser) return;
        startTransition(async () => {
            const result = await updateUserRole(workspaceId, userId, newRole, currentUser.uid);
            if (result.success) {
                toast({ title: "Sucesso!", description: result.message });
            } else {
                toast({ variant: 'destructive', title: "Erro", description: result.message });
            }
        });
    };

    const handleNameChange = (userId: string, newName: string) => {
        if (!currentUser) return;
        startTransition(async () => {
            const result = await updateUserName(workspaceId, userId, newName, currentUser.uid);
            if (result.success) {
                toast({ title: "Sucesso!", description: result.message });
            } else {
                toast({ variant: 'destructive', title: "Erro", description: result.message });
            }
        });
    };

    const handleRemoveUser = (userId: string) => {
        if (!currentUser) return;
        startTransition(async () => {
             const result = await removeUserFromWorkspace(workspaceId, userId, currentUser.uid);
            if (result.success) {
                toast({ title: "Sucesso!", description: result.message });
            } else {
                toast({ variant: 'destructive', title: "Erro", description: result.message });
            }
        });
    }

    const isLoading = isUserLoading || isWorkspaceLoading || areMembersLoading;
    const currentRole = currentUser && workspace ? (workspace.ownerId === currentUser.uid ? 'admin' : workspace.roles?.[currentUser.uid]) : undefined;
    const isAdmin = currentRole === 'admin';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Membros do Workspace</CardTitle>
                <CardDescription>
                    Gerencie quem tem acesso a este workspace e seus respectivos perfis de permissão.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 {isAdmin && (
                    <div>
                        <h3 className="text-lg font-medium">Convidar novo membro</h3>
                        <div className="mt-4 flex gap-2">
                        <Input 
                            placeholder="E-mail do novo membro" 
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            disabled={isSubmitting}
                        />
                         <Select defaultValue="member" onValueChange={(value) => setInviteRole(value as WorkspaceRole)} disabled={isSubmitting}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="member">Membro</SelectItem>
                                <SelectItem value="curator">Curador</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="collaborator">Colaborador</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={handleInviteUser} disabled={isSubmitting || !inviteEmail}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus />}
                            Convidar
                        </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">O usuário deve ter uma conta existente na plataforma para ser convidado.</p>
                    </div>
                 )}

                <Separator />
                
                <div>
                     <h3 className="text-lg font-medium">Membros Atuais ({members?.length || 0})</h3>
                      <div className="mt-4 space-y-2">
                        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                        
                        {!isLoading && members && members.map(member => (
                            <UserRow 
                                key={member.id}
                                member={member}
                                role={workspace?.roles?.[member.id] || 'member'}
                                isOwner={workspace?.ownerId === member.id}
                                isCurrentUser={currentUser?.uid === member.id}
                                onRoleChange={handleRoleChange}
                                onRemove={handleRemoveUser}
                                onNameChange={handleNameChange}
                                isProcessing={isSubmitting}
                                isViewingUserAdmin={isAdmin}
                            />
                        ))}
                         {!isLoading && (!members || members.length === 0) && (
                             <div className="text-center p-8 border rounded-lg bg-card/50">
                                <UserIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">Nenhum membro encontrado.</p>
                            </div>
                         )}
                      </div>
                </div>

            </CardContent>
        </Card>
    );
}
