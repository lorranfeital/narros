import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CallToAction() {
  return (
    <section className="py-20 md:py-32">
      <div className="container text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-headline text-3xl font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Sua história operacional merece ser contada.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Junte-se às empresas que estão transformando o conhecimento que vive em áudio de WhatsApp em estrutura que escala.
          </p>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/login">Começar grátis</Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link href="#">Falar com a equipe</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Grátis para começar · Sem cartão de crédito · Resultado em 30 segundos</p>
      </div>
    </section>
  );
}
