# Plano Faseado e Blueprint Completo

Data: 2026-04-01
Status: Proposto
Escopo deste documento: definir um plano de evolucao para persistir construcoes de relatorios em banco cloud, habilitar recomendacoes por contexto descritivo e preparar base de referencia para uso com IA via recuperacao contextual.

## 1. Objetivo Executivo

Construir uma plataforma de conhecimento de relatorios com tres capacidades:

1. Persistir cada construcao de relatorio (entrada, estrutura, validacoes, artefatos e resultado).
2. Permitir busca e recomendacao de relatorios similares a partir de descricao textual.
3. Integrar esta base ao fluxo de geracao para apoiar o Copilot com contexto relevante (RAG), sem treinar modelo-base.

## 2. Escopo e Nao-Escopo

### Escopo

1. Ingestao de metadados e especificacao de relatorios para banco cloud.
2. Modelo de dados versionado para SIMPLE e MASTER_DETAIL.
3. Catalogo pesquisavel por filtros tecnicos e semantica textual.
4. Motor de recomendacao com ranking hibrido.
5. Observabilidade, governanca e controles de seguranca.

### Nao-Escopo

1. Treino de modelo fundacional.
2. Persistencia de dados finais do PDF (linhas de negocio retornadas do banco).
3. Alteracao de regras funcionais do JasperReports 6.2.0.

## 3. Princípios de Arquitetura

1. Separar estilo de semantica de dados (evitar contaminacao).
2. Registrar trilha de auditoria completa por execucao.
3. Privacidade por padrao: minimizacao e mascaramento.
4. Contratos estaveis e versionados.
5. Evolucao incremental por fases curtas e testaveis.

## 4. Arquitetura de Referencia

## 4.1 Componentes

1. Gerador/Validador/Compilador atual (produtor de eventos de construcao).
2. Ingestion API (servico stateless para receber payloads de construcao).
3. Banco cloud transacional (PostgreSQL).
4. Camada vetorial (pgvector no proprio PostgreSQL, opcao preferencial para MVP).
5. Recommendation API (consulta hibrida: filtros + similaridade).
6. Consumer de feedback (aceite, rejeicao, edicao) para melhoria de ranking.
7. Dashboard operacional (telemetria e qualidade).

## 4.2 Fluxo de Dados (alto nivel)

1. Usuario descreve relatorio.
2. Pipeline gera/valida/compila.
3. Evento de construcao e metadados sao enviados para Ingestion API.
4. Banco persiste versao e execucao.
5. Recommendation API indexa descricao e estrutura.
6. Proxima solicitacao usa descricao atual para buscar relatorios semelhantes.
7. Sugestoes sao injetadas no contexto de geracao.

## 5. Plano Faseado

## Fase 0 - Fundacao e Contratos (1 semana)

### Objetivo

Definir contratos de dados, politicas e criterios de qualidade antes da codificacao pesada.

### Entregas

1. JSON Schema do evento de construcao.
2. Dicionario de dados das tabelas.
3. Politica de privacidade e mascaramento.
4. Criterios de aceite por fase.

### Criterios de aceite

1. Contratos versionados (v1) aprovados.
2. Campos obrigatorios e opcionais documentados.
3. Estrategia de PII definida e testavel.

## Fase 1 - Persistencia Basica (1 a 2 semanas)

### Objetivo

Salvar historico de construcao e execucao em banco cloud, sem recomendacao ainda.

### Entregas

1. Ingestion API com endpoint de escrita.
2. Tabelas base criadas (definitions, executions, artifacts, validations).
3. Persistencia de SIMPLE e MASTER_DETAIL.
4. Idempotencia por hash de conteudo.

### Criterios de aceite

1. 100% das compilacoes bem-sucedidas geram registro no banco.
2. Reprocessamento nao duplica execucao (idempotencia).
3. Consultas por periodo, view e status respondem em ate 300 ms (P95, dataset inicial).

## Fase 2 - Catalogo Pesquisavel (1 semana)

### Objetivo

Permitir descoberta de relatorios por filtros estruturados.

### Entregas

1. Endpoint de busca por filtros (view, campos, relacao, periodo, status).
2. Indexes SQL para filtros frequentes.
3. API de detalhes do relatorio com historico de versoes.

### Criterios de aceite

1. Busca por view + campos retorna resultados corretos.
2. Historico de versao navegavel por relatorio.
3. Campos sensiveis nunca expostos sem permissao.

## Fase 3 - Busca Semantica e Recomendacao (1 a 2 semanas)

### Objetivo

