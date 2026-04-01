# Plano Faseado de Evolucao para Jasper Master/Detail

## 1. Objetivo

Evoluir o setup atual de geracao de relatorios Jasper para suportar dois formatos de forma oficial:

- Relatorio simples (modo atual, sem regressao)
- Relatorio master/detail (novo modo)

Premissas obrigatorias:

- Manter compatibilidade com JasperReports 6.2.0
- Preservar fluxo fail-safe existente (validacao -> compilacao -> PDF -> metadata)
- Nao quebrar artefatos e comandos usados hoje pelo time de deploy
- Garantir que o modo simples continue sendo o default

## 2. Diagnostico do Estado Atual

### 2.1 O que ja existe e funciona bem

- Template e quickstart focados em relatorio simples
- Validacao estrutural e de tipos SQL/JRXML via scripts/validate.js
- Compilacao e exportacao PDF com dados via scripts/compile.js e jasper-runner
- Regras centralizadas de views/campos em rules/views.json
- Pipeline de estilo com protecao de contaminacao semantica de modelos JRXML

### 2.2 Lacunas para master/detail

- Nao existe contrato de prompt especifico para master/detail
- Nao existe schema funcional para descrever relacao pai-filho e mapeamento de parametros
- Nao existe validacao dedicada para invariantes de master/detail (chaves, parametros, subreport)
- Runner nao oferece contrato explicito para parametros de subreport (ex.: caminho de subreport compilado)
- Nao ha checklist operacional e troubleshooting focados em master/detail
- Nao ha suite de regressao cobrindo simples + master/detail

### 2.3 Riscos tecnicos principais

- Regressao no modo simples por mudancas no validador/compilador
- Quebras por diferencas de parametros entre master e detail
- PDFs vazios por filtros/joins mal modelados no detail
- Acoplamento indevido entre estilo e semantica de dados
- Complexidade elevada para time de deploy sem guardrails de prompt

## 3. Principios de Arquitetura para Evolucao

- Backward compatibility first: qualquer fluxo atual de relatorio simples deve permanecer valido
- Feature-flag semantica por tipo de report: simples e master/detail com regras distintas
- Contratos explicitos e validaveis: schema para entrada, metadados e regras
- Fail-safe estrito: se validar falhar, nao compilar; se compilar falhar, nao entregar
- Observabilidade operacional: logs e metadata detalhando formato e vinculos
- Incremental rollout: cada fase com criterio de aceite e rollback claro

## 4. Arquitetura Alvo (Visao)

## 4.1 Modos suportados

- Modo simples: mantem query unica e 4 bandas basicas
- Modo master/detail: master principal + detail via subreport

## 4.2 Contrato funcional de master/detail

Entrada minima necessaria:

- Cenário (contexto do negócio para ambos master e detail)
- Master view + agrupado por master
- Detail view + agrupado por detail
- Chave(s) de relacionamento (master -> detail)
- Campos master
- Campos detail
- Filtros master
- Filtros detail
- Parametros de propagacao master -> detail

Invariantes obrigatorios:

- Toda chave usada no vinculo deve existir em rules/views.json nas duas views
- Todo parametro referenciado no detail deve estar declarado e mapeado no master
- Subreport deve ter caminho de .jasper detail resolvido por parametro dedicado
- SQL do detail deve ser parametrizado (sem hardcode de chave)

## 4.3 Estrategia de artefatos

- Master/detail gera pasta de output unica por execucao
- Artefatos minimos:
  - master.jrxml
  - detail.jrxml
  - master.jasper
  - detail.jasper
  - master.pdf (preview)
  - logs de validacao/compilacao
  - metadata.json enriquecido com graph master/detail

## 5. Plano Faseado de Evolucao

## Fase 0 - Baseline e Seguranca de Regressao

Objetivo:

- Congelar baseline do modo simples e criar rede de seguranca antes de evoluir

Entregas:

- Inventario dos comandos e arquivos criticos usados em producao
- Matriz de compatibilidade do modo simples
- Casos de teste de regressao de relatorio simples

Criterios de aceite:

- 100% dos cenarios simples atuais continuam passando
- Nenhuma alteracao de interface de comando sem compatibilidade retroativa

Rollback:

- Reverter para scripts atuais e desabilitar feature master/detail

## Fase 1 - Contrato de Prompt e Input (Sem alterar runtime)

Objetivo:

- Definir linguagem de solicitacao robusta para ambos formatos (simples e master/detail)

Entregas:

- Atualizacao do prompts/relatorio-simples.prompt.md para incluir campos estruturados:
  - Cenário (contexto do negócio, descritivo: motivação do relatório)
  - Agrupado por (lista de campos/atributos da view para agrupamento / dimensão principal)
- Novo prompt template: prompts/relatorio-master-detail.prompt.md
- Secao de escolha explicita de formato no prompt (simples ou master/detail)
- Exemplos prontos de prompt para 2 cenarios reais (1 simples, 1 master/detail)

Contrato minimo no prompt simples (revisado):

- Nome do relatorio
- Cenário (contexto do negócio)
- View selecionada
- Agrupado por (campo(s) de dimensao/agrupamento)
- Campos desejados
- Filtros e tipos
- Layout esperado

Contrato minimo no prompt master/detail:

- Nome do relatorio
- Cenário (contexto do negócio)
- Formato: MASTER_DETAIL
- View master + cenário master
- View detail + cenário detail
- Chave de relacao (master.campo = detail.campo)
- Agrupado por (master)
- Agrupado por (detail)
- Campos master
- Campos detail
- Filtros e tipos (master e detail)
- Ordenacao (master e detail)
- Layout esperado do detail

Criterios de aceite:

- Prompt gera especificacao completa sem ambiguidade (ambos formatos)
- Time de deploy consegue preencher sem conhecimento de JRXML interno
- Cenário e Agrupado por reduzem ambiguidade na geração do SQL e layout

## Fase 2 - Evolucao de Regras (rules/views.json)

Objetivo:

- Permitir validacao automatica de relacoes master/detail

Entregas:

- Extensao de schema em rules/views.json com bloco de relacionamento opcional
- Campos sugeridos por view para papel master e detail
- Regras de cardinalidade esperada (1:N, 1:1)

Modelo sugerido (conceitual):

- views.<view>.relations[] com:
  - targetView
  - localKey
  - foreignKey
  - cardinality
  - joinTypePermitido

Criterios de aceite:

- Validador consegue confirmar se relacao pedida existe e e permitida
- Modo simples continua validando com schema antigo (compatibilidade)

## Fase 3 - Validador Semantico Master/Detail

Objetivo:

- Adicionar validacoes especificas sem enfraquecer as atuais

Entregas:

- Novo caminho de validacao para formato master/detail em scripts/validate.js
- Regras novas:
  - consistencia de chaves master/detail
  - declaracao de parametros de subreport
  - mapeamento de parametros master -> detail
  - proibicao de hardcode no detail
  - verificacao de campos detail declarados e tipados
- Codigo de saida diferenciado para falhas semanticas master/detail

Criterios de aceite:

- Erros de configuracao de subreport detectados antes da compilacao
- Validacao do modo simples permanece inalterada

## Fase 4 - Pipeline de Compilacao em Dois Estagios

Objetivo:

- Compilar detail antes de master e garantir binding do subreport

Entregas:

- Evolucao de scripts/compile.js para fluxo master/detail:
  - compilar detail.jrxml -> detail.jasper
  - injetar parametro de caminho do detail.jasper no master
  - compilar master.jrxml -> master.jasper
  - gerar PDF do master com detail resolvido
- Logs explicitando etapa por etapa

Requisitos tecnicos:

- Parametro padrao para subreport path (ex.: SUBREPORT_DETAIL_PATH)
- Resolucao absoluta/relativa robusta para Windows e Linux
- Falha imediata se detail.jasper nao existir

Criterios de aceite:

- PDF master/detail gerado com dados reais e detail preenchido
- Modo simples segue o mesmo comando e comportamento atual

## Fase 5 - Runner Java e Parametros de Execucao

Objetivo:

- Tornar runtime previsivel para subreport

Entregas:

- Ajustes em JasperRunner para aceitar parametros opcionais adicionais
- Contrato claro de passagem de parametros ao fillReport
- Suporte para parametros default de data e chave quando aplicavel

Criterios de aceite:

- Subreport recebe parametros corretamente em ambiente local
- Nao ha regressao em pdf-from-jasper e pdf-with-data do modo simples

## Fase 6 - Metadata, Observabilidade e Diagnostico

Objetivo:

- Melhorar rastreabilidade operacional de master/detail

Entregas:

- metadata.json com bloco reportTopology:
  - type: SIMPLE ou MASTER_DETAIL
  - masterFile
  - detailFiles[]
  - relationKeys
  - parameterBindings
- Log com resumo de linhas master/detail e alertas de vazio
- Mensagens de erro orientadas ao time de deploy

Criterios de aceite:

- Diagnostico de falhas sem abrir JRXML manualmente
- Operacao consegue identificar causa primaria em ate 5 minutos

