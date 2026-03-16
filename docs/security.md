# Narros — Configurações de Segurança

Documento consolidado com as políticas, princípios e configurações de segurança da plataforma Narros.

Baseado no **Script de Segurança para times de TI, Jurídico e Cibersegurança**, traduzido em requisitos de produto e arquitetura.

---

# 1. Princípios de Segurança da Narros

A segurança da Narros segue cinco princípios fundamentais:

1. **Isolamento de dados por workspace**
2. **Zero uso de dados de clientes para treinamento de IA**
3. **Criptografia em trânsito e em repouso**
4. **Acesso interno controlado e auditável**
5. **Portabilidade total de dados do cliente**

Esses princípios orientam toda a arquitetura da plataforma.

---

# 2. Uso de Dados e Inteligência Artificial

## 2.1 Treinamento de modelos

Regra absoluta da plataforma:

**Dados de clientes nunca são usados para treinamento de modelos de IA.**

O conteúdo enviado para a Narros é utilizado exclusivamente para:

* gerar resultados solicitados
* estruturar base de conhecimento
* executar processamento interno

Após o processamento:

* o conteúdo permanece armazenado apenas no workspace do cliente
* não é reutilizado para treinamento
* não é compartilhado com outros clientes

## 2.2 Modelos de IA utilizados

A Narros utiliza:

**Google Vertex AI (Gemini)** para processamento.

Política relevante do provedor:

* dados de clientes corporativos não são utilizados para treinamento de modelos

Isso difere de ferramentas consumer que podem reutilizar prompts para treinamento.

---

# 3. Isolamento de Dados

A Narros é uma plataforma **multi-tenant orientada por workspace**.

Cada workspace possui isolamento lógico completo.

Isolamento aplicado em:

* banco de dados
* armazenamento
* indexação semântica
* processamento de IA

Nenhum workspace possui acesso aos dados de outro workspace.

---

# 4. Armazenamento de Dados

## 4.1 Infraestrutura

A infraestrutura roda sobre:

**Google Cloud Platform (GCP)**

Serviços principais:

* Cloud Firestore
* Firebase Auth
* Cloud Storage
* Cloud Functions
* Vertex AI

## 4.2 Localização dos dados

Regiões disponíveis:

* Brasil
* Estados Unidos

Para clientes Enterprise:

* opção de residência de dados em **southamerica-east1 (São Paulo)**

---

# 5. Criptografia

## 5.1 Criptografia em trânsito

Todo tráfego utiliza:

**TLS 1.3**

Características:

* protocolo mais recente
* sem suporte a versões vulneráveis
* proteção contra downgrade attacks

## 5.2 Criptografia em repouso

Dados armazenados utilizam:

**AES‑256**

Aplicado em:

* banco de dados
* armazenamento de arquivos
* backups

## 5.3 Gerenciamento de chaves

Chaves criptográficas são gerenciadas por:

**Google Cloud KMS**

Características:

* rotação automática
* acesso restrito
* logs de uso

Nenhum colaborador da Narros possui acesso direto às chaves.

---

# 6. Controle de Acesso Interno

## 6.1 Princípio de acesso mínimo

Colaboradores da Narros **não possuem acesso padrão a dados de clientes**.

Acesso a dados de produção requer:

* aprovação interna
* motivo documentado
* registro auditável

## 6.2 Acesso para suporte

O único cenário em que dados podem ser acessados é:

**suporte solicitado explicitamente pelo cliente**.

Mesmo nesse caso:

* acesso é temporário
* acesso é registrado
* logs são mantidos

---

# 7. Controle de Acesso do Cliente

Administradores do workspace controlam:

* quem entra
* quem visualiza conteúdos
* quem pode editar

Modelo atual:

* admin
* membro

Planos Enterprise incluem:

* admin
* editor
* leitura

Ao remover um usuário:

**acesso é revogado imediatamente**.

---

# 8. Logs e Auditoria

Logs disponíveis para planos Pro e Enterprise.

Eventos registrados:

* login
* uploads de conteúdo
* acesso a documentos
* alterações na base de conhecimento
* aprovações de IA

Integrações possíveis:

* exportação de logs
* integração com SIEM
* retenção configurável

---

# 9. Governança de Dados

## 9.1 Exportação de dados

Clientes podem exportar toda a base de conhecimento.

Formatos disponíveis:

* JSON
* CSV

Exportação inclui:

* nós
* conteúdos
* estrutura
* treinamentos

## 9.2 Exclusão de dados

Ao cancelar a conta:

Opções disponíveis:

1. exportar dados
2. solicitar exclusão

Prazo de exclusão:

**até 30 dias**, incluindo backups.

---

# 10. LGPD e Privacidade

A Narros é projetada para conformidade com **LGPD**.

Inclui:

* DPO designado
* política de privacidade pública
* DPA disponível

Direitos do titular suportados:

* acesso
* retificação
* portabilidade
* exclusão

Em caso de incidente:

notificação em até **72 horas**.

---

# 11. Certificações

Infraestrutura utilizada:

Google Cloud Platform.

Certificações:

* SOC 2 Type II
* ISO 27001

A Narros planeja certificação própria **SOC 2**.

---

# 12. Plano de Resposta a Incidentes

A Narros mantém um plano documentado.

Fluxo de resposta:

1. detecção automática
2. contenção
3. investigação
4. avaliação de impacto
5. notificação aos clientes
6. relatório de causa raiz

Ferramenta de monitoramento:

Google Cloud Security Command Center.

---

# 13. Disponibilidade e SLA

Planos Pro:

**99.5% uptime alvo**

Planos Enterprise:

**99.9% SLA contratual**

Status público da plataforma:

status.narros.com.br

---

# 14. Políticas de IA para empresas

A Narros foi desenhada para ambientes corporativos.

Características:

* isolamento de dados
* sem treinamento com dados do cliente
* governança de conteúdo

Isso diferencia a plataforma de ferramentas consumer.

---

# 15. Boas Práticas de Uso

Recomendação para clientes:

minimização de dados pessoais.

Exemplo:

substituir nomes de clientes por identificadores genéricos.

Isso reduz riscos regulatórios.

---

# 16. Continuidade de Negócio

Dois mecanismos importantes:

## Portabilidade

Dados exportáveis a qualquer momento.

## Escrow

Para contratos Enterprise:

possibilidade de:

* escrow de código
* bucket próprio do cliente no GCP

---

# 17. Materiais de Segurança Disponíveis

Documentos disponíveis:

* Política de Privacidade
* Página de Segurança
* Data Processing Agreement
* Certificados Google Cloud
* Questionários VSAQ / SIG Lite
* Security Overview
* Relatórios de Pentest (Enterprise)

---

# 18. Contatos de Segurança

Segurança técnica:

[seguranca@narros.com.br](mailto:seguranca@narros.com.br)

Privacidade e LGPD:

[privacidade@narros.com.br](mailto:privacidade@narros.com.br)

Enterprise:

[enterprise@narros.com.br](mailto:enterprise@narros.com.br)

---

# 19. SLA de Avaliação de Segurança

Questionários de segurança respondidos em até:

**5 dias úteis**.

Calls com times de TI e jurídico podem ser agendadas via:

narros.com.br/agendar

---

# 20. Resumo

A Narros foi projetada com foco em:

* isolamento de dados
* segurança enterprise
* governança de IA
* portabilidade de conhecimento

Esses princípios garantem que organizações possam usar IA para estruturar conhecimento sem comprometer segurança ou compliance.

---

FIM DO DOCUMENTO
