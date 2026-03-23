import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-6 text-2xl font-bold">Acesso Negado</h1>
        <p className="mt-2 text-muted-foreground">
          Você não tem permissão para acessar esta página ou recurso.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Voltar para o Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
