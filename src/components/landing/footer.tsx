import Link from "next/link";
import { Logo } from "@/components/logo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Logo showText={false} />
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {currentYear} Narros. Todos os direitos reservados.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="#" className="transition-colors hover:text-foreground">Termos</Link>
            <Link href="#" className="transition-colors hover:text-foreground">Privacidade</Link>
            <Link href="#" className="transition-colors hover:text-foreground">Contato</Link>
        </div>
      </div>
    </footer>
  );
}
