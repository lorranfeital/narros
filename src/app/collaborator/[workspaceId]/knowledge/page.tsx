// This file was created by the AI.
'use client';

import React, { useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  PublishedKnowledge,
  KnowledgeItem,
  Workspace,
} from '@/lib/firestore-types';

export default function CollaboratorKnowledgePage() {
  const firestore = useFirestore();
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);

  // Fetch Workspace for name
  const workspaceDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'workspaces', workspaceId) : null),
    [firestore, workspaceId]
  );
  const { data: workspace, isLoading: isWorkspaceLoading } =
    useDoc<Workspace>(workspaceDocRef);

  // Fetch the single LIVE published knowledge document.
  const publishedKnowledgeDocRef = useMemoFirebase(() => {
    if (!firestore || !workspaceId) return null;
    return doc(
      firestore,
      `workspaces/${workspaceId}/published_knowledge`,
      workspaceId
    );
  }, [firestore, workspaceId]);
  const { data: publishedKnowledge, isLoading: isKnowledgeLoading } =
    useDoc<PublishedKnowledge>(publishedKnowledgeDocRef);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // For now, redirect to assistant. A real search implementation would be more complex.
    router.push(
      `/collaborator/${workspaceId}/assistant?initial_message=${encodeURIComponent(
        searchQuery
      )}`
    );
  };

  const isLoading = isKnowledgeLoading || isWorkspaceLoading;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Base de Conhecimento</h1>
        <p className="text-muted-foreground">
          Conteúdo validado e publicado por {workspace?.name || '...'}
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Pergunte qualquer coisa sobre a operação..."
          className="h-12 text-base pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
          <CardDescription>
            Navegue pelo conhecimento estruturado da sua empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
          ) : (
            <Accordion type="multiple" className="w-full">
            {publishedKnowledge?.categories.map((category) => (
              <AccordionItem
                key={category.categoria}
                value={category.categoria}
              >
                <AccordionTrigger className="text-lg font-medium hover:no-underline">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{category.icone}</span>
                    <span>{category.categoria}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 border-l-2 ml-8 space-y-4">
                  {category.itens.map((item) => (
                    <div
                      key={item.titulo}
                      className="pt-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                      onClick={() => setSelectedItem(item)}
                    >
                      <h4 className="font-semibold">{item.titulo}</h4>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {item.descricao}
                      </p>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          )}
        </CardContent>
      </Card>
      
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="sm:max-w-lg">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl">{selectedItem.titulo}</SheetTitle>
                <SheetDescription>{selectedItem.descricao}</SheetDescription>
              </SheetHeader>
              <div className="py-4 whitespace-pre-wrap text-sm text-muted-foreground">
                  {selectedItem.detalhes}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
