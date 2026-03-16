
import { Timestamp } from 'firebase/firestore';

// ---------
// Enums
// ---------

export enum WorkspaceStatus {
  NEVER_PUBLISHED = 'never_published',
  DRAFT_READY = 'draft_ready',
  PUBLISHED = 'published',
  SYNC_PENDING = 'sync_pending',
  ARCHIVED = 'archived',
}

export enum IngestionState {
  IDLE = 'idle',
  INGESTING = 'ingesting',
  PROCESSING = 'processing',
}

export enum SourceType {
  TEXT = 'text',
  FILE = 'file',
  AUDIO = 'audio',
  INTEGRATION = 'integration',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum InsightType {
  GAP = 'gap',
  RISK = 'risco',
  OPPORTUNITY = 'oportunidade',
}

export enum SyncProposalType {
  NEW = 'new',
  UPDATED = 'updated',
  CONFLICT = 'conflict',
  OBSOLETE = 'obsolete',
}

export enum SyncApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum VersionEventType {
  INITIAL_PUBLISH = 'initial_publish',
  SYNC_PUBLISH = 'sync_publish',
  MANUAL_EDIT = 'manual_edit',
}

export enum WorkspaceLinkStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    REJECTED = 'rejected',
    DISABLED = 'disabled'
}

export type WorkspaceRole = 'admin' | 'curator' | 'member';

export type PlatformAdminRole = 'platform_super_admin' | 'platform_ops_admin' | 'platform_support' | 'platform_billing_admin' | 'platform_readonly';


// ---------
// Main Document Interfaces
// ---------

export interface User {
  id: string;
  name: string;
  email: string;
  plan?: string;
  createdAt?: Timestamp;
}

export interface PlatformAdmin {
  id: string; // This will be the user's UID
  role: PlatformAdminRole;
  status: 'active' | 'disabled';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface Workspace {
  id: string;
  name: string;
  name_lowercase?: string;
  slug?: string;
  logoUrl?: string;
  type: 'empresa' | 'grupo' | 'franquia' | 'rede' | 'loja' | 'clínica' | 'escritório' | 'outro';
  sector: string;
  ownerId: string;
  members: string[];
  roles?: { [key: string]: WorkspaceRole };
  status: WorkspaceStatus;
  ingestionState: IngestionState;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastPublishedAt?: Timestamp;
  lastProcessedAt?: Timestamp;
  pendingSyncCount?: number;
  visibility?: 'public' | 'private';
  version?: number;
}

export interface WorkspaceLink {
    id: string;
    sourceWorkspaceId: string;
    sourceWorkspaceName: string;
    sourceWorkspaceLogoUrl?: string;
    targetWorkspaceId: string;
    targetWorkspaceName: string;
    targetWorkspaceLogoUrl?: string;
    status: WorkspaceLinkStatus;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    updatedBy?: string;
}

// ---------
// Subcollection Interfaces
// ---------

export interface NodeRelation {
  id: string;
  workspaceId: string;
  fromNodeId: string;
  toNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  relationType: 'parent_of' | 'child_of' | 'related_to' | 'depends_on' | 'part_of' | 'used_in_training' | 'recommended_after' | 'alternative_path';
  weight?: number;
  metadata?: any;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface Source {
  id: string;
  workspaceId: string;
  type: SourceType;
  sourceName?: string;
  mimeType?: string;
  storagePath?: string;
  rawText?: string;
  extractedText?: string;
  transcript?: string;
  processingStatus: ProcessingStatus;
  batchId: string;
  createdAt: Timestamp;
  createdBy: string;
  notes?: string;
}

export interface KnowledgeItem {
    titulo: string;
    descricao: string;
    detalhes?: string;
    sourceRefs?: string[];
}

export interface KnowledgeCategory {
    categoria: string;
    icone: string;
    itens: KnowledgeItem[];
}

export interface DraftKnowledge {
  id: string;
  workspaceId: string;
  categories: KnowledgeCategory[];
  generatedAt: Timestamp;
  sourceBatchId: string;
  version: number;
  status: 'draft' | 'under_review';
}

export interface PublishedKnowledge {
  id: string;
  workspaceId: string;
  categories: KnowledgeCategory[];
  publishedAt: Timestamp;
  version: number;
  publishedBy: string;
}

export interface Color {
    name: string;
    hex: string;
}

export interface Typography {
    name: string;
    family: string;
    weight?: string;
    example?: string;
}

export interface BrandKit {
  id: string;
  workspaceId: string;
  logoPrincipalUrl?: string;
  logoNegativoUrl?: string;
  colorPalette?: Color[];
  typography?: Typography[];
  toneOfVoice?: string[];
  sourceRefs?: string[];
  publishedAt?: Timestamp;
  version?: number;
  sourceBatchId?: string;
  status?: 'draft' | 'published';
}

export interface OrgChartNode {
  id: string;
  name: string;
  title?: string;
  parentId?: string;
}

export interface OrgChart {
  id: string;
  workspaceId: string;
  nodes: OrgChartNode[];
  sourceRefs?: string[];
  status: 'draft' | 'published';
  createdAt: Timestamp;
  version?: number;
  publishedAt?: Timestamp;
  publishedBy?: string;
  sourceBatchId?: string;
}


export interface PlaybookStep {
    numero: number;
    titulo: string;
    descricao: string;
}

export interface Playbook {
  id: string;
  workspaceId: string;
  processo: string;
  passos: PlaybookStep[];
  sourceRefs?: string[];
  status: 'draft' | 'published';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}


export interface TrainingModule {
  id: string;
  workspaceId: string;
  modulo: number;
  titulo: string;
  duracao: string;
  objetivo: string;
  topicos: string[];
  formato: 'presencial' | 'vídeo' | 'slides' | 'prático';
  sourceRefs?: string[];
  status: 'draft' | 'published';
  createdAt: Timestamp;
}


export interface Insight {
  id: string;
  workspaceId: string;
  texto: string;
  tipo: InsightType;
  sourceRefs?: string[];
  resolved: boolean;
  createdAt: Timestamp;
}

export interface SyncProposal {
  id: string;
  workspaceId: string;
  type: SyncProposalType;
  entityType: 'knowledge' | 'playbook' | 'training' | 'brand_kit' | 'org_chart';
  entityId: string;
  before: any;
  after: any;
  sourceBatchId: string;
  approvalStatus: SyncApprovalStatus;
  createdAt: Timestamp;
}

export interface Version {
  id: string;
  workspaceId: string;
  type: VersionEventType;
  summary: string;
  createdAt: Timestamp;
  createdBy: string;
  version: number;
}

export interface AssistantThread {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface AssistantMessage {
  id: string;
  threadId: string;
  workspaceId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
  createdAt: Timestamp;
}
