
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Building, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { signOut } from "firebase/auth";
import { useAuth } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";


export function AdminSidebar() {
    const pathname = usePathname();
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        signOut(auth).then(() => {
          router.push('/login');
        });
      };

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/workspaces', label: 'Workspaces', icon: Building },
        { href: '/admin/users', label: 'Usuários', icon: Users },
    ];

    return (
        <aside className="hidden w-64 flex-col border-r bg-secondary md:flex">
            <div className="flex h-16 items-center border-b px-6">
                <Logo />
                 <span className="ml-2 text-sm font-semibold text-muted-foreground">Admin</span>
            </div>
            <div className="flex-1 p-2 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                            pathname === item.href && "bg-muted text-foreground"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </div>
             <div className="mt-auto border-t p-2">
                <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                </Button>
            </div>
        </aside>
    );
}
