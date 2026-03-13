import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative py-20 md:py-32">
       <div
        aria-hidden="true"
        className="absolute inset-0 top-0 -z-10 grid h-full w-full grid-cols-2 -space-x-52 opacity-20"
      >
        <div className="h-full w-full bg-gradient-to-br from-primary/20 to-pink-500/5 blur-3xl"></div>
        <div className="h-full w-full bg-gradient-to-tr from-primary/10 to-cyan-500/5 blur-3xl"></div>
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px] opacity-50"
      ></div>

      <div className="container text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-headline text-4xl font-medium tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Toda empresa tem uma história operacional.
            <br />
            <span className="font-headline italic text-primary">
              A Narros organiza ela.
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Áudios de WhatsApp, reuniões gravadas, PDFs esquecidos, anotações de bastidor. A Narros lê tudo isso e devolve uma narrativa que sua equipe consegue aprender, replicar e evoluir.
          </p>
        </div>
        <div className="mt-10 flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/login">Testar agora</Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link href="#">Ver demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
