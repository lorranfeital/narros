import { Building, HeartPulse, LandPlot, Scale } from "lucide-react";

const audiences = [
    {
        icon: Building,
        title: "Franquias e redes",
        description: "Padronize a operação entre unidades. O conhecimento do franqueador vira treinamento estruturado para cada novo franqueado."
    },
    {
        icon: Scale,
        title: "Escritórios de serviços",
        description: "Contabilidade, advocacia, imobiliárias. O jeito certo de fazer as coisas finalmente sai da cabeça dos sócios e vira um ativo."
    },
    {
        icon: HeartPulse,
        title: "Redes de saúde e clínicas",
        description: "Protocolos clínicos, atendimento ao paciente, processos administrativos. Conhecimento que precisa de precisão."
    },
    {
        icon: LandPlot,
        title: "Empresas em crescimento",
        description: "Quando a equipe cresce rápido demais para o onboarding boca a boca. A Narros escala o conhecimento junto com o headcount."
    }
]

export function ForWho() {
    return (
        <section className="py-20 md:py-32">
            <div className="container">
                <div className="mx-auto mb-16 max-w-2xl text-center">
                    <h2 className="font-headline text-3xl font-medium text-foreground sm:text-4xl">
                        Para negócios que crescem com pessoas.
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {audiences.map((audience) => (
                        <div key={audience.title} className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-card">
                                <audience.icon className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="mt-6 font-headline text-lg">{audience.title}</h3>
                            <p className="mt-2 text-muted-foreground">{audience.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
