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
import { useRouter } from "next/navigation";
import { collection, doc, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const mainNavItems = [
    { icon: Search, label: "Buscar", href: "#" },
    { icon: Home, label: "Início", href: "/dashboard" },
    { icon: Settings, label: "Configurações", href: "/dashboard/settings" },
]

export function Sidebar({ className }: { className?: string }) {
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

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

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null;

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
                            <DropdownMenuItem key={ws.id}>
                                <div className="flex items-center gap-2">
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
                        <Link href="/dashboard/settings">
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
                {mainNavItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>

      <div className="mt-auto border-t p-2">
        {/* Placeholder for future items like invites */}
      </div>
    </aside>
  );
}
