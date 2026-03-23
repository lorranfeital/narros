// This file was created by the AI.
'use client';

import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  GraduationCap,
  Bot,
  LogOut,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter, useParams, usePathname } from "next/navigation";
import { doc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";

export function CollaboratorSidebar({ className }: { className?: string }) {
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();
  const params = useParams();
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

  const navItems = [
    { href: `/collaborator/${workspaceId}/home`, label: "Início", icon: Home },
    { href: `/collaborator/${workspaceId}/knowledge`, label: "Conhecimento", icon: BookOpen },
    { href: `/collaborator/${workspaceId}/trainings`, label: "Treinamentos", icon: GraduationCap },
    { href: `/collaborator/${workspaceId}/assistant`, label: "Assistente", icon: Bot },
  ];

  return (
    <aside
      className={cn(
        "hidden w-52 flex-col border-r bg-secondary/50 md:flex",
        className
      )}
    >
        <div className="flex h-16 items-center border-b px-6">
            <Logo />
        </div>
        <div className="flex-1 p-4 space-y-2">
            <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
                            pathname === item.href && "bg-primary/10 text-primary"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>

        <div className="mt-auto border-t p-4">
            {isProfileLoading ? (
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.photoURL ?? undefined} />
                        <AvatarFallback>{userProfile?.name?.charAt(0) ?? 'C'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold truncate">{userProfile?.name ?? user?.displayName}</span>
                        <Badge variant="outline">Colaborador</Badge>
                    </div>
                </div>
            )}
             <Button variant="ghost" size="sm" className="w-full justify-start mt-4 text-muted-foreground" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
            </Button>
        </div>
    </aside>
  );
}
