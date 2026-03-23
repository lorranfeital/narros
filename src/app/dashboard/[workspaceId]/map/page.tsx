
'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, getDoc, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
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
  MarkerType,
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
  Plus,
  FileText,
  Users,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  Insight,
  KnowledgeCategory,
  KnowledgeItem,
  NodeRelation,
  Playbook,
} from '@/lib/firestore-types';

import { getFederatedMapData, FederatedMapData } from '@/lib/actions/federation-actions';
import { useCollection } from '@/firebase';
import { cn } from '@/lib/utils';

// Type definitions for our nodes
type MapNodeData = {
  label: string;
  type: 'workspace' | 'category' | 'playbook' | 'content' | 'orgchart';
  icon: React.ReactNode;
  subtext?: string;
  insights?: {
    risco: number;
    gap: number;
    oportunidade: number;
  };
  raw_data: any;
  isFederated: boolean;
  workspaceName?: string;
};


// Custom Node Component
const CustomNode = ({ data }: { data: MapNodeData }) => {
  const isOrgChart = data.type === 'orgchart';
  return (
    <div className="relative group transition-all duration-300">
      <Handle type="both" position={Position.Left} id="left" className="!bg-primary !w-3 !h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="both" position={Position.Top} id="top" className="!bg-primary !w-3 !h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="both" position={Position.Right} id="right" className="!bg-primary !w-3 !h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="both" position={Position.Bottom} id="bottom" className="!bg-primary !w-3 !h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <Card className={cn(
        "w-64 border-2 shadow-lg rounded-xl group-hover:border-primary/50 transition-colors",
        data.isFederated && "border-dashed border-muted-foreground/50",
        isOrgChart && "border-blue-500/50 bg-blue-950/20 group-hover:border-blue-500"
        )}>
        <CardHeader className="flex-row items-center gap-4 p-4">
          <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
              data.isFederated && "bg-muted text-muted-foreground",
              isOrgChart && "bg-blue-500/10 text-blue-600"
          )}>
            {data.icon}
          </div>
          <div className="flex-1 overflow-hidden">
            <CardTitle className="truncate text-base font-bold">{data.label}</CardTitle>
            {data.isFederated && data.workspaceName ? (
                <Badge variant="secondary" className="text-xs mt-1">{data.workspaceName}</Badge>
            ) : (
                <CardDescription className="text-xs">{data.type}</CardDescription>
            )}
          </div>
        </CardHeader>
        {(data.subtext || (data.insights && (data.insights.risco > 0 || data.insights.gap > 0 || data.insights.oportunidade > 0))) && (
          <CardContent className="border-t p-4 text-xs text-muted-foreground">
            {data.subtext && <p className="mb-2 line-clamp-2">{data.subtext}</p>}
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
  const isLayoutInitialized = useRef(false);

  const firestore = useFirestore();
  const params = useParams();
  const { toast } = useToast();
  const { user } = useUser();
  const workspaceId = params.workspaceId as string;

  // --- Data Fetching ---
  const [federatedData, setFederatedData] = useState<{ [key: string]: FederatedMapData } | null>(null);
  const [isFederatedLoading, setIsFederatedLoading] = useState(true);

  const insightsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/insights`)) : null, [firestore, workspaceId]);
  const { data: insights, isLoading: isInsightsLoading } = useCollection<Insight>(insightsQuery);

  const nodeRelationsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `workspaces/${workspaceId}/nodeRelations`)) : null, [firestore, workspaceId]);
  const { data: nodeRelations, isLoading: areRelationsLoading, error: relationsError } = useCollection<NodeRelation>(nodeRelationsQuery);
  
  useEffect(() => {
    const fetchData = async () => {
        if (!workspaceId) return;
        setIsFederatedLoading(true);
        try {
            const data = await getFederatedMapData(workspaceId);
            setFederatedData(data);
        } catch (error) {
            console.error("Failed to fetch federated map data:", error);
            toast({ variant: 'destructive', title: "Erro ao carregar dados do mapa.", description: (error as Error).message });
        } finally {
            setIsFederatedLoading(false);
        }
    };
    fetchData();
  }, [workspaceId, toast]);

  const allDataLoaded = !isFederatedLoading && !isInsightsLoading && !areRelationsLoading;

  // --- Layout and Node/Edge Generation ---
  useEffect(() => {
    if (!allDataLoaded || !federatedData || !Object.keys(federatedData).length || !firestore) {
        return;
    }

    const generateLayout = async () => {
      const newNodes: Node<MapNodeData>[] = [];
      const federatedEdges: Edge[] = [];
      const defaultIntraWorkspaceEdges: Edge[] = [];
      
      const getInsightsFor = (entityTitle: string) => {
        if (!insights) return { risco: 0, gap: 0, oportunidade: 0 };
        const counts = { risco: 0, gap: 0, oportunidade: 0 };
        insights.forEach((insight) => {
          if (insight.texto.toLowerCase().includes(entityTitle.toLowerCase())) {
            counts[insight.tipo]++;
          }
        });
        return counts;
      };

      const federatedKeys = Object.keys(federatedData);
      const connectedWorkspaces = federatedKeys.filter(id => id !== workspaceId);
      const connectedWsSpacing = 1200;

      for (const wsId in federatedData) {
        const isCurrentWs = wsId === workspaceId;
        const data = federatedData[wsId];
        const wsName = data.workspace.name;
        
        let workspaceCenterX = 0;
        let workspaceCenterY = 0;
        
        if (isCurrentWs) {
            workspaceCenterX = -800;
        } else {
            const connectedIndex = connectedWorkspaces.indexOf(wsId);
            workspaceCenterX = 800;
            workspaceCenterY = connectedIndex * connectedWsSpacing - ((connectedWorkspaces.length - 1) * connectedWsSpacing / 2);
        }
        
        const workspaceNodeId = `ws-${wsId}`;
        newNodes.push({
            id: workspaceNodeId,
            type: 'custom',
            position: { x: workspaceCenterX, y: workspaceCenterY },
            data: {
                label: wsName,
                type: 'workspace',
                icon: <Network className="h-6 w-6" />,
                raw_data: data.workspace,
                isFederated: !isCurrentWs,
            },
        });
        
        if (!isCurrentWs) {
             federatedEdges.push({
                id: `e-fed-${wsId}`,
                source: `ws-${workspaceId}`,
                target: workspaceNodeId,
                type: 'smoothstep',
                label: `Conexão: ${wsName}`,
                style: { stroke: '#aaa', strokeDasharray: '5 5' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#aaa' },
            });
        }
        
        const categoryRadius = 500;
        const itemRadius = 250;
        const categories = data.knowledge?.categories || [];
        categories.forEach((category, catIndex) => {
            const catAngle = (catIndex / (categories.length || 1)) * 2 * Math.PI;
            const categoryCenterX = workspaceCenterX + categoryRadius * Math.cos(catAngle);
            const categoryCenterY = workspaceCenterY + categoryRadius * Math.sin(catAngle);
            const categoryId = `${wsId}-cat-${encodeURIComponent(category.categoria)}`;

            newNodes.push({
                id: categoryId,
                type: 'custom',
                position: { x: categoryCenterX - 128, y: categoryCenterY - 70 },
                data: { label: category.categoria, type: 'category', icon: <Folder className="h-5 w-5" />, subtext: `${category.itens.length} iten(s)`, insights: getInsightsFor(category.categoria), raw_data: category, isFederated: !isCurrentWs, workspaceName: wsName },
            });
            defaultIntraWorkspaceEdges.push({ id: `e-ws-cat-${wsId}-${catIndex}`, source: workspaceNodeId, target: categoryId, type: 'smoothstep' });

            category.itens.forEach((item, itemIndex) => {
                const itemAngle = (itemIndex / (category.itens.length || 1)) * 2 * Math.PI + (catAngle / 4);
                const itemId = `${categoryId}-item-${encodeURIComponent(item.titulo)}`;
                newNodes.push({
                    id: itemId,
                    type: 'custom',
                    position: { x: categoryCenterX + itemRadius * Math.cos(itemAngle) - 128, y: categoryCenterY + itemRadius * Math.sin(itemAngle) - 40 },
                    data: {
                        label: item.titulo,
                        type: 'content',
                        icon: <FileText className="h-5 w-5" />,
                        subtext: item.descricao,
                        raw_data: item,
                        isFederated: !isCurrentWs,
                        workspaceName: wsName,
                    },
                });
                defaultIntraWorkspaceEdges.push({ id: `e-cat-item-${wsId}-${catIndex}-${itemIndex}`, source: categoryId, target: itemId, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#aaa'} });
            });
        });
        
        const playbookRadius = 800;
        const playbooks = data.playbooks || [];
        playbooks.forEach((playbook, index) => {
            const angle = (index / (playbooks.length || 1)) * 2 * Math.PI + Math.PI / 4;
            const playbookId = `${wsId}-play-${playbook.id}`;
            newNodes.push({
                id: playbookId,
                type: 'custom',
                position: { x: workspaceCenterX + playbookRadius * Math.cos(angle) - 128, y: workspaceCenterY + playbookRadius * Math.sin(angle) - 70 },
                data: { label: playbook.processo, type: 'playbook', icon: <BookOpen className="h-5 w-5" />, subtext: `${playbook.passos.length} passo(s)`, insights: getInsightsFor(playbook.processo), raw_data: playbook, isFederated: !isCurrentWs, workspaceName: wsName },
            });
            defaultIntraWorkspaceEdges.push({ id: `e-${wsId}-play-${index}`, source: workspaceNodeId, target: playbookId, type: 'smoothstep' });
        });

        const orgChartRadius = 1100;
        const orgChart = data.orgChart;
        if (orgChart && orgChart.nodes) {
            orgChart.nodes.forEach((node, index) => {
                const angle = (index / (orgChart.nodes.length || 1)) * 2 * Math.PI - Math.PI / 3;
                const nodeId = `${wsId}-org-${node.id}`;
                newNodes.push({
                    id: nodeId,
                    type: 'custom',
                    position: { x: workspaceCenterX + orgChartRadius * Math.cos(angle) - 128, y: workspaceCenterY + orgChartRadius * Math.sin(angle) - 70 },
                    data: {
                        label: node.name,
                        type: 'orgchart',
                        icon: <Users className="h-5 w-5" />,
                        subtext: node.title,
                        raw_data: node,
                        isFederated: !isCurrentWs,
                        workspaceName: wsName,
                    },
                });
                if (node.parentId) {
                    defaultIntraWorkspaceEdges.push({ id: `e-org-${wsId}-${node.id}`, source: `${wsId}-org-${node.parentId}`, target: nodeId, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } });
                } else {
                    defaultIntraWorkspaceEdges.push({ id: `e-ws-org-${wsId}-${node.id}`, source: workspaceNodeId, target: nodeId, type: 'smoothstep' });
                }
            });
        }
      }

      const layoutRef = doc(firestore, `workspaces/${workspaceId}/layouts`, 'map');
      const layoutSnap = await getDoc(layoutRef);
      
      let finalNodes = newNodes;
      let finalEdges: Edge[] = [];

      const relationsInitialized = layoutSnap.exists() && layoutSnap.data()?.relations_initialized;

      if (relationsInitialized && nodeRelations) {
        const savedEdges = nodeRelations.map(rel => ({
          id: rel.id,
          source: rel.fromNodeId,
          target: rel.toNodeId,
          sourceHandle: rel.sourceHandle,
          targetHandle: rel.targetHandle,
          type: 'smoothstep',
        }));
        finalEdges = [...savedEdges, ...federatedEdges];
      } else {
        finalEdges = [...defaultIntraWorkspaceEdges, ...federatedEdges];
      }
      
      if (layoutSnap.exists() && !isLayoutInitialized.current) {
        isLayoutInitialized.current = true;
        const layoutData = layoutSnap.data();
        if (Array.isArray(layoutData.nodePositions)) {
          const savedPositions = new Map(layoutData.nodePositions.map((p: any) => [p.id, { x: p.x, y: p.y }]));
          finalNodes = newNodes.map((node) => {
            const savedPosition = savedPositions.get(node.id);
            return savedPosition ? { ...node, position: savedPosition } : node;
          });
        }
        if (Array.isArray(layoutData.customNodes)) {
            const loadedCustomNodes: Node<MapNodeData>[] = layoutData.customNodes.map((node: Node<Omit<MapNodeData, 'icon'>>) => ({
                ...node,
                data: { ...node.data, icon: <BookOpen className="h-5 w-5" /> }, 
            }));
            finalNodes.push(...loadedCustomNodes);
        }
      }

      setEdges(finalEdges);
      setNodes(finalNodes);
    };
    
    generateLayout();
    
  }, [allDataLoaded, federatedData, insights, firestore, workspaceId, nodeRelations]);


  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection: Connection) => {
     const newEdge = { ...connection, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#aaa'} };
     setEdges((eds) => addEdge(newEdge, eds))
    }, []);
  const handleNodeClick = (_event: React.MouseEvent, node: Node<MapNodeData>) => setSelectedNode(node);
  const handleEdgeClick = (_event: React.MouseEvent, edge: Edge) => {
      if(edge.id.startsWith('e-fed-')) return;
      setEdgeToDelete(edge);
  }
  
  const confirmDeleteEdge = () => {
    if (edgeToDelete) {
      setEdges((eds) => eds.filter((e) => e.id !== edgeToDelete.id));
      setEdgeToDelete(null);
      toast({ title: "Conexão removida", description: "Clique em 'Salvar Layout' para tornar a exclusão permanente." });
    }
  };

  const handleAddNode = (type: 'category' | 'playbook' | 'content' | 'orgchart') => {
    const newNodeId = `custom-${type}-${Date.now()}`;
    
    let icon = <FileText className="h-5 w-5" />;
    let label = 'Novo Conteúdo';
    switch (type) {
      case 'category': icon = <Folder className="h-5 w-5" />; label = 'Nova Categoria'; break;
      case 'playbook': icon = <BookOpen className="h-5 w-5" />; label = 'Novo Playbook'; break;
      case 'orgchart': icon = <Users className="h-5 w-5" />; label = 'Nova Posição'; break;
    }

    const newNode: Node<MapNodeData> = { id: newNodeId, type: 'custom', position: { x: 200, y: 200 }, data: { label, type, icon, raw_data: {}, isFederated: false } };
    setNodes((nds) => [...nds, newNode]);
    toast({ title: 'Nó adicionado!', description: "Arraste para posicionar e clique para editar. Não se esqueça de salvar." });
  };
  
  const handleLabelChange = (newLabel: string) => {
    if (!selectedNode) return;
    const newNode = { ...selectedNode, data: { ...selectedNode.data, label: newLabel } };
    setNodes((nds) => nds.map((node) => (node.id === selectedNode.id ? newNode : node)));
    setSelectedNode(newNode);
  };

  const handleSaveLayout = async () => {
    if (!firestore || !workspaceId || nodes.length === 0 || !user) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);
      const customNodesToSave = nodes.filter(node => node.id.startsWith('custom-')).map(node => { const { icon, ...restOfData } = node.data; return { ...node, data: restOfData }; });
      const nodePositions = nodes.map(node => ({ id: node.id, x: node.position.x, y: node.position.y }));

      const layoutRef = doc(firestore, `workspaces/${workspaceId}/layouts`, 'map');
      batch.set(layoutRef, { nodePositions, customNodes: customNodesToSave, relations_initialized: true }, { merge: true });

      const relationsCollectionRef = collection(firestore, `workspaces/${workspaceId}/nodeRelations`);
      const existingRelationsSnap = await getDocs(relationsCollectionRef);
      existingRelationsSnap.forEach(relationDoc => batch.delete(relationDoc.ref));
      
      const edgesToSave = edges.filter(edge => !edge.id.startsWith('e-fed-') && !edge.id.startsWith('e-ws-cat-') && !edge.id.startsWith('e-cat-item-') && !edge.id.startsWith('e-ws-org-') && !edge.id.startsWith('e-org-') && !edge.id.startsWith('e-play-'));
      edgesToSave.forEach(edge => {
          const newRelationRef = doc(relationsCollectionRef);
          batch.set(newRelationRef, { fromNodeId: edge.source, toNodeId: edge.target, sourceHandle: edge.sourceHandle || null, targetHandle: edge.targetHandle || null, relationType: 'related_to', createdBy: user.uid, createdAt: serverTimestamp() });
      });
      
      await batch.commit();
      toast({ title: "Layout e Relações Salvos!" });
    } catch (error) {
      console.error("Error saving layout:", error);
      toast({ variant: "destructive", title: "Erro ao salvar layout.", description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!allDataLoaded && isFederatedLoading) {
    return (
      <div className="h-screen w-screen relative">
         <Skeleton className="h-full w-full" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" />
            Carregando mapa operacional...
        </div>
      </div>
    );
  }
  
  const noContent = !federatedData || Object.keys(federatedData).every(wsId => !federatedData[wsId].knowledge && federatedData[wsId].playbooks.length === 0 && !federatedData[wsId].orgChart);

  return (
    <div className="w-full h-full relative">
       <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
            <Button onClick={handleSaveLayout} disabled={isSaving || nodes.length === 0}>
                {isSaving ? <Loader2 className="mr-2" /> : <Save className="mr-2" />}
                Salvar Layout
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="bg-background"><Plus className="mr-2" />Adicionar Nó</Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleAddNode('category')}><Folder className="mr-2" /> Categoria</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleAddNode('playbook')}><BookOpen className="mr-2" /> Playbook</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleAddNode('content')}><FileText className="mr-2" /> Conteúdo</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleAddNode('orgchart')}><Users className="mr-2" /> Organograma</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
       </div>
       <Button asChild variant="outline" className="absolute top-6 right-6 z-10 h-12 w-12 rounded-full p-0 bg-background/80 hover:bg-background"><Link href={`/dashboard/${workspaceId}`}><X className="h-6 w-6" /></Link></Button>
      
        {noContent ? (
             <div className="flex h-full items-center justify-center"><Alert className="max-w-md"><Network className="h-4 w-4" /><AlertTitle>Mapa Vazio</AlertTitle><AlertDescription>Nenhum conhecimento publicado para gerar o mapa.</AlertDescription></Alert></div>
        ) : (
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={handleNodeClick} onEdgeClick={handleEdgeClick} nodeTypes={nodeTypes} fitView className="bg-muted/30"><Controls /><Background /></ReactFlow>
        )}
      
      <Sheet open={!!selectedNode} onOpenChange={(isOpen) => !isOpen && setSelectedNode(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          {selectedNode && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3 text-2xl">{selectedNode.data.icon} {selectedNode.data.label}</SheetTitle>
                <SheetDescription>{selectedNode.id.startsWith('custom-') ? `Nó customizado do tipo '${selectedNode.data.type}'. Edite o nome abaixo.` : `Detalhes sobre o nó '${selectedNode.data.label}'.`}</SheetDescription>
              </SheetHeader>
              <div className="py-6 space-y-6">
                {selectedNode.id.startsWith('custom-') ? (
                  <div className="space-y-2"><Label htmlFor="node-label">Nome do Nó</Label><Input id="node-label" value={selectedNode.data.label} onChange={(e) => handleLabelChange(e.target.value)} /><p className="text-xs text-muted-foreground">Não se esqueça de "Salvar Layout" para manter suas alterações.</p></div>
                ) : (
                  <>
                    {selectedNode.data.type === 'category' && (<div className="space-y-4"><h4 className="font-semibold">Itens de Conhecimento</h4><div className="space-y-3">{(selectedNode.data.raw_data as KnowledgeCategory).itens.map(item => (<div key={item.titulo} className="text-sm"><p className="font-medium text-foreground">{item.titulo}</p><p className="text-muted-foreground">{item.descricao}</p></div>))}</div></div>)}
                    {selectedNode.data.type === 'content' && (<div className="space-y-4"><h4 className="font-semibold">Descrição</h4><div className="space-y-3"><p className="text-muted-foreground">{(selectedNode.data.raw_data as KnowledgeItem).descricao}</p></div></div>)}
                    {selectedNode.data.type === 'playbook' && (<div className="space-y-4"><h4 className="font-semibold">Passos do Processo</h4><div className="space-y-4">{(selectedNode.data.raw_data as Playbook).passos.map(step => (<div key={step.numero} className="flex gap-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{step.numero}</div><div><h5 className="font-semibold">{step.titulo}</h5><p className="text-muted-foreground text-sm">{step.descricao}</p></div></div>))}</div></div>)}
                    <Button asChild><Link href={`/dashboard/${workspaceId}/knowledge`}>Explorar na Base de Conhecimento <ChevronRight className="h-4 w-4 ml-2"/></Link></Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!edgeToDelete} onOpenChange={(isOpen) => !isOpen && setEdgeToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover conexão</AlertDialogTitle><AlertDialogDescription>Tem certeza de que deseja remover esta conexão? A alteração será salva permanentemente quando você clicar em "Salvar Layout".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setEdgeToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteEdge}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

