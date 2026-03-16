# Narros — Arquitetura Técnica v1

Documento técnico consolidado da arquitetura da Narros, baseado no PRD e nas decisões posteriores.

---

# 1. Objetivo da arquitetura

A arquitetura da Narros deve suportar, desde o início:

* ingestão de múltiplos tipos de conteúdo
* estruturação de conhecimento em nós
* relações dinâmicas entre nós
* reorganização manual e por IA
* preservação de conteúdo raw
* versionamento e governança
* criação e atualização de treinamentos
* aprovação humana antes de mudanças persistentes
* experiência separada por perfil de usuário
* conexão opcional entre workspaces
* administração interna da plataforma

A decisão arquitetural central é:

**Narros não deve ser modelada como uma plataforma puramente hierárquica.**
Ela deve ser modelada como uma **base híbrida de knowledge graph com visão hierárquica**.

Ou seja:

* o usuário pode navegar em formato de árvore
* mas o armazenamento e as relações precisam suportar grafo

---

# 2. Stack técnica recomendada

## Frontend

* Next.js 14+ com App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* React Flow (ou similar) para visualização e edição de nós
* TanStack Query para cache e sincronização
* Zustand ou reducer/context para estados complexos de editor

## Backend / Plataforma

* Firebase Auth
* Cloud Firestore
* Firebase Storage
* Cloud Functions / Cloud Run
* Pub/Sub para processamento assíncrono
* Cloud Tasks para filas críticas
* Vertex AI / Gemini para inferência
* BigQuery opcional para analytics futuros

## Busca e recuperação

Fase inicial:

* Firestore + índices + embeddings armazenados

Evolução:

* estratégia híbrida com embeddings e recuperação semântica
* banco vetorial gerenciado no futuro, se necessário

## Observabilidade

* Firebase Logging
* Error Reporting
* analytics de eventos
* Sentry opcional

---

# 3. Camadas lógicas do sistema

A Narros deve operar com as seguintes camadas lógicas:

## Camada 1 — Identidade e permissões

Controla:

* autenticação
* usuários
* papéis
* workspaces
* papéis administrativos globais

## Camada 2 — Base estrutural de conhecimento

Controla:

* nós
* relações
* hierarquia visível
* grafo subjacente

## Camada 3 — Base de conteúdo

Controla:

* conteúdo raw
* fontes de conteúdo
* blocos estruturados
* chunking
* referências de suporte

## Camada 4 — Inteligência assistiva

Controla:

* inferência
* classificação de conteúdo
* sugestões de atualização
* reorganização por IA
* reescritas
* sugestões de treinamento

## Camada 5 — Experiência e consumo

Controla:

* onboarding
* treinamentos
* navegação por nós
* editor visual
* aprovação de mudanças

## Camada 6 — Federação entre workspaces

Controla:

* conexões autorizadas entre workspaces
* relações entre nós de workspaces diferentes
* escopos de visibilidade e compartilhamento

## Camada 7 — Administração da plataforma

Controla:

* gestão global de workspaces
* suporte
* logs operacionais
* monitoramento de IA
* feature flags
* auditoria interna

---

# 4. Multi-tenant orientado por workspace

A Narros deve nascer **workspace-first**.

Cada empresa/cliente é um workspace isolado.

Cada workspace possui:

* usuários
* rede de nós
* fontes de conteúdo
* trilhas e treinamentos
* sugestões e aprovações
* configurações próprias

Isso facilita:

* isolamento de dados
* governança por cliente
* escalabilidade B2B SaaS
* billing futuro
* personalização de IA por workspace

---

# 5. Modelo de dados conceitual

## 5.1 Entidades principais

### Workspace

Representa a organização cliente.

Campos sugeridos:

* id
* name
* slug
* plan
* status
* createdAt
* updatedAt
* settings

### User

Representa o usuário autenticado.

Campos sugeridos:

* id
* email
* name
* photoUrl
* createdAt
* updatedAt

### WorkspaceUser

Relaciona usuário ao workspace.

Campos:

* workspaceId
* userId
* role (`admin`, `curator`, `member`)
* status
* createdAt
* updatedAt

### PlatformAdmin

Relaciona usuário a um papel administrativo global da Narros.

Campos:

* userId
* role (`platform_super_admin`, `platform_ops_admin`, `platform_support`, `platform_billing_admin`, `platform_readonly`)
* status
* createdAt
* updatedAt

### Node

Unidade central de conhecimento.

