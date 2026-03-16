'use client';

import React, { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { searchWorkspaces, SearchableWorkspace } from '@/lib/actions/connections-actions';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export function ConnectionsManager() {
    const params = useParams();
    const { toast } = useToast();
    const workspaceId = params.workspaceId as string;

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchableWorkspace[]>([]);
    const [isSearching, startSearchTransition] = useTransition();

    const handleSearch = () => {
        if (searchTerm.trim().length < 2) {
            toast({
                variant: 'destructive',
                title: 'Busca inválida',
                description: 'Por favor, digite pelo menos 2 caracteres para buscar.',
            });
            return;
        }
        startSearchTransition(async () => {
            const results = await searchWorkspaces(searchTerm, workspaceId);
            setSearchResults(results);
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Conexões</CardTitle>
                <CardDescription>
                Gerencie conexões com outros workspaces para compartilhar conhecimento.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                <div>
                    <h3 className="text-lg font-medium">Solicitar Nova Conexão</h3>
                    <p className="text-sm text-muted-foreground">
                    Procure por um workspace para enviar uma solicitação de conexão.
                    </p>
                    <div className="mt-4 flex gap-2">
                    <Input 
                        placeholder="Nome do workspace..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isSearching}>
                        {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Buscar
                    </Button>
                    </div>

                    {/* Search Results */}
                    {isSearching && <div className="mt-4 text-sm text-muted-foreground">Buscando...</div>}
                    {!isSearching && searchResults.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {searchResults.map(result => (
                                <div key={result.id} className="flex items-center justify-between rounded-md border p-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={result.logoUrl} />
                                            <AvatarFallback>{result.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-medium">{result.name}</p>
                                    </div>
                                    <Button variant="outline" size="sm">Conectar</Button>
                                </div>
                            ))}
                        </div>
                    )}
                     {!isSearching && searchTerm && searchResults.length === 0 && (
                        <p className="mt-4 text-sm text-muted-foreground">Nenhum workspace encontrado.</p>
                     )}


                </div>

                <Separator />

                <div>
                    <h3 className="text-lg font-medium">Conexões Ativas</h3>
                    <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
                    <p className="text-sm text-muted-foreground">Nenhuma conexão ativa ainda.</p>
                    </div>
                </div>

                    <Separator />

                    <div>
                        <h3 className="text-lg font-medium">Solicitações Pendentes</h3>
                        <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
                        <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}