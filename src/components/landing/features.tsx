import { Brain, FileText, GraduationCap } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Cole qualquer conteúdo",
    description: "Áudio transcrito, PDF, reunião gravada, anotação. A Narros lê e entende qualquer formato.",
  },
  {
    icon: Brain,
    title: "IA organiza o conhecimento",
    description: "Processos viram categorias, playbooks e gaps de conhecimento são identificados automaticamente.",
  },
  {
    icon: GraduationCap,
    title: "Treinamento pronto",
    description: "Receba módulos de treinamento com duração, objetivos e formato sugerido, prontos para aplicar.",
  },
];

export function Features() {
  return (
    <section className="py-20 md:py-32 bg-card border-y">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-headline text-3xl font-medium text-foreground sm:text-4xl">
            Não é só organizar. É fazer o conhecimento trabalhar.
          </h2>
          <p className="mt-4 text-muted-foreground">
            A Narros transforma conteúdo bruto em ativos operacionais que sua empresa usa todos os dias.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-start gap-4 rounded-lg bg-background p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-headline font-medium text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
