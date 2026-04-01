# QUICKSTART

Guia operacional com trilha dupla:

- Trilha A: Relatorio simples
- Trilha B: Relatorio master/detail

## 1. Pre-requisitos

```bash
node --version
npm --version
```

Requisitos:

- Node.js 16+
- scripts/validate.js e scripts/compile.js disponiveis

## 2. Instalar Dependencias

```bash
cd scripts
npm install
cd ..
```

## 3. Escolher Trilha

### Trilha A (SIMPLE)

Use prompts/relatorio-simples.prompt.md quando quiser um relatorio com query unica e sem subreport.

Fluxo:

1. Preencher prompt simples
2. Gerar JRXML
3. Validar
4. Compilar

Comandos:

```bash
node scripts/validate.js output/<nome>/relatorio.jrxml
node scripts/compile.js output/<nome>/relatorio.jrxml --pdf
```

Artefatos esperados:

- relatorio.jrxml
- relatorio.jasper
- relatorio.pdf
- relatorio.log
- metadata.json

### Trilha B (MASTER_DETAIL)

Use prompts/relatorio-master-detail.prompt.md quando houver relacao pai-filho.

Fluxo:

1. Preencher prompt master/detail
2. Gerar master.jrxml e detail.jrxml
3. Validar ambos
4. Compilar pipeline em 2 estagios

Comandos:

```bash
node scripts/validate.js output/<nome>/master.jrxml
node scripts/validate.js output/<nome>/detail.jrxml

node scripts/compile.js \
  output/<nome>/master.jrxml \
  --detail output/<nome>/detail.jrxml \
  --relationship <chave_relacao_rules> \
  --pdf
```

Artefatos esperados:

- master.jrxml
- detail.jrxml
- master.jasper
- detail.jasper
- master.pdf
- master.log
- metadata.json

Guia completo da trilha B: docs/MASTER-DETAIL-QUICKSTART.md

## 3.1 Exemplo completo de preenchimento dos prompts

Use os exemplos abaixo como referencia de preenchimento integral.

### Exemplo A - Prompt de relatorio simples (completo)

Resumo das opcoes do prompt `prompts/relatorio-simples.prompt.md`:

- Nome do Relatorio: obrigatorio. Identificador tecnico unico para pasta/arquivo de saida.
- Descricao: obrigatorio. Objetivo funcional do relatorio.
- Cenario (Contexto + Por Que): obrigatorio. Quem usa, para qual decisao e em qual frequencia.
- View Selecionada: obrigatorio. Nome da view valida em `rules/views.json`.
- Agrupado Por (campo(s) dimensao): obrigatorio. Campo(s) que define(m) granularidade principal.
- Justificativa (agrupamento): obrigatorio. Motivo do agrupamento escolhido.
- Campos Desejados: obrigatorio. Lista explicita de campos validos da view.
- Filtros: opcional. Parametros com nome, tipo, obrigatorio sim/nao, default e label.
- Orientacao/Layout/Estilo: obrigatorio. Direcao, estrutura visual e rodape esperado.
- Usar Modelo Visual JRXML?: opcional. `Sim` ou `Nao`.
- Caminho do Modelo: opcional (obrigatorio se "Usar Modelo" = Sim). Caminho em `/tmp`.
- Descricao do Modelo: opcional (recomendado se usar modelo). O que deve ser reaproveitado do visual.
- Arquivo Modelo Legado: opcional (deprecated). Referencia historica em `examples/`.

Preenchimento completo (exemplo):

```text
Nome do Relatorio: VENDAS_DIARIAS_POR_VENDEDOR
Descricao: Relatorio operacional diario com vendas por item e vendedor.

Cenario (Contexto + Por Que):
Acompanhamento diario de vendas para gerente comercial validar performance por vendedor e categoria.
Uso: fechamento diario e analise de queda de faturamento.
Publico: gerencia comercial e coordenadores.

View Selecionada: view_vendas_diarias

Agrupado Por (campo(s) dimensao):
data, vendedor_nome

Justificativa (por que este agrupamento?):
Permite ler o resultado por dia e dentro do dia por vendedor, facilitando comparacao operacional.

Campos Desejados (separe por virgula):
data, vendedor_id, vendedor_nome, item_codigo, item_nome, categoria, quantidade, valor_unitario, valor_total

Filtro 1:
  Nome: dataInicio
  Tipo: DATE
  Obrigatorio: Nao
  Default: null
  Label: "Data Inicial"

Filtro 2:
  Nome: dataFim
  Tipo: DATE
  Obrigatorio: Nao
  Default: null
  Label: "Data Final"

Filtro 3:
  Nome: vendedorNome
  Tipo: STRING
  Obrigatorio: Nao
  Default: null
  Label: "Vendedor"

Orientacao: Landscape
Estilo: Tabela com cabecalho forte e linhas alternadas no detail.
Cabecalho: Titulo + periodo aplicado + total de registros.
Rodape: Pagina X de Y + data/hora de emissao.

Usar Modelo Visual JRXML? Nao

Arquivo Modelo: (em branco)
Descricao: (em branco)
```

### Exemplo B - Prompt de relatorio master/detail (completo)

Resumo das opcoes do prompt `prompts/relatorio-master-detail.prompt.md`:

- Nome do Relatorio: obrigatorio. Nome tecnico do pacote master/detail.
- Descricao: obrigatorio. Objetivo do relatorio com visao pai-filho.
- Cenario Master/Detail: obrigatorio. Contexto de negocio para master e detail.
- View Master (Principal): obrigatorio. View pai valida em `rules/views.json`.
- Agrupado Por MASTER: obrigatorio. Chave(s) de identidade do registro pai.
- Justificativa MASTER: obrigatorio. Por que a chave representa o pai.
- Campos Master: obrigatorio. Campos exibidos na linha principal.
- View Detail (Filha): obrigatorio. View filha valida em `rules/views.json`.
- Agrupado Por DETAIL: obrigatorio. Granularidade do registro filho.
- Justificativa DETAIL: obrigatorio. Motivo da granularidade escolhida.
- Campos Detail: obrigatorio. Campos exibidos no subreport.
- Chave Master/Chave Detail/Jointura/Cardinalidade: obrigatorio. Contrato da relacao 1:N.
- Filtros Master: opcional. Parametros aplicados no dataset pai.
- Filtros Detail: opcional. Parametros aplicados no dataset filho.
- Layout e Estilo: obrigatorio. Como master e detail aparecem no PDF.

Preenchimento completo (exemplo):

```text
Nome do Relatorio: VENDEDOR_VENDAS_MASTER_DETAIL
Descricao: Painel de vendedores com detalhe de vendas por item no periodo.

Cenario Master/Detail:
MASTER (Principal): vendedor e indicadores consolidados.
DETAIL (Aninhado): vendas individuais do vendedor por data e item.
USO: acompanhamento semanal de desempenho por carteira.
PUBLICO: gerente comercial e lideres regionais.

View Master (Principal): view_vendas_diarias

Agrupado Por MASTER (chave identidade):
vendedor_id, vendedor_nome

Justificativa:
Cada linha master deve representar um vendedor unico, identificado por vendedor_id.

Campos Master (separe por virgula):
vendedor_id, vendedor_nome, categoria, SUM(valor_total) as faturamento, SUM(quantidade) as itens_vendidos

View Detail (Filha): view_vendas_diarias

Agrupado Por DETAIL (linhas dentro do detail):
data, item_codigo

Justificativa:
Cada linha detail representa uma venda por item em uma data especifica do vendedor selecionado.

Campos Detail (separe por virgula):
data, item_codigo, item_nome, quantidade, valor_unitario, valor_total

Chave Master: vendedor_id
Chave Detail: vendedor_id

SQL de Jointura (confirme a relacao):
Master.vendedor_id = Detail.vendedor_id

Cardinalidade Esperada:
1 vendedor : N vendas (1:N)

Filtro Master 1:
  Nome: dataInicio
  Tipo: DATE
  Obrigatorio: Nao
  Label: "Data Inicial"

Filtro Master 2:
  Nome: dataFim
  Tipo: DATE
  Obrigatorio: Nao
  Label: "Data Final"

Filtro Detail 1:
  Nome: valorMinimoVenda
  Tipo: DECIMAL
  Obrigatorio: Nao
  Default: null
  Label: "Valor Minimo"

Orientacao: Landscape
Tabela Master: vendedor + totais consolidados.
Tabela Detail: lista de vendas (data, item, qtd, valor).
Espacamento: detail imediatamente abaixo do master.
Bordas: simples.
Cores: alternadas no master, neutras no detail.
```

## 4. Validacao Pos-Execucao

Checklist:

- Logs sem ERROR
- PDF gerado e com tamanho plausivel (>1KB em geral)
- metadata.json com reportTopology
- No MASTER_DETAIL: detail preenchido no PDF

## 5. Troubleshooting Rapido

### SIMPLE

- Erro de view/campo: revisar rules/views.json
- Erro de tipo: alinhar field class com rules/views.json
- PDF pequeno/vazio: revisar filtros e retorno da view

### MASTER_DETAIL

- Parametro nao mapeado: verificar subreportParameter no master e parameter no detail
- Detail vazio: validar relation key e filtros
- Subreport path invalido: garantir uso de --detail e existencia de detail.jasper
- Mismatch de tipo em chave: alinhar tipos entre master/detail

Guia detalhado de troubleshooting: docs/MASTER-DETAIL-QUICKSTART.md

## 6. Comandos de Referencia

SIMPLE:

```bash
node scripts/compile.js output/SMOKE_TEST_SIMPLES_001/smoke_test.jrxml
```

MASTER_DETAIL:

```bash
node scripts/compile.js output/SMOKE_TEST_MD_001/master.jrxml --detail output/SMOKE_TEST_MD_001/detail.jrxml --relationship accessops_medicalEvents
```

## 7. Proximos Passos

1. Escolher trilha por caso de uso
2. Executar com fail-safe (validate -> compile -> conferir artifacts)
3. Para master/detail, seguir o guia dedicado em docs/MASTER-DETAIL-QUICKSTART.md

## 8. Regressao e Go-Live (Fase 8)

Antes de release operacional, execute a suite oficial:

```bash
node scripts/test-phase8-regression.js
```

Quando houver conectividade de banco no ambiente:

```bash
node scripts/test-phase8-regression.js --with-pdf
```

Guia completo de rollout e matriz de compatibilidade:

- docs/FASE8-REGRESSAO-GO-LIVE.md
