import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History } from "lucide-react";

const recentItems = [
    { title: "Criar post 'Antes de automatizar ...'", date: "Dec 4, 2025" },
    { title: "Manifesto Beacon", date: "Dec 9, 2025" },
    { title: "Ajustar formulário do ...", date: "Dec 3, 2025" },
    { title: "Criar post manifesto fixo ...", date: "Nov 19, 2025" },
    { title: "Publicar 1ª edição da newsletter ...", date: "Dec 19, 2025" },
    { title: "New item", date: "Nov 11, 2025" },
]

export default function DashboardPage() {
    return (
        <div className="p-12">
            <h1 className="text-4xl font-bold tracking-tight">Good morning</h1>
            <div className="mt-10">
                <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <History className="h-4 w-4" />
                    <span>Recently visited</span>
                </h2>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {recentItems.map((item) => (
                        <Card key={item.title}>
                            <CardContent className="p-4 space-y-3">
                                <div className="h-16 w-full rounded bg-muted/50"></div>
                                <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                        <AvatarFallback>CN</AvatarFallback>
                                    </Avatar>
                                    <p className="text-xs text-muted-foreground">{item.date}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