Campos sugeridos:

* id
* workspaceId
* title
* slug
* type (`knowledge`, `process`, `policy`, `tool`, `reference`, `training`, `onboarding`)
* status (`draft`, `published`, `archived`)
* summary
* description
* primaryParentId
* createdBy
* updatedBy
* createdAt
* updatedAt
* currentVersionId
* aiMetadata
* visibilityRules

### NodeRelation

Representa o grafo entre nós de um mesmo workspace.

Campos:

* id
* workspaceId
* fromNodeId
* toNodeId
* relationType (`parent_of`, `child_of`, `related_to`, `depends_on`, `part_of`, `used_in_training`, `recommended_after`, `alternative_path`)
* weight
* metadata
* createdBy
* createdAt
* updatedAt

### FederatedNodeRelation

Representa relação entre nós de workspaces diferentes.

Campos:

* id
* sourceWorkspaceId
* sourceNodeId
* targetWorkspaceId
* targetNodeId
* relationType
* status
* createdBy
* createdAt

### NodeVersion

Versionamento editorial do nó.

Campos:

* id
* workspaceId
* nodeId
* versionNumber
* title
* summary
* description
* structuredSnapshot
* changeReason
* createdBy
* createdAt
* approvedBy
* approvedAt
* source (`manual`, `ai_suggestion`, `content_ingestion`, `merge`, `system_update`)

### ContentSource

Material de origem.

Campos:

* id
* workspaceId
* title
* sourceType (`pdf`, `docx`, `text`, `audio_transcript`, `video_transcript`, `meeting_notes`, `manual_note`)
* storagePath
* mimeType
* rawText
* extractedText
* language
* uploadedBy
* createdAt
* updatedAt
* hash
* status (`uploaded`, `processing`, `processed`, `failed`)

### ContentChunk

Fracionamento semântico de uma fonte.

Campos:

* id
* workspaceId
* sourceId
* chunkIndex
* text
* tokenCount
* embeddingVectorRef
* metadata
* createdAt

### NodeContentLink

Relaciona conteúdo e nós.

Campos:

* id
* workspaceId
* nodeId
* sourceId
* chunkId
* linkType (`supports`, `origin_of`, `supplements`, `updates`, `contradicts`)
* confidenceScore
* createdBy
* createdAt

### StructuredBlock

Blocos exibíveis dentro do nó.

Campos:

* id
* workspaceId
* nodeId
* versionId
* blockType
* title
* content
* order
* rawSupportRefs
* createdAt
* updatedAt

### Suggestion

Entidade central de propostas da IA.

Campos:

* id
* workspaceId
* suggestionType (`create_node`, `update_node`, `merge_nodes`, `split_node`, `reorganize_graph`, `rewrite_block`, `create_training`, `update_training`, `link_content`, `create_federated_relation`)
* status (`pending`, `approved`, `rejected`, `expired`, `applied`)
* targetEntityType
* targetEntityId
* proposalPayload
* rationale
* diffPreview
* createdBy
* createdAt
* reviewedBy
* reviewedAt

### TrainingPath

Estrutura operacional de treinamento.

Campos:

* id
* workspaceId
* trainingNodeId
* title
* description
* status
* audience
* createdBy
* updatedBy
* createdAt
* updatedAt

### TrainingStep

Passos do treinamento.

Campos:

* id
* workspaceId
* trainingPathId
* stepType (`node`, `quiz`, `exercise`, `reflection`, `summary`)
* nodeId
* title
* content
* order
* metadata

### LearningAssignment

Associação de trilhas a usuários ou grupos.

Campos:

* id
* workspaceId
* trainingPathId
* assignedToUserId
* assignedToGroupId
* assignedBy
* dueDate
* status

### ApprovalLog

Registro formal de aprovação.

Campos:

* id
* workspaceId
* suggestionId
* entityType
* entityId
* action
* performedBy
* performedAt
* comment

### WorkspaceLink

Representa conexão entre workspaces.

Campos:

* id
* sourceWorkspaceId
* targetWorkspaceId
* status (`pending`, `active`, `disabled`)
* linkMode (`one_way`, `two_way`)
* visibilityScope (`metadata_only`, `published_content`, `full_content`)
* createdBy
* approvedBy
* createdAt
* updatedAt

### SharedNodeReference

Quando um workspace consome um nó de outro.

Campos:

* id
* consumerWorkspaceId
* providerWorkspaceId
* providerNodeId
* referenceMode (`linked`, `cloned`, `mirrored`)
* createdAt

