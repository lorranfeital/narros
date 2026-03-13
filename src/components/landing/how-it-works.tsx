import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
    {
      step: "01",
      title: "Você traz qualquer conteúdo",
      description: "Transcrição de áudio, ata de reunião, PDF antigo, e-mail com instruções, anotação de caderno. Qualquer formato. Quanto mais conteúdo, melhor a história que a Narros conta.",
    },
    {
        step: "02",
        title: "A IA lê, entende e organiza",
        description: "A Narros identifica o tipo de operação, extrai os processos, detecta os gaps e monta a estrutura — categorias, playbooks, pautas de treinamento — sem você precisar configurar nada.",
    },
    {
        step: "03",
        title: "Você navega, edita e compartilha",
        description: "A base de conhecimento fica viva e editável. Sua equipe pode perguntar diretamente para a IA — e ela responde com base no que sua empresa documentou.",
    },
    {
        step: "04",
        title: "O conhecimento escala com você",
        description: "Cada nova análise enriquece a narrativa. Quanto mais você alimenta, mais precisa e completa fica a história operacional da sua empresa.",
    }
]

export function HowItWorks() {
  return (
    <section className="py-20 md:py-32">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="font-headline text-3xl font-medium text-foreground sm:text-4xl">
            Cole o caos. Receba a estrutura.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {steps.map((item) => (
                <Card key={item.step} className="relative overflow-hidden bg-card p-6">
                    <div className="absolute -top-4 -right-4 font-headline text-8xl text-foreground/5">{item.step}</div>
                    <CardHeader className="p-0">
                        <CardTitle className="text-xl">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                        <p className="text-muted-foreground">{item.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </section>
  );
}
