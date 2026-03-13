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
  RISK = 'risk',
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

// ---------
// Main Document Interfaces
// ---------

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  type: 'empresa' | 'grupo' | 'franquia' | 'rede' | 'loja' | 'clínica' | 'escritório' | 'outro';
  sector: string;
  ownerId: string;
  members: string[];
  status: WorkspaceStatus;
  ingestionState: IngestionState;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastPublishedAt?: Timestamp;
  lastProcessedAt?: Timestamp;
  pendingSyncCount?: number;
  visibility?: 'public' | 'private';
}

// ---------
// Subcollection Interfaces
// ---------

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
  entityType: 'knowledge' | 'playbook' | 'training';
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
