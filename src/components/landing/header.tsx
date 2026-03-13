import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ArrowRight } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="container flex h-14 items-center">
        <Logo />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            <Link
              href="#"
              className="text-foreground/60 transition-colors hover:text-foreground/80"
            >
              Produto
            </Link>
            <Link
              href="#"
              className="text-foreground/60 transition-colors hover:text-foreground/80"
            >
              Preços
            </Link>
            <Link
              href="/login"
              className="text-foreground/60 transition-colors hover:text-foreground/80"
            >
              Entrar
            </Link>
          </nav>
          <Button asChild>
            <Link href="/login">
              Começar grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