Sugerir relatorios a partir de descricao textual do usuario.

### Entregas

1. Pipeline de embeddings para descricao/cenario.
2. Tabela vetorial e indexacao.
3. Ranking hibrido: similaridade semantica + compatibilidade tecnica.
4. Endpoint suggest com top N e explicabilidade.

### Criterios de aceite

1. Precisao qualitativa validada com conjunto de teste interno.
2. Tempo de resposta de sugestao ate 700 ms (P95, sem cache quente).
3. Cada sugestao informa motivo (features que bateram).

## Fase 4 - Integracao no Fluxo de Geracao (1 semana)

### Objetivo

Usar as sugestoes no fluxo de criacao para aumentar acerto e reduzir retrabalho.

### Entregas

1. Hook de pre-geracao: consulta suggest antes de gerar JRXML.
2. Injecao de contexto com exemplos recomendados.
3. Flag de controle para ativar/desativar recomendacao por ambiente.
4. Captura de feedback do usuario apos sugestao.

### Criterios de aceite

1. Reducao de iteracoes de correcao por relatorio.
2. Taxa de aceite de sugestao monitorada.
3. Fallback seguro sem dependencia da recomendacao.

## Fase 5 - Governanca, Operacao e Escala (1 semana)

### Objetivo

Industrializar com observabilidade, seguranca e confiabilidade.

### Entregas

1. Dashboards (sucesso, erro, latencia, qualidade de sugestao).
2. Alertas de degradacao.
3. Politica de retencao e arquivamento.
4. Rotina de reindexacao e manutencao vetorial.

### Criterios de aceite

1. SLOs definidos e monitorados.
2. Plano de contingencia documentado.
3. Auditoria com trilha completa por evento.

## 6. Blueprint Tecnico Completo

## 6.1 Modelo de Dados (entidades)

### report_definition

Representa a identidade logica do relatorio.

Campos principais:

1. definition_id (UUID, PK)
2. report_name (texto)
3. topology_type (SIMPLE ou MASTER_DETAIL)
4. created_at, updated_at
5. source_workspace (texto)
6. active_version (inteiro)

### report_version

Representa a versao da definicao (estrutura e intencao).

Campos principais:

1. version_id (UUID, PK)
2. definition_id (FK)
3. version_number (inteiro)
4. intent_description (texto longo)
5. scenario_context (texto longo)
6. business_tags (texto[])
7. topology_payload (JSONB)
8. data_contract_payload (JSONB)
9. jrxml_hashes (JSONB)
10. created_by, created_at

### report_execution

Representa uma tentativa de validacao/compilacao.

Campos principais:

1. execution_id (UUID, PK)
2. version_id (FK)
3. status (SUCCESS, VALIDATION_FAILED, COMPILE_FAILED)
4. started_at, finished_at
5. duration_ms
6. diagnostics_payload (JSONB)
7. validation_payload (JSONB)
8. style_source_payload (JSONB)
9. data_source_payload (JSONB)

### report_artifact

Representa artefatos produzidos e rastreaveis.

Campos principais:

1. artifact_id (UUID, PK)
2. execution_id (FK)
3. artifact_type (JRXML, JASPER, PDF, LOG, METADATA)
4. relative_path
5. sha256
6. size_bytes
7. storage_uri (opcional, se mover para blob)

### report_feature

Representa features normalizadas para filtros e ranking.

Campos principais:

1. feature_id (UUID, PK)
2. version_id (FK)
3. master_view
4. detail_view (opcional)
5. fields_master (texto[])
6. fields_detail (texto[])
7. filters_declared (JSONB)
8. relationship_key (opcional)
9. sensitive_flags (JSONB)

### report_embedding

Representa vetor semantico para busca textual.

Campos principais:

1. embedding_id (UUID, PK)
2. version_id (FK)
3. model_name
4. vector (vector)
5. text_snapshot
6. created_at

### report_feedback

Representa sinais de qualidade para tuning de ranking.

Campos principais:

1. feedback_id (UUID, PK)
2. execution_id (FK)
3. suggestion_id (opcional)
4. action (ACCEPTED, EDITED, REJECTED)
5. reason_code (opcional)
6. comment (opcional)
7. created_at

