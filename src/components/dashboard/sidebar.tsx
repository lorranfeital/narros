'use client';

import { cn } from "@/lib/utils";
import {
  Home,
  Search,
  Settings,
  ChevronsUpDown,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { useAuth, useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter, useParams, usePathname } from "next/navigation";
import { collection, doc, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from "react";

export function Sidebar({ className }: { className?: string }) {
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const params = useParams();
  const pathname = usePathname();
  const workspaceId = params.workspaceId as string;

  const handleLogout = () => {
    signOut(auth).then(() => {
      router.push('/login');
    });
  };

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userDocRef);

  const workspacesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'workspaces'), where('members', 'array-contains', user.uid));
  }, [user, firestore]);
  const { data: workspaces, isLoading: isWorkspacesLoading } = useCollection<any>(workspacesQuery);

  const currentWorkspace = React.useMemo(() => {
    if (!workspaces || workspaces.length === 0) return null;
    // Prefer workspace from URL, fallback to first in the list
    if (workspaceId) {
      return workspaces.find(ws => ws.id === workspaceId) || workspaces[0];
    }
    return workspaces[0];
  }, [workspaces, workspaceId]);

  // This calculates the current page relative to the workspace root
  // e.g. /dashboard/ws1/settings -> /settings
  // e.g. /dashboard/ws1 -> ""
  const subPath = React.useMemo(() => {
    if (!workspaceId || !pathname.startsWith(`/dashboard/${workspaceId}`)) return '';
    return pathname.substring(`/dashboard/${workspaceId}`.length);
  }, [pathname, workspaceId]);

  const getPlanName = (plan: string | undefined) => {
    if (!plan) return '';
    if (plan === 'free') return 'Plano Grátis';
    if (plan === 'pro') return 'Plano Pro';
    return plan;
  }

  return (
    <aside
      className={cn(
        "hidden w-72 flex-col border-r bg-secondary md:flex",
        className
      )}
    >
        <div className="flex-1 p-2 space-y-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start gap-2 px-2 h-11">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={currentWorkspace?.logoUrl} />
                            <AvatarFallback>{currentWorkspace?.name?.charAt(0) ?? 'N'}</AvatarFallback>
                        </Avatar>
                        {isWorkspacesLoading ? (
                            <Skeleton className="h-4 w-32" />
                        ) : (
                            <span className="font-semibold text-sm truncate">{currentWorkspace?.name || 'Sem workspace'}</span>
                        )}
                        <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[270px]" align="start">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
                        {isWorkspacesLoading && (
                            <DropdownMenuItem disabled>
                                <div className="flex items-center gap-2">
                                     <Skeleton className="h-6 w-6 rounded-full" />
                                     <div className="flex flex-col gap-1 py-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                     </div>
                                </div>
                            </DropdownMenuItem>
                        )}
                        {workspaces?.map((ws) => (
                            <DropdownMenuItem key={ws.id} asChild>
                                <Link href={`/dashboard/${ws.id}${subPath}`}>
                                    <div className="flex items-center gap-2 w-full">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={ws.logoUrl} />
                                            <AvatarFallback>{ws.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{ws.name}</span>
                                            {isProfileLoading ? (
                                                <Skeleton className="h-3 w-16 mt-1" />
                                            ) : (
                                                <span className="text-xs text-muted-foreground">{getPlanName(userProfile?.plan)}</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                         {!isWorkspacesLoading && (!workspaces || workspaces.length === 0) && (
                            <DropdownMenuItem disabled>
                                <span className="text-xs text-muted-foreground">Nenhum workspace encontrado.</span>
                            </DropdownMenuItem>
                         )}

                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/new-workspace">
                            <Plus className="mr-2 h-4 w-4" />
                            <span>Criar ou entrar em workspace</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                         <Link href={currentWorkspace?.id ? `/dashboard/${currentWorkspace.id}/settings` : '#'}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Configurações</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <span>Sair</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <nav className="flex flex-col gap-0.5">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                    <Home className="h-4 w-4" />
                    <span>Início</span>
                </Link>
                {/* Search is disabled for now */}
                <span
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50"
                >
                    <Search className="h-4 w-4" />
                    <span>Buscar</span>
                </span>

                <Link
                    href={currentWorkspace ? `/dashboard/${currentWorkspace.id}/settings` : '#'}
                    className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        !currentWorkspace && "pointer-events-none opacity-50"
                    )}
                    aria-disabled={!currentWorkspace}
                    tabIndex={!currentWorkspace ? -1 : undefined}
                >
                    <Settings className="h-4 w-4" />
                    <span>Configurações</span>
                </Link>
            </nav>
        </div>

      <div className="mt-auto border-t p-2">
        {/* Placeholder for future items like invites */}
      </div>
    </aside>
  );
}
