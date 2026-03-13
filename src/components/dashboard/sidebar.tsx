import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  Home,
  Search,
  Settings,
  FileText,
  ChevronsUpDown,
  Plus,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";

const mainNavItems = [
    { icon: Search, label: "Buscar", href: "#" },
    { icon: Home, label: "Início", href: "/dashboard" },
    { icon: Settings, label: "Configurações", href: "#" },
]

const docItems = [
    { icon: FileText, label: "Manifesto Beacon", href: "#" },
    { icon: FileText, label: "Ajustar formulário do difusor", href: "#" },
    { icon: FileText, label: "Criar post manifesto fixo", href: "#" },
    { icon: FileText, label: "Publicar 1ª edição da newsletter", href: "#" },
    { icon: FileText, label: "Novo item", href: "#" },
]

export function Sidebar({ className }: { className?: string }) {
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
                        <Logo showText={false} iconClassName="w-5 h-5" />
                        <span className="font-semibold text-sm">Workspace do Lorran</span>
                        <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[270px]" align="start">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
                        <DropdownMenuItem>
                            <div className="flex items-center gap-2">
                                <Logo showText={false} iconClassName="w-5 h-5" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Workspace do Lorran</span>
                                    <span className="text-xs text-muted-foreground">Plano Grátis</span>
                                </div>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Criar ou entrar em workspace</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configurações</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
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

            <div className="">
                <h3 className="px-2 text-xs font-semibold text-muted-foreground/80 tracking-wider uppercase">Recentes</h3>
                <nav className="mt-1 flex flex-col gap-0.5">
                    {docItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    >
                        <item.icon className="h-4 w-4" />
                        <span className="truncate">{item.label}</span>
                    </Link>
                    ))}
                </nav>
            </div>
        </div>


      <div className="mt-auto border-t p-2">
        <Button variant="ghost" className="w-full justify-start gap-2 text-sm font-normal text-muted-foreground">
          <UserPlus className="h-4 w-4" />
          <span>Convidar membros</span>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2 text-sm font-normal text-muted-foreground">
          <Plus className="h-4 w-4" />
          <span>Nova página</span>
        </Button>
      </div>
    </aside>
  );
}