## 6.2 DDL de Referencia (SQL base)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE report_definition (
  definition_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_name TEXT NOT NULL,
  topology_type TEXT NOT NULL CHECK (topology_type IN ('SIMPLE','MASTER_DETAIL')),
  source_workspace TEXT,
  active_version INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE report_version (
  version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  definition_id UUID NOT NULL REFERENCES report_definition(definition_id),
  version_number INT NOT NULL,
  intent_description TEXT,
  scenario_context TEXT,
  business_tags TEXT[] DEFAULT '{}',
  topology_payload JSONB NOT NULL,
  data_contract_payload JSONB NOT NULL,
  jrxml_hashes JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (definition_id, version_number)
);

CREATE TABLE report_execution (
  execution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES report_version(version_id),
  status TEXT NOT NULL CHECK (status IN ('SUCCESS','VALIDATION_FAILED','COMPILE_FAILED','UNKNOWN')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  diagnostics_payload JSONB,
  validation_payload JSONB,
  style_source_payload JSONB,
  data_source_payload JSONB,
  idempotency_key TEXT UNIQUE
);

CREATE TABLE report_artifact (
  artifact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES report_execution(execution_id),
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('JRXML','JASPER','PDF','LOG','METADATA')),
  relative_path TEXT,
  sha256 TEXT,
  size_bytes BIGINT,
  storage_uri TEXT
);

CREATE TABLE report_feature (
  feature_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES report_version(version_id),
  master_view TEXT,
  detail_view TEXT,
  fields_master TEXT[] DEFAULT '{}',
  fields_detail TEXT[] DEFAULT '{}',
  filters_declared JSONB,
  relationship_key TEXT,
  sensitive_flags JSONB
);

CREATE TABLE report_embedding (
  embedding_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES report_version(version_id),
  model_name TEXT NOT NULL,
  vector VECTOR(1536) NOT NULL,
  text_snapshot TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (version_id, model_name)
);

CREATE TABLE report_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES report_execution(execution_id),
  suggestion_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('ACCEPTED','EDITED','REJECTED')),
  reason_code TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_status_time ON report_execution(status, finished_at DESC);
