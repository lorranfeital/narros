"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.6 1.62-4.88 1.62-4.42 0-8-3.58-8-8s3.58-8 8-8c2.43 0 4.13.93 5.37 2.13l2.6-2.6C18.96 2.66 16.21 1.5 12.48 1.5c-6.25 0-11.25 5-11.25 11.25s5 11.25 11.25 11.25c6.5 0 10.93-4.5 10.93-11.05 0-.73-.06-1.36-.18-1.95z"
      />
    </svg>
  );

export function AuthForm() {
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
          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard">
              <GoogleIcon className="mr-2 h-4 w-4" />
              Continuar com Google
            </Link>
            </Button>
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
            <div className="space-y-2">
              <Label htmlFor="email-login">Email</Label>
              <Input id="email-login" type="email" placeholder="m@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-login">Senha</Label>
              <Input id="password-login" type="password" />
            </div>
            <Button className="w-full" asChild>
              <Link href="/dashboard">Entrar</Link>
            </Button>
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
          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard">
              <GoogleIcon className="mr-2 h-4 w-4" />
              Continuar com Google
            </Link>
            </Button>
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
            <div className="space-y-2">
              <Label htmlFor="email-register">Email</Label>
              <Input id="email-register" type="email" placeholder="m@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-register">Senha</Label>
              <Input id="password-register" type="password" />
            </div>
            <Button className="w-full" asChild>
              <Link href="/dashboard">Criar conta</Link>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