## Fase 7 - Documentacao de Operacao e Prompting

Objetivo:

- Tornar o uso de master/detail seguro para o time de deploy

Entregas:

- Atualizar docs/QUICKSTART.md com trilha dupla:
  - trilha A: relatorio simples
  - trilha B: master/detail
- Novo guia dedicado:
  - docs/MASTER-DETAIL-QUICKSTART.md
- Troubleshooting especifico:
  - parametros nao mapeados
  - detail vazio
  - subreport path invalido
  - mismatch de tipo em chave
- Atualizar .github/copilot-instructions.md com regras de master/detail

Criterios de aceite:

- Usuario nao tecnico consegue executar fluxo completo com checklist
- Nenhum passo depende de conhecimento interno de Jasper

## Fase 8 - Testes de Regressao e Go-Live Controlado

Objetivo:

- Liberar com seguranca e prova de nao regressao

Entregas:

- Suite de testes:
  - smoke simples
  - smoke master/detail
  - cenarios negativos (falha esperada)
- Matriz de compatibilidade:
  - Windows, WSL, Linux
- Plano de rollout por ondas:
  - onda 1: homologacao interna
  - onda 2: piloto com 1 relatorio real
  - onda 3: liberacao geral

Criterios de aceite:

- Zero regressao em relatorios simples homologados
- Taxa de sucesso >= 95% no piloto master/detail

## 6. Mudancas por Artefato (Mapa de Impacto)

Arquivos a evoluir na implementacao futura:

- prompts/relatorio-simples.prompt.md (coexistencia de formatos)
- prompts/relatorio-master-detail.prompt.md (novo)
- docs/QUICKSTART.md (duas trilhas)
- docs/MASTER-DETAIL-QUICKSTART.md (novo)
- rules/views.json (schema de relacoes)
- scripts/validate.js (validacao semantica master/detail)
- scripts/compile.js (pipeline em dois estagios)
- scripts/jasper-runner/src/main/java/com/guide/jasper/JasperRunner.java (parametros de execucao)
- .github/copilot-instructions.md (regras globais de geracao master/detail)

Arquivos que devem permanecer sem alteracao de contrato externo:

- Comandos existentes de relatorio simples
- Formato basico de saida em output
- Politica de fail-safe atual

## 7. Prompt Recomendado para Master/Detail (Contrato)

Estrutura recomendada para solicitacao no Copilot:

- Nome do relatorio
- Formato: MASTER_DETAIL
- Cenário do negócio (contexto e motivação)
- View master + cenário master específico
- View detail + cenário detail específico
- Agrupado por (master)
- Agrupado por (detail)
- Chave de vinculacao (master.campo = detail.campo)
- Campos no cabecalho master
- Campos da grade detail
- Filtros e tipos (parametrizados para master e detail)
- Ordenacao do master e do detail
- Regras de totalizacao (se houver)
- Layout esperado (bandas e area do detail)
- Confirmacao de compatibilidade Jasper 6.2.0

Checklist de qualidade no prompt:

- Sem SELECT *
- Sem filtros hardcoded
- Sem copiar query/campo de modelo visual
- Cenário explica o por quê e pra quem
- Agrupado por declara forma de chegar aos registros master
- Agrupado por detail(s) declara estrutura esperada do detail
- Declarar parametros de subreport explicitamente
- Validar relacao em rules/views.json antes de gerar JRXML

## 8. Estrategia de Nao Regressao do Modo Simples

- Modo simples continua default
- Validacoes novas so disparam quando formato MASTER_DETAIL for declarado
- Scripts mantem assinatura atual; capacidades novas entram por flags opcionais
- Testes de regressao simples executados em toda entrega de fase

## 9. Cronograma Sugerido

- Semana 1: Fase 0 e Fase 1
- Semana 2: Fase 2 e Fase 3
- Semana 3: Fase 4 e Fase 5
- Semana 4: Fase 6, Fase 7 e Fase 8

## 10. Gate de Aprovacao por Fase

Cada fase so avanca com:

- Criterios de aceite atendidos
- Evidencia de teste anexada
- Checklist de regressao simples aprovado
- Plano de rollback validado

## 11. Definicao de Pronto (DoD) Final

A evolucao sera considerada concluida quando:

- Time de deploy conseguir pedir e gerar relatorio simples e master/detail
- Fluxo fail-safe impedir entrega com inconsistencia semantica
- PDF master/detail for gerado com dados reais, detail preenchido e logs claros
- Documentacao operacional cobrir ponta a ponta os dois formatos
- Suite de regressao comprovar que o modo simples nao quebrou