---

# 6. Estrutura sugerida no Firestore

```text
users/{userId}
platformAdmins/{platformAdminId}
workspaces/{workspaceId}
workspaces/{workspaceId}/users/{workspaceUserId}
workspaces/{workspaceId}/nodes/{nodeId}
workspaces/{workspaceId}/nodeRelations/{relationId}
workspaces/{workspaceId}/nodeVersions/{versionId}
workspaces/{workspaceId}/contentSources/{sourceId}
workspaces/{workspaceId}/contentChunks/{chunkId}
workspaces/{workspaceId}/nodeContentLinks/{linkId}
workspaces/{workspaceId}/structuredBlocks/{blockId}
workspaces/{workspaceId}/suggestions/{suggestionId}
workspaces/{workspaceId}/trainingPaths/{trainingPathId}
workspaces/{workspaceId}/trainingSteps/{stepId}
workspaces/{workspaceId}/learningAssignments/{assignmentId}
workspaces/{workspaceId}/approvalLogs/{logId}
workspaceLinks/{workspaceLinkId}
federatedNodeRelations/{federatedRelationId}
sharedNodeReferences/{sharedNodeReferenceId}
```

Observação:

* subcoleções por workspace ajudam no isolamento e nas regras
* entidades federadas podem ficar top-level para facilitar consultas cruzadas

---

# 7. Motor estrutural: árvore visível + grafo real

O que o usuário vê:

* árvore
* mapa
* rede
* trilha

O que o sistema mantém:

* grafo de conhecimento

Solução:

* cada nó possui `primaryParentId` para navegação principal
* relações reais ficam em `NodeRelation`
* relações entre workspaces ficam em `FederatedNodeRelation`

---

# 8. Pipeline de ingestão de conteúdo

## Etapa 1 — Upload

Usuário envia:

* PDF
* DOCX
* texto
* nota
* transcrição

Arquivo vai para:

* Firebase Storage
* metadados em `ContentSource`

## Etapa 2 — Extração

Processamento:

* extração de texto
* limpeza
* normalização
* OCR apenas se necessário

## Etapa 3 — Chunking

Divisão em pedaços semanticamente úteis.

## Etapa 4 — Embeddings

Cada chunk recebe embedding.

## Etapa 5 — Classificação por IA

A IA avalia:

* temas
* nós candidatos
* novidade
* atualização
* sobreposição
* contradição
* oportunidade de treinamento

## Etapa 6 — Geração de sugestões

A IA gera propostas em `Suggestion`, sem alterar a base automaticamente.

---

# 9. Lógica de atualização de conhecimento

Quando novo conteúdo entra, o sistema precisa decidir:

* é novo?
* é repetição?
* complementa?
* substitui?
* contradiz?
* impacta treinamento?

## Pipeline

### 9.1 Similaridade semântica

Compara chunks novos com chunks e nós existentes.

### 9.2 Avaliação de novidade

Calcula:

* noveltyScore
* overlapScore
* updateLikelihood

### 9.3 Classificação de impacto

Possíveis resultados:

* new_topic
* supplement_existing
* replace_existing
* duplicate_low_value
* cross_link_only

### 9.4 Geração de proposta

A IA explica:

* o que encontrou
* por que sugere adicionar ou substituir
* qual nó seria afetado
* qual impacto haverá

### 9.5 Aprovação

Usuário decide:

* adicionar como complemento
* substituir conteúdo exibido
* criar nova versão
* ignorar
* anexar sem mexer na estrutura

---

# 10. Reorganização estrutural por IA

A IA atua como copiloto estrutural.

Exemplo:

"Separe fluxo de caixa em conceitos, rotina diária e indicadores."

Pipeline:

1 interpretar intenção
2 localizar nós afetados
3 montar proposta estrutural
4 calcular impacto
5 gerar preview visual e textual
6 criar `Suggestion`
7 aprovação do usuário
8 aplicação transacional

Regras críticas:

* nunca aplicar direto
* permitir desfazer
* manter versionamento
* registrar auditoria

---

# 11. Reescrita de blocos com IA

Cada bloco pode ser reescrito com base no contexto.

Fluxo:

1 usuário clica em “Melhorar com IA”
2 escolhe ação
3 sistema recupera bloco atual + chunks raw + nós relacionados
4 IA gera nova versão
5 sistema mostra diff
6 usuário aprova
7 nova versão é persistida

