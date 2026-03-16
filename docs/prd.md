# Narros — PRD Completo (Documento Vivo)

Versão consolidada contendo:

* PRD original
* atualizações posteriores
* arquitetura conceitual
* novos recursos discutidos

Este documento é intencionalmente **cumulativo**. Nenhuma decisão anterior foi removida. Atualizações são adicionadas em seções posteriores.

---

# 1. Visão do Produto

Narros é uma plataforma de **estruturação, organização e distribuição de conhecimento corporativo orientada por IA**.

Seu objetivo é transformar conhecimento disperso em empresas — presente em documentos, reuniões, mensagens e experiências informais — em uma **base estruturada, navegável e evolutiva de conhecimento**.

A plataforma permite que organizações:

* centralizem conhecimento operacional
* organizem informações em uma rede estruturada
* criem treinamentos e onboarding automaticamente
* atualizem conteúdos de forma contínua
* utilizem IA para estruturar, reorganizar e melhorar conteúdos

Diferentemente de wikis ou LMS tradicionais, a Narros funciona como um **mapa vivo de conhecimento da organização**.

---

# 2. Problema que a Narros resolve

Empresas acumulam conhecimento em diversos formatos:

* PDFs
* apresentações
* documentos internos
* gravações de reunião
* áudios de WhatsApp
* mensagens de chat
* anotações informais

Essas informações normalmente apresentam problemas como:

* conhecimento fragmentado
* dificuldade de atualização
* duplicação de conteúdo
* dependência de pessoas específicas
* dificuldade de onboarding de novos colaboradores

Narros resolve esse problema criando uma **estrutura evolutiva de conhecimento**, onde conteúdos são organizados em **nós interligados**, alimentados continuamente por novos materiais.

---

# 3. Princípios fundamentais da Narros

## Estrutura orientada por nós

A unidade central da plataforma não é o documento, mas **o nó de conhecimento**.

Cada nó representa um conceito, processo ou área de conhecimento da organização.

## Estrutura dinâmica

A organização da base pode evoluir ao longo do tempo.

Quando a estrutura é reorganizada:

* a interface muda
* a estrutura persistida também muda
* as relações de conhecimento são atualizadas

## Base de conhecimento viva

A plataforma mantém uma camada de **conteúdo raw**, que preserva o conhecimento completo e permite que a IA:

* reescreva conteúdos
* gere explicações adicionais
* atualize conteúdos
* crie novas versões

## IA como camada de inteligência

A IA atua como um sistema de apoio que:

* interpreta novos conteúdos
* sugere organização estrutural
* propõe atualizações
* cria treinamentos
* melhora textos

Nenhuma alteração estrutural é aplicada automaticamente.

Toda ação da IA requer **aprovação do usuário**.

---

# 4. Perfis de usuário

## 4.1 Administrador

Responsável pela governança da base de conhecimento.

Funções:

* subir documentos e conteúdos
* organizar nós
* reorganizar estrutura da rede
* aprovar sugestões da IA
* gerenciar permissões
* manter consistência da base

## 4.2 Curador (Gestor de Jornada)

Responsável por transformar conhecimento em experiências de aprendizado.

Pode representar:

* RH
* People Ops
* líderes de área
* responsáveis por treinamento

Funções:

* montar trilhas de treinamento
* criar onboarding
* selecionar conteúdos
* adaptar linguagem
* usar IA para organizar conteúdos

## 4.3 Colaborador

Usuário final que consome o conhecimento.

Funções:

* acessar conteúdos
* navegar pelos nós
* realizar treinamentos
* consultar processos
* solicitar explicações adicionais via IA

---

# 5. Estrutura de conhecimento

A base da Narros é organizada em uma **rede de nós interconectados**.

## 5.1 Nós

Um nó representa uma unidade de conhecimento.

Exemplos:

* Fluxo de Caixa
* Processo de Vendas
* Política de Reembolso
* Atendimento ao Cliente

Cada nó contém:

* título
* descrição
* tipo de nó
* conteúdo estruturado
* conteúdo raw
* relações com outros nós
* histórico de versões

## 5.2 Tipos de nó

Tipos suportados:

* conhecimento
* processo
* política
* ferramenta
* referência
* treinamento
* onboarding

## 5.3 Subnós

Nós podem conter subnós.

Exemplo:

Financeiro
→ Fluxo de Caixa
→ Contas a Pagar
→ Conciliação Bancária

## 5.4 Relações laterais

Nós podem possuir múltiplas relações.

Exemplo:

Fluxo de Caixa pode se relacionar com:

* Financeiro
* Planejamento
* Gestão de Custos

---

# 6. Reorganização estrutural

## 6.1 Reorganização manual

Administradores podem:

* mover nós
* criar subnós
* fundir nós
* dividir nós
* criar relações entre áreas

Ao salvar:

* banco de dados atualizado
* relações recalculadas
* navegação atualizada

## 6.2 Reorganização via IA

Usuários podem reorganizar a base por linguagem natural.

Exemplo:

"Mover fluxo de caixa para dentro de financeiro operacional e criar subdivisão entre contas a pagar e contas a receber."

Fluxo:

1 interpretação
2 proposta
3 preview
4 explicação
5 aprovação
6 atualização

