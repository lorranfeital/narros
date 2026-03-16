
'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDoc, setDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  BookOpen,
  Network,
  Lightbulb,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Folder,
  X,
  Save,
  Loader2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Workspace,
  PublishedKnowledge,
  Playbook,
  Insight,
  KnowledgeCategory,
} from '@/lib/firestore-types';


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
    <div className="relative group transition-all duration-300">
      <Handle
        type="both"
        position={Position.Left}
        id="left"
        className="!bg-primary !w-3 !h-3 opacity-0 group-hover:opacity-100 transition-opacity"
      />
       <Handle
        type="both"
        position={Position.Top}
        id="top"
        className="!bg-primary !w-3 !h-3 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="both"
        position={Position.Right}
        id="right"
        className="!bg-primary !w-3 !h-3 opacity-0 group-hover:opacity-100 transition-opacity"
      />
       <Handle
        type="both"
        position={Position.Bottom}
        id="bottom"
        className="!bg-primary !w-3 !h-3 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      
      <Card className="w-64 border-2 shadow-lg rounded-xl group-hover:border-primary/50 transition-colors">
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
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function OperationalMapPage() {
  const [nodes, setNodes] = useState<Node<MapNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node<MapNodeData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);

  const firestore = useFirestore();
  const params = useParams();
  const { toast } = useToast();
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
    if (isLoading || !workspace || !firestore) return;

    const generateLayout = async () => {
      const newNodes: Node<MapNodeData>[] = [];
      const defaultEdges: Edge[] = [];
      const centerX = 0;
      const centerY = 0;

      const getInsightsFor = (entityTitle: string) => {
        if (!insights) return { risco: 0, gap: 0, oportunidade: 0 };
        const counts = { risco: 0, gap: 0, oportunidade: 0 };
        const lowerEntityTitle = entityTitle.toLowerCase();
        insights.forEach((insight) => {
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
        const angle = (index / (categories.length || 1)) * 2 * Math.PI;
        const categoryId = `cat-${category.categoria.replace(/[^a-zA-Z0-9-_]/g, '')}-${index}`;
        newNodes.push({
          id: categoryId,
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
        defaultEdges.push({
          id: `e-ws-${categoryId}`,
          source: 'workspace',
          sourceHandle: 'bottom',
          target: categoryId,
          targetHandle: 'top',
        });
      });

      // 3. Playbook Nodes
      const playbookRadius = 600;
      const publishedPlaybooks = playbooks || [];
      publishedPlaybooks.forEach((playbook, index) => {
        const angle = (index / (publishedPlaybooks.length || 1)) * 2 * Math.PI;
        const playbookNodeId = `play-${playbook.id}`;
        newNodes.push({
          id: playbookNodeId,
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
        defaultEdges.push({
          id: `e-ws-${playbookNodeId}`,
          source: 'workspace',
          sourceHandle: 'bottom',
          target: playbookNodeId,
          targetHandle: 'top',
        });
      });

      // --- Load saved layout ---
      const layoutRef = doc(firestore, `workspaces/${workspaceId}/layouts`, 'map');
      const layoutSnap = await getDoc(layoutRef);
      
      if (layoutSnap.exists()) {
        const layoutData = layoutSnap.data();
        // Load Node Positions
        if (Array.isArray(layoutData.nodePositions)) {
          const savedPositions = new Map(
            layoutData.nodePositions.map((p: any) => [p.id, { x: p.x, y: p.y }])
          );
          newNodes.forEach((node) => {
            if (savedPositions.has(node.id)) {
              node.position = savedPositions.get(node.id)!;
            }
          });
        }
        // Load Edges: if 'edges' property exists and is not empty, use it. Otherwise, use defaults.
        if (layoutData.edges && Array.isArray(layoutData.edges) && layoutData.edges.length > 0) {
            setEdges(layoutData.edges);
        } else {
            setEdges(defaultEdges);
        }
      } else {
        setEdges(defaultEdges);
      }

      setNodes(newNodes);
    };

    generateLayout();
  }, [isLoading, workspace, publishedKnowledge, playbooks, insights, firestore, workspaceId]);


  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const handleNodeClick = (_event: React.MouseEvent, node: Node<MapNodeData>) => {
    setSelectedNode(node);
  };
  
  const handleEdgeClick = (_event: React.MouseEvent, edge: Edge) => {
    setEdgeToDelete(edge);
  };
  
  const confirmDeleteEdge = () => {
    if (edgeToDelete) {
      onEdgesChange([{ type: 'remove', id: edgeToDelete.id }]);
      setEdgeToDelete(null);
      toast({
        title: "Conexão removida",
        description: "Clique em 'Salvar Layout' para tornar a exclusão permanente."
      });
    }
  };

  const handleSaveLayout = async () => {
    if (!firestore || !workspaceId || nodes.length === 0) return;
    setIsSaving(true);
    try {
      const layoutData = {
        nodePositions: nodes.map(node => ({
          id: node.id,
          x: node.position.x,
          y: node.position.y,
        })),
        edges: edges,
      };
      const layoutRef = doc(firestore, `workspaces/${workspaceId}/layouts`, 'map');
      await setDoc(layoutRef, layoutData, { merge: true });

      toast({
        title: "Layout Salvo!",
        description: "A posição dos seus nós e as conexões foram salvas."
      });
    } catch (error) {
      console.error("Error saving layout:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar layout.",
        description: (error as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading) {
    return (
      <Skeleton className="h-screen w-screen" />
    );
  }

  const noContent = !publishedKnowledge && (!playbooks || playbooks.length === 0);

  return (
    <div className="w-full h-full relative">
       <div className="absolute top-6 left-6 z-10">
            <Button onClick={handleSaveLayout} disabled={isSaving || nodes.length === 0}>
                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                Salvar Layout
            </Button>
       </div>
       <Button asChild variant="outline" className="absolute top-6 right-6 z-10 h-12 w-12 rounded-full p-0 bg-background/80 hover:bg-background">
            <Link href={`/dashboard/${workspaceId}`}>
              <X className="h-6 w-6" />
            </Link>
        </Button>
      
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
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-muted/30"
            >
              <Controls />
              <Background />
            </ReactFlow>
        )}
      
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

      <AlertDialog open={!!edgeToDelete} onOpenChange={(isOpen) => !isOpen && setEdgeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Remover conexão</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza de que deseja remover esta conexão? A alteração será salva permanentemente quando você clicar em "Salvar Layout".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEdgeToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteEdge}>Remover</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
