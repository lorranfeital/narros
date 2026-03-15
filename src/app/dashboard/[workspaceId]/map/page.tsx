
'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  BookCopy,
  BookOpen,
  Network,
  Lightbulb,
  AlertTriangle,
  MapPin,
  ChevronRight,
  GitCommit,
  Folder,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

import {
  Workspace,
  PublishedKnowledge,
  Playbook,
  Insight,
  InsightType,
  KnowledgeCategory,
  KnowledgeItem,
} from '@/lib/firestore-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Type definitions for our nodes
type MapNodeData = {
  label: string;
  type: 'workspace' | 'category' | 'playbook';
  icon: React.ReactNode;
  subtext?: string;
  insights?: {
    risco: number;
    gap: number;
    oportunidade: number;
  };
  raw_data: any;
};

// Custom Node Component
const CustomNode = ({ data }: { data: MapNodeData }) => {
  return (
    <Card className="w-64 border-2 shadow-lg !rounded-xl">
      <CardHeader className="flex-row items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {data.icon}
        </div>
        <div className="flex-1 overflow-hidden">
          <CardTitle className="truncate text-base font-bold">{data.label}</CardTitle>
          <CardDescription className="text-xs">{data.type}</CardDescription>
        </div>
      </CardHeader>
      {(data.subtext || (data.insights && (data.insights.risco > 0 || data.insights.gap > 0 || data.insights.oportunidade > 0))) && (
        <CardContent className="border-t p-4 text-xs text-muted-foreground">
          {data.subtext && <p className="mb-2">{data.subtext}</p>}
          {data.insights && (
            <div className="flex flex-wrap gap-1">
              {data.insights.risco > 0 && <Badge variant="destructive" className="text-xs"><AlertTriangle className="mr-1 h-3 w-3" /> {data.insights.risco} Risco(s)</Badge>}
              {data.insights.gap > 0 && <Badge variant="default" className="text-xs"><MapPin className="mr-1 h-3 w-3" /> {data.insights.gap} Gap(s)</Badge>}
              {data.insights.oportunidade > 0 && <Badge variant="success" className="text-xs"><Lightbulb className="mr-1 h-3 w-3" /> {data.insights.oportunidade} Oport.</Badge>}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function OperationalMapPage() {
  const [nodes, setNodes] = useState<Node<MapNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node<MapNodeData> | null>(null);

  const firestore = useFirestore();
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  // --- Data Fetching ---
  const workspaceDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'workspaces', workspaceId) : null, [firestore, workspaceId]);
  const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceDocRef);

  const publishedKnowledgeDocRef = useMemoFirebase(() => firestore ? doc(firestore, `workspaces/${workspaceId}/published_knowledge`, workspaceId) : null, [firestore, workspaceId]);
  const { data: publishedKnowledge, isLoading: isKnowledgeLoading } = useDoc<PublishedKnowledge>(publishedKnowledgeDocRef);

  const playbooksQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/playbooks`), where('status', '==', 'published')) : null, [firestore, workspaceId]);
  const { data: playbooks, isLoading: isPlaybooksLoading } = useCollection<Playbook>(playbooksQuery);

  const insightsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/insights`)) : null, [firestore, workspaceId]);
  const { data: insights, isLoading: isInsightsLoading } = useCollection<Insight>(insightsQuery);

  const isLoading = isWorkspaceLoading || isKnowledgeLoading || isPlaybooksLoading || isInsightsLoading;

  // --- Node and Edge Generation ---
  useEffect(() => {
    if (isLoading || !workspace) return;

    const newNodes: Node<MapNodeData>[] = [];
    const newEdges: Edge[] = [];
    const centerX = 500;
    const centerY = 300;

    const getInsightsFor = (entityTitle: string) => {
      if (!insights) return { risco: 0, gap: 0, oportunidade: 0 };
      const counts = { risco: 0, gap: 0, oportunidade: 0 };
      const lowerEntityTitle = entityTitle.toLowerCase();
      insights.forEach(insight => {
        if (insight.texto.toLowerCase().includes(lowerEntityTitle)) {
          counts[insight.tipo]++;
        }
      });
      return counts;
    };

    // 1. Central Workspace Node
    newNodes.push({
      id: 'workspace',
      type: 'custom',
      position: { x: centerX, y: centerY },
      data: {
        label: workspace.name,
        type: 'workspace',
        icon: <Network className="h-6 w-6" />,
        raw_data: workspace,
      },
    });

    // 2. Category Nodes
    const categoryRadius = 350;
    const categories = publishedKnowledge?.categories || [];
    categories.forEach((category, index) => {
      const angle = (index / categories.length) * 2 * Math.PI;
      newNodes.push({
        id: `cat-${category.categoria}`,
        type: 'custom',
        position: {
          x: centerX + categoryRadius * Math.cos(angle) - 128,
          y: centerY + categoryRadius * Math.sin(angle) - 70,
        },
        data: {
          label: category.categoria,
          type: 'category',
          icon: <Folder className="h-5 w-5" />,
          subtext: `${category.itens.length} iten(s)`,
          insights: getInsightsFor(category.categoria),
          raw_data: category,
        },
      });
      newEdges.push({ id: `e-ws-cat-${index}`, source: 'workspace', target: `cat-${category.categoria}`, animated: true });
    });

    // 3. Playbook Nodes
    const playbookRadius = 600;
    const publishedPlaybooks = playbooks || [];
    publishedPlaybooks.forEach((playbook, index) => {
      const angle = (index / publishedPlaybooks.length) * 2 * Math.PI;
      newNodes.push({
        id: `play-${playbook.id}`,
        type: 'custom',
        position: {
          x: centerX + playbookRadius * Math.cos(angle) - 128,
          y: centerY + playbookRadius * Math.sin(angle) - 70,
        },
        data: {
          label: playbook.processo,
          type: 'playbook',
          icon: <BookOpen className="h-5 w-5" />,
          subtext: `${playbook.passos.length} passo(s)`,
          insights: getInsightsFor(playbook.processo),
          raw_data: playbook,
        },
      });
      newEdges.push({ id: `e-ws-play-${index}`, source: 'workspace', target: `play-${playbook.id}` });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [isLoading, workspace, publishedKnowledge, playbooks, insights]);


  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  
  const handleNodeClick = (_event: React.MouseEvent, node: Node<MapNodeData>) => {
    setSelectedNode(node);
  };


  if (isLoading) {
    return (
      <div className="p-12 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  const noContent = !publishedKnowledge && (!playbooks || playbooks.length === 0);

  return (
    <div className="p-12 space-y-8 h-screen flex flex-col">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Mapa Operacional</h1>
        <p className="text-muted-foreground mt-2">
          Uma visualização de como os processos, categorias e playbooks da sua empresa se conectam.
        </p>
      </div>

      <div className="flex-grow rounded-lg border bg-card overflow-hidden relative">
        {noContent ? (
             <div className="flex h-full items-center justify-center">
                 <Alert className="max-w-md">
                    <Network className="h-4 w-4" />
                    <AlertTitle>Mapa Vazio</AlertTitle>
                    <AlertDescription>
                       Nenhum conhecimento ou playbook publicado para gerar o mapa. Comece adicionando conteúdo e publicando.
                    </AlertDescription>
                </Alert>
            </div>
        ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-muted/30"
            >
              <Controls />
              <Background />
            </ReactFlow>
        )}
      </div>

      <Sheet open={!!selectedNode} onOpenChange={(isOpen) => !isOpen && setSelectedNode(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          {selectedNode && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3 text-2xl">
                  {selectedNode.data.icon} {selectedNode.data.label}
                </SheetTitle>
                <SheetDescription>
                  Detalhes sobre o nó '{selectedNode.data.label}' do tipo '{selectedNode.data.type}'.
                </SheetDescription>
              </SheetHeader>
              <div className="py-6 space-y-6">
                 {selectedNode.data.type === 'category' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold">Itens de Conhecimento</h4>
                        <div className="space-y-3">
                        {(selectedNode.data.raw_data as KnowledgeCategory).itens.map(item => (
                            <div key={item.titulo} className="text-sm">
                                <p className="font-medium text-foreground">{item.titulo}</p>
                                <p className="text-muted-foreground">{item.descricao}</p>
                            </div>
                        ))}
                        </div>
                    </div>
                 )}
                 {selectedNode.data.type === 'playbook' && (
                     <div className="space-y-4">
                        <h4 className="font-semibold">Passos do Processo</h4>
                        <div className="space-y-4">
                        {(selectedNode.data.raw_data as Playbook).passos.map(step => (
                           <div key={step.numero} className="flex gap-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{step.numero}</div>
                                <div>
                                    <h5 className="font-semibold">{step.titulo}</h5>
                                    <p className="text-muted-foreground text-sm">{step.descricao}</p>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                 )}
                 <Button asChild>
                     <Link href={`/dashboard/${workspaceId}/knowledge`}>
                        Explorar na Base de Conhecimento <ChevronRight className="h-4 w-4 ml-2"/>
                    </Link>
                 </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
