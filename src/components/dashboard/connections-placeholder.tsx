import { Link2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ConnectionsPlaceholder() {
  return (
    <Alert>
      <Link2 className="h-4 w-4" />
      <AlertTitle>Em breve: Conexões entre Workspaces</AlertTitle>
      <AlertDescription>
        Esta área permitirá que você conecte seu workspace a outros, como filiais de uma franquia ou empresas de um mesmo grupo. Você poderá compartilhar conhecimento e descobrir insights entre operações.
      </AlertDescription>
    </Alert>
  );
}