---

# 7. Camadas de conteúdo

## 7.1 Conteúdo estruturado

Conteúdo exibido:

* explicações
* guias operacionais
* passo a passo
* resumos

## 7.2 Conteúdo raw

Conteúdo base:

* documentos completos
* transcrições
* anotações
* materiais de origem

Usado pela IA para:

* reescrita
* expansão
* atualização

---

# 8. Atualização da base de conhecimento

Quando novos conteúdos são enviados, a IA avalia o impacto.

Fluxo:

1 análise semântica
2 comparação
3 classificação

## Cenários

### Novo conhecimento

Criar novo nó.

### Complemento

Expandir nó existente.

### Atualização

Substituir conteúdo.

Todas as mudanças passam por **aprovação do usuário**.

---

# 9. Melhoria de textos com IA

Cada bloco possui botão:

**Melhorar com IA**

Possibilidades:

* clarificar
* detalhar
* simplificar
* transformar em passo a passo
* adaptar para onboarding
* explicar com exemplos

Fluxo:

1 selecionar bloco
2 escolher melhoria
3 IA consulta conteúdo raw
4 gera nova versão
5 aprovação

---

# 10. Treinamentos

Treinamentos são **nós especiais dentro da rede**.

Eles organizam outros nós em jornadas.

## Estrutura

Um treinamento contém:

* nome
* objetivo
* nós associados
* sequência pedagógica

## Criação

1 criar nó
2 tipo treinamento
3 selecionar conteúdos
4 IA organiza módulos

## Sugestão automática

Ao detectar clusters de conhecimento, IA pode sugerir novos treinamentos.

## Atualização

Se um nó for atualizado, treinamentos relacionados podem ser revisados.

---

# 11. Trilhas e jornadas

Treinamentos podem conter caminhos diferentes.

Exemplo:

Treinamento Comercial

Caminho A — SDR
Caminho B — Closer
Caminho C — Gestor

---

# 12. Arquitetura conceitual

Quatro camadas principais:

1 Estrutura de conhecimento
2 Conteúdo
3 Inteligência
4 Experiência

---

# 13. Governança de IA

A IA apenas **sugere**.

Nunca altera dados automaticamente.

Sempre requer aprovação humana.

---

# 14. Diferencial da Narros

Plataformas tradicionais:

* wiki
* LMS

Narros:

**rede viva de conhecimento organizacional**.

---

# 15. Atualização posterior — Treinamentos integrados à rede

Treinamentos podem ser criados diretamente como nós.

Fluxo adicional:

1 usuário cria nó em "Treinamentos"
2 seleciona conteúdos
3 pede à IA para organizar

A IA pode:

* criar módulos
* ordenar aprendizado
* sugerir exercícios

---

# 16. Atualização posterior — Workspaces conectados

Workspaces podem ser conectados entre si.

Cada workspace permanece isolado, mas pode compartilhar visão.

Benefícios:

* grupos empresariais
* franquias
* bases de conhecimento relacionadas

## Comportamento

Quando conectados:

* nós podem aparecer juntos
* IA pode sugerir relações
* pontos comuns podem ser detectados

## Escopos possíveis

* metadados
* conteúdo publicado
* conteúdo completo

---

# 17. Relações federadas entre workspaces

A plataforma pode criar ligações entre nós de workspaces diferentes.

Exemplo:

Nó "Fluxo de Caixa" Workspace A

Relacionado a

Nó "Rotina de Caixa" Workspace B

Essas relações são chamadas **federated relations**.

Sempre aprovadas pelo usuário.

---

# 18. Administração da plataforma Narros

Além dos administradores de workspace, existe administração da plataforma.

Área interna acessível em:

`narros.com.br/admin`

ou

`admin.narros.com.br`

## Funções

* gestão de workspaces
* gestão de usuários
* monitoramento de ingestão
* controle de IA
* feature flags
* auditoria

## Perfis administrativos

* platform_super_admin
* platform_ops_admin
* platform_support
* platform_billing_admin
* platform_readonly

---

# 19. Segurança

Separação clara entre:

Admin do workspace

vs

Admin da plataforma.

Um não implica acesso ao outro.

---

# 20. Fluxos principais do produto

### Ingestão

upload → processamento → chunking → embeddings → sugestão → aprovação

### Reorganização

edição → proposta → preview → aprovação → persistência

### Melhoria de conteúdo

seleção → IA → diff → aprovação

### Criação de treinamento

seleção de nós → IA organiza → aprovação

### Atualização

novo conteúdo → IA classifica → proposta → aprovação

---

# 21. Estrutura de evolução do produto

## Fase 1

* base de nós
* ingestão
* sugestões IA
* treinamentos básicos

## Fase 2

* workspaces conectados
* descoberta federada
* melhoria de busca

## Fase 3

* sincronização entre bases
* automação avançada
* multi‑idioma

---

# 22. Visão final

Narros não é apenas uma wiki.

Ela é uma **infraestrutura de conhecimento organizacional orientada por IA**, onde:

* conhecimento vira rede
* documentos viram nós
* treinamentos emergem da base
* IA ajuda a organizar
* humanos mantêm governança.

---

FIM DO DOCUMENTO
