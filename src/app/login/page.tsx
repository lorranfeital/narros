import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
            <Logo className="mx-auto" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Acesse sua conta
          </h1>
          <p className="text-sm text-muted-foreground">
            Entre para começar a organizar seu conhecimento.
          </p>
        </div>
        <AuthForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          Ao continuar, você concorda com nossos{" "}
          <a
            href="/terms"
            className="underline underline-offset-4 hover:text-primary"
          >
            Termos de Serviço
          </a>{" "}
          e{" "}
          <a
            href="/privacy"
            className="underline underline-offset-4 hover:text-primary"
          >
            Política de Privacidade
          </a>
          .
        </p>
      </div>
    </div>
  );
}