A IA deve ser grounding-first: priorizar material da própria base.

---

# 12. Treinamentos como nós especiais

## Nível conceitual

Treinamento é um `Node` do tipo `training`.

## Nível operacional

Execução via:

* `TrainingPath`
* `TrainingStep`

## Fluxo de criação manual

1 criar nó do tipo training
2 selecionar nós base
3 pedir à IA organização pedagógica
4 aprovação
5 geração da trilha

## Fluxo de sugestão automática

Ao detectar cluster temático suficiente, IA pode sugerir:

* novo treinamento
* expansão de treinamento
* atualização de trilha existente

---

# 13. Workspaces conectados e visão federada

A Narros deve permitir conexão opcional entre workspaces.

Princípio:

**workspaces não se fundem; eles se relacionam.**

## Com isso, o sistema pode:

* mostrar nós de mais de um workspace na mesma visualização
* marcar origem de cada nó
* sugerir pontos em comum
* criar relações federadas
* permitir referência cruzada controlada

## Escopos possíveis de visibilidade

### metadata_only

Compartilha:

* nome
* tipo
* tags
* resumo curto

### published_content

Compartilha:

* nome
* resumo
* blocos publicados

### full_content

Compartilha:

* conteúdo estruturado
* conteúdo raw
* contexto completo

## Regras

* conexão explícita
* escopo definido
* nenhuma fusão automática
* sugestões passam por aprovação

---

# 14. Permissões e governança

## Workspace admin

Pode:

* criar/editar nós
* aprovar sugestões
* reorganizar estrutura
* subir conteúdo
* publicar
* gerenciar conexões do workspace

## Curator

Pode:

* criar treinamentos
* editar trilhas
* solicitar reescritas
* sugerir mudanças
* aprovar mudanças menores, se permitido

## Member

Pode:

* consumir conteúdo
* consumir treinamentos
* pedir explicações
* acompanhar progresso

## Platform admin

Papéis internos da Narros:

* platform_super_admin
* platform_ops_admin
* platform_support
* platform_billing_admin
* platform_readonly

---

# 15. Administração da plataforma Narros

A plataforma deve possuir backoffice próprio.

Rotas sugeridas:

* `/admin`
* `/admin/workspaces`
* `/admin/workspaces/[workspaceId]`
* `/admin/users`
* `/admin/ingestion`
* `/admin/ai`
* `/admin/audit`
* `/admin/feature-flags`
* `/admin/support`

Alternativa preferida no futuro:

* `admin.narros.com.br`

## Funções principais

* gestão de workspaces
* gestão de planos/status
* feature flags
* suporte e impersonação controlada
* monitoramento de filas de ingestão
* observabilidade de IA
* auditoria

## Impersonação

Deve existir apenas com:

* motivo obrigatório
* log obrigatório
* escopo e tempo controlados

---

# 16. Fluxos principais do produto

## Fluxo A — ingestão

upload → processamento → chunking → embeddings → classificação → sugestão → aprovação → atualização da base

## Fluxo B — reorganização de nós

edição manual ou comando de IA → proposta → preview → aprovação → persistência → reindexação leve

## Fluxo C — melhoria de bloco

seleção → IA → diff → aprovação → versionamento

## Fluxo D — criação de treinamento

criação de nó training → associação de conteúdos → organização pela IA → aprovação → geração da trilha

## Fluxo E — atualização por conteúdo novo

novo conteúdo → IA detecta impacto → proposta → aprovação → atualização de nós e treinamentos

## Fluxo F — conexão entre workspaces

solicitação de conexão → definição de escopo → aprovação → ativação → detecção de relações → aprovação de pontes

---

# 17. Busca, recuperação e contexto para IA

A Narros precisa de recuperação híbrida:

* busca lexical
* busca por metadados
* busca por relação entre nós
* busca vetorial por embeddings

Objetivos:

* responder perguntas
* fundamentar reescritas
* comparar conteúdo novo com base existente
* sugerir conexões
* detectar relações entre workspaces conectados

A IA nunca deveria operar “solta”; sempre com contexto montado pelo sistema.

---

# 18. Versionamento

Versionar pelo menos:

* nós
* blocos estruturados
* relações
* treinamentos
* sugestões aprovadas

Regra prática:

Toda mudança aprovada gera snapshot versionado.

---

# 19. Consistência e transações

Mudanças críticas devem passar por backend orquestrador.

Exemplos:

* mover nó
* dividir nó
* fundir nó
* aprovar sugestão com múltiplos efeitos
* atualizar treinamento associado
* criar relação federada