CREATE INDEX idx_feature_views ON report_feature(master_view, detail_view);
CREATE INDEX idx_embedding_ivfflat ON report_embedding USING ivfflat (vector vector_cosine_ops);
```

## 6.3 Contrato de Ingestao (JSON)

```json
{
  "eventVersion": "1.0",
  "source": "jasper-pipeline",
  "idempotencyKey": "sha256:<hash>",
  "report": {
    "name": "PAZIENTE_ALLERGIA_MASTER",
    "topologyType": "MASTER_DETAIL",
    "intentDescription": "Relatorio de pacientes e alergias",
    "scenarioContext": "Operacao clinica diaria",
    "businessTags": ["saude", "operacional"]
  },
  "topology": {
    "masterView": "view_pazienti",
    "detailView": "view_paziente_allergie",
    "relationshipKey": "paziente_allergia",
    "fieldsMaster": ["paziente_id", "nome"],
    "fieldsDetail": ["allergia", "gravita"],
    "filters": [
      {"name": "dataInicio", "type": "DATE", "required": false}
    ]
  },
  "execution": {
    "status": "SUCCESS",
    "startedAt": "2026-04-01T20:21:58.000Z",
    "finishedAt": "2026-04-01T20:22:03.083Z",
    "diagnostics": {},
    "validation": {}
  },
  "artifacts": [
    {"type": "JRXML", "path": "output/x/master.jrxml", "sha256": "...", "sizeBytes": 12345},
    {"type": "PDF", "path": "output/x/master.pdf", "sha256": "...", "sizeBytes": 4262}
  ],
  "styleSource": {
    "type": "nativa",
    "path": null,
    "confidence": null,
    "fallbackApplied": false,
    "appliedAt": "2026-04-01T20:22:03.083Z"
  },
  "security": {
    "containsSensitiveFields": true,
    "sensitivePolicyApplied": "mask-and-minimize"
  }
}
```

## 6.4 APIs de Referencia

### POST /v1/report-events

Finalidade: ingestao de evento de construcao.

Regras:

1. Idempotente por idempotencyKey.
2. Rejeita payload sem campos obrigatorios.
3. Retorna eventId persistido.

### GET /v1/reports/search

Parametros sugeridos:

1. q (texto livre)
2. topologyType
3. masterView
4. detailView
5. fields (lista)
6. dateFrom/dateTo

Retorno:

1. Lista de definicoes com score.
2. Motivo do score (explicabilidade).

### POST /v1/reports/suggest

Entrada:

1. contextDescription
2. optionalConstraints (view, topology, campos)

Saida:

1. topSuggestions com score total.
2. scoreBreakdown (semanticScore, technicalCompatibilityScore, freshnessScore, qualityScore).

### POST /v1/reports/feedback

Entrada:

1. suggestionId
2. action
3. reasonCode
4. comment (opcional)

Saida:

1. feedbackId.
2. status de processamento.

## 6.5 Logica de Ranking Hibrido

Formula inicial sugerida:

score_total = 0.45 * score_semantico + 0.35 * score_compatibilidade_tecnica + 0.10 * score_qualidade_historica + 0.10 * score_recencia

### score_semantico

1. Similaridade de embeddings entre contexto atual e snapshots historicos.

### score_compatibilidade_tecnica

1. Match de topologyType.
2. Match de view(s).
3. Intersecao de campos.
4. Compatibilidade de filtros e cardinalidade.

### score_qualidade_historica

1. Taxa de sucesso de compilacao.
2. Menor incidencia de validacao falha.
3. Sinal positivo de feedback.

### score_recencia

1. Peso maior para versoes recentes dentro de janela temporal.

## 6.6 Privacidade, Seguranca e Compliance

1. Nao armazenar dados retornados pelas queries do relatorio.
2. Armazenar apenas metadados tecnicos e texto descritivo controlado.
3. Mascarar referencias sensiveis em texto livre quando necessario.
4. Criptografia em repouso e em transito.
5. Controle de acesso por papeis (RBAC): admin, maintainer, reader.
6. Auditoria obrigatoria de leitura/escrita de eventos e feedback.

## 6.7 Observabilidade e Operacao

### SLOs iniciais

1. Ingestao: disponibilidade >= 99.5%.
2. Busca estruturada: P95 <= 300 ms.
3. Suggest hibrido: P95 <= 700 ms.

### Metricas essenciais

1. Taxa de erro por endpoint.
2. Throughput de eventos por hora.
3. Taxa de idempotencia acionada.
4. Taxa de aceite de sugestoes.
5. Precision at K (avaliacao interna).

### Alertas

1. Picos de VALIDATION_FAILED.
2. Queda abrupta de aceite de sugestao.
3. Latencia acima de SLO por 3 janelas consecutivas.

## 7. Plano de Implementacao Detalhado (Backlog Inicial)

## Sprint A - Contratos e base de banco

1. Publicar JSON Schema v1.
2. Criar migracoes SQL para tabelas base.
3. Criar seeds com amostras anonimizadas.

## Sprint B - Ingestion API

1. Implementar POST /v1/report-events.
2. Validacao de schema + idempotencia.
3. Persistencia transacional completa.

## Sprint C - Catalogo e consulta

1. Implementar GET /v1/reports/search.
2. Indexes e tuning de consultas.
3. Endpoint de detalhe por relatorio.

## Sprint D - Vetorial e suggest

1. Pipeline de embeddings.
2. Implementar POST /v1/reports/suggest.
3. Explicabilidade de score no payload.

## Sprint E - Integracao e feedback

1. Hook de pre-geracao para consumir suggest.
2. Captura de feedback do usuario.
3. Dashboard de qualidade.

## 8. Riscos e Mitigacoes

1. Risco: baixa qualidade inicial de sugestao.
   Mitigacao: ranking hibrido com filtro tecnico forte e feedback loop.

2. Risco: vazamento de dado sensivel em texto livre.
   Mitigacao: mascaramento, bloqueio por regex e revisao de payload.

3. Risco: aumento de latencia no fluxo de geracao.
   Mitigacao: cache de sugestoes e timeout com fallback sem recomendacao.

4. Risco: explosao de custo de vetores.
   Mitigacao: compactacao, politica de retencao e reindexacao por prioridade.

## 9. Criterios de Go/No-Go

Go para producao quando:

1. Ingestao idempotente validada em carga.
2. Sugestao com explicabilidade habilitada.
3. Compliance de campos sensiveis aprovado.
4. SLOs atendidos por 2 semanas consecutivas.

No-Go se:

1. Sugestao sem controle de seguranca.
2. Latencia fora do limite sem fallback.
3. Taxa de erro de ingestao acima de 2% sustentada.

## 10. Resultado Esperado

Ao final das fases, a organizacao tera:

1. Repositorio cloud de inteligencia operacional de relatorios.
2. Base confiavel para recomendacao por descricao contextual.
3. Capacidade de apoiar o Copilot com contexto recuperado (RAG), melhorando velocidade e consistencia de entrega.

Observacao final: esta abordagem habilita uso da base como referencia ativa para o Copilot no momento da geracao. Isso nao significa treino automatico do modelo-base, e sim uso de contexto recuperado de forma controlada.
