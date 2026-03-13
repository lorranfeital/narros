"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, useUser } from "@/firebase";
import { initiateEmailSignIn, initiateEmailSignUp, initiateGoogleSignIn, initiateMicrosoftSignIn } from "@/firebase/non-blocking-login";
import { useRouter } from "next/navigation";


const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="-0.5 0 48 48" xmlns="http://www.w3.org/2000/svg" {...props}>
        <g fill="none" fillRule="evenodd">
            <path d="M9.827 24c0-1.524.253-2.986.705-4.356l-7.909-6.04A23.46 23.46 0 0 0 .213 24c0 3.737.868 7.26 2.407 10.388l7.905-6.05A13.9 13.9 0 0 1 9.827 24" fill="#fbbc05"/>
            <path d="M23.714 10.133c3.311 0 6.302 1.174 8.652 3.094L39.202 6.4C35.036 2.773 29.695.533 23.714.533a23.43 23.43 0 0 0-21.09 13.071l7.908 6.04a13.85 13.85 0 0 1 13.182-9.51" fill="#eb4335"/>
            <path d="M23.714 37.867a13.85 13.85 0 0 1-13.182-9.51l-7.909 6.038a23.43 23.43 0 0 0 21.09 13.072c5.732 0 11.205-2.036 15.312-5.849l-7.507-5.804c-2.118 1.335-4.786 2.053-7.804 2.053" fill="#34a853"/>
            <path d="M46.145 24c0-1.387-.213-2.88-.534-4.267H23.714V28.8h12.604c-.63 3.091-2.346 5.468-4.8 7.014l7.507 5.804c4.314-4.004 7.12-9.969 7.12-17.618" fill="#4285f4"/>
        </g>
    </svg>
);

const MicrosoftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M1 1h9v9H1z" fill="#f25022"/>
        <path d="M11 1h9v9h-9z" fill="#7fba00"/>
        <path d="M1 11h9v9H1z" fill="#00a4ef"/>
        <path d="M11 11h9v9h-9z" fill="#ffb900"/>
    </svg>
);

export function AuthForm() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  
  const auth = useAuth();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    initiateEmailSignIn(auth, loginEmail, loginPassword);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    initiateEmailSignUp(auth, registerEmail, registerPassword);
  };
  
  const handleGoogleSignIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    initiateGoogleSignIn(auth);
  };

  const handleMicrosoftSignIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    initiateMicrosoftSignIn(auth);
  };

  return (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Entrar</TabsTrigger>
        <TabsTrigger value="register">Criar conta</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <Card className="border-0 shadow-none">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="font-body text-base font-normal">
              Use sua conta para entrar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                <GoogleIcon className="mr-2 h-4 w-4" />
                Continuar com Google
              </Button>
              <Button variant="outline" className="w-full" onClick={handleMicrosoftSignIn}>
                <MicrosoftIcon className="mr-2 h-4 w-4" />
                Continuar com Microsoft
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continue com
                </span>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-login">Email</Label>
                <Input id="email-login" type="email" placeholder="m@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-login">Senha</Label>
                <Input id="password-login" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="register">
      <Card className="border-0 shadow-none">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="font-body text-base font-normal">
              Crie sua conta para começar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                <GoogleIcon className="mr-2 h-4 w-4" />
                Continuar com Google
              </Button>
              <Button variant="outline" className="w-full" onClick={handleMicrosoftSignIn}>
                <MicrosoftIcon className="mr-2 h-4 w-4" />
                Continuar com Microsoft
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continue com
                </span>
              </div>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-register">Email</Label>
                <Input id="email-register" type="email" placeholder="m@example.com" value={registerEmail} onChange={e => setRegisterEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-register">Senha</Label>
                <Input id="password-register" type="password" value={registerPassword} onChange={e => setRegisterPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">Criar conta</Button>
              </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