Recomendação:

Usar Cloud Functions / Cloud Run para ações sensíveis.

---

# 20. Segurança

## Autenticação

* Firebase Auth
* Google
* email/senha
* SSO no futuro

## Autorização

Baseada em:

* workspace
* papel do usuário
* papel global de plataforma
* escopo de conexão entre workspaces

## Regras importantes

* arquivos separados por workspace
* regras impedem acesso cruzado indevido
* admin de workspace não acessa admin da plataforma
* IA não altera base automaticamente

---

# 21. Escalabilidade

## Fase 1 — MVP

* Firestore
* Storage
* Functions
* Vertex AI
* embeddings básicos
* React Flow
* aprovações manuais

## Fase 2

* workspaces conectados
* descoberta federada
* analytics
* dashboards
* grupos de usuários

## Fase 3

* sincronização avançada entre bases
* taxonomias avançadas
* multi-idioma
* integrações externas

---

# 22. Serviços lógicos internos

Mesmo com Firebase, faz sentido pensar em domínios:

* serviço de identidade
* serviço de workspaces
* serviço de conhecimento
* serviço de conteúdo
* serviço de IA
* serviço de treinamentos
* serviço de governança
* serviço de federação
* serviço de administração da plataforma

---

# 23. Estrutura sugerida do código

## Frontend

```text
src/
  app/
  components/
  features/
    auth/
    workspace/
    nodes/
    graph/
    content/
    suggestions/
    training/
    onboarding/
    federation/
    admin/
  lib/
  services/
  hooks/
  store/
  types/
```

## Backend / functions

```text
functions/src/
  modules/
    auth/
    workspaces/
    platform-admin/
    nodes/
    relations/
    federation/
    content/
    ingestion/
    ai/
    suggestions/
    training/
    approvals/
  shared/
    db/
    utils/
    schemas/
    prompts/
```

---

# 24. Prompts e IA

Prompts devem ser modulares, versionados e apoiados por lógica determinística.

Exemplos:

* classificar novo conteúdo
* detectar complemento ou substituição
* sugerir reorganização
* gerar treinamento
* reescrever bloco
* sugerir relação federada
* explicar impacto de mudança

Regra:

* embeddings e similaridade primeiro
* IA interpreta depois
* aprovação humana por fim

---

# 25. Decisões técnicas mais importantes

## Decisão 1

Modelar a Narros como **grafo com visão hierárquica**.

## Decisão 2

Separar:

* conteúdo raw
* conteúdo estruturado
* sugestões de IA

## Decisão 3

Toda alteração sensível da IA gera `Suggestion`.

## Decisão 4

Treinamentos são semanticamente nós e operacionalmente trilhas.

## Decisão 5

Atualização de conteúdo precisa classificar adição, complemento, substituição ou duplicação.

## Decisão 6

A lógica sensível passa por backend orquestrador.

## Decisão 7

Workspaces podem se relacionar, mas não se fundem.

## Decisão 8

Administração do cliente e administração da plataforma são camadas separadas.

---

# 26. Riscos técnicos a evitar

## Risco 1

Modelar como árvore rígida.

## Risco 2

Salvar só resumos.

## Risco 3

Permitir que IA altere a base diretamente.

## Risco 4

Não versionar.

## Risco 5

Misturar treinamento e conteúdo sem camada operacional própria.

## Risco 6

Misturar workspaces conectados como se fossem uma única base.

## Risco 7

Não separar admin do cliente e admin da plataforma.

---

# 27. Resumo executivo

A Narros deve ser construída como uma plataforma SaaS B2B baseada em workspace, com Firebase como base operacional, onde:

* o conhecimento é modelado em nós
* as relações formam um grafo
* a interface pode exibir árvore, mapa e trilhas
* o conteúdo raw é preservado
* a IA atua como copiloto editorial e estrutural
* toda mudança sensível passa por aprovação
* treinamentos surgem da rede de conhecimento
* workspaces podem se conectar com governança
* a plataforma possui backoffice administrativo próprio

---

# 28. Próximos documentos recomendados

Depois desta arquitetura técnica, os documentos mais úteis são:

1. Modelo de dados detalhado da Narros em Firestore
2. Prompt mestre para o Firebase Studio construir o MVP
3. Fluxo visual de ingestão + IA + aprovação
4. Arquitetura da interface do editor visual de nós

---

FIM DO DOCUMENTO