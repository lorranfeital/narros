import { CreateWorkspaceForm } from '@/components/dashboard/create-workspace-form';
import { Logo } from '@/components/logo';

export default function NewWorkspacePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto flex w-full max-w-md flex-col justify-center space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <Logo className="mx-auto" />
          <h1 className="text-2xl font-headline font-semibold tracking-tight">
            Crie seu primeiro workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            O workspace é o ambiente isolado onde todo o conhecimento da sua
            operação vai viver.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
            <CreateWorkspaceForm />
        </div>
      </div>
    </div>
  );
}
