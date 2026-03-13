import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  Home,
  Search,
  Settings,
  FileText,
  Sparkles,
  Inbox,
  Library,
  Plus
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const navItems = [
    { icon: Search, label: "Search", href: "#" },
    { icon: Home, label: "Home", href: "/dashboard" },
    { icon: FileText, label: "Conteúdo", href: "#" },
    { icon: Sparkles, label: "Assistente", href: "#" },
    { icon: Inbox, label: "Caixa de Entrada", href: "#" },
    { icon: Library, label: "Playbooks", href: "#" },
    { icon: Settings, label: "Settings", href: "#" },
]

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "hidden w-72 flex-col border-r bg-secondary md:flex",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 p-2">
            <Logo showText={false} />
            <span className="font-bold">Narros</span>
        </div>

        <nav className="mt-4 flex flex-col gap-1">
            {navItems.map((item, index) => (
            <Link
                key={index}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
            </Link>
            ))}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <Button variant="ghost" className="w-full justify-start gap-3">
          <Plus className="h-4 w-4" />
          <span>New page</span>
        </Button>
      </div>
    </aside>
  );
}
