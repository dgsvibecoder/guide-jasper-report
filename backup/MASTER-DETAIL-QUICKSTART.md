# MASTER/DETAIL QUICKSTART

Guia operacional para time de deploy gerar relatorios em formato MASTER_DETAIL com JasperReports 6.2.0.

## 1. Pre-requisitos

- Node.js 16+
- scripts/validate.js e scripts/compile.js disponiveis
- rules/views.json atualizado com relacionamento valido

Comandos rapidos:

```bash
node --version
npm --version
```

## 2. Instalar Dependencias

```bash
cd scripts
npm install
cd ..
```

## 3. Preencher Prompt Master/Detail

Use o template em prompts/relatorio-master-detail.prompt.md e preencha:

- Nome do relatorio
- Formato: MASTER_DETAIL
- View master e view detail
- Chave de vinculacao master.campo = detail.campo
- Campos master e detail
- Filtros parametrizados
- Layout esperado

## 3.1 Exemplos completos de preenchimento dos prompts

Para reduzir erro operacional, use os preenchimentos de referencia abaixo.

### Exemplo A - Prompt de relatorio simples (completo)

Resumo das opcoes do prompt `prompts/relatorio-simples.prompt.md`:

- Nome do Relatorio: obrigatorio. Identificador tecnico unico.
- Descricao: obrigatorio. Objetivo funcional do relatorio.
- Cenario (Contexto + Por Que): obrigatorio. Publico, uso e decisao suportada.
- View Selecionada: obrigatorio. View existente em `rules/views.json`.
- Agrupado Por: obrigatorio. Campo(s) de granularidade principal.
- Justificativa do Agrupamento: obrigatorio. Motivo da escolha da dimensao.
- Campos Desejados: obrigatorio. Lista explicita de campos validos.
- Filtros: opcional. Nome/tipo/obrigatorio/default/label.
- Layout e Estilo: obrigatorio. Orientacao, cabecalho, detail e rodape.
- Usar Modelo Visual JRXML?: opcional. Sim/nao.
- Caminho e Descricao do Modelo: opcional (obrigatorio se usar modelo).
- Arquivo Modelo Legado: opcional (deprecated).

Preenchimento completo (exemplo):

```text
Nome do Relatorio: RECEITA_MENSAL_CATEGORIA
Descricao: Relatorio de receita mensal por categoria para fechamento financeiro.

Cenario (Contexto + Por Que):
Controller financeiro acompanha variacao de receita por categoria e periodo.
Uso: reuniao mensal de resultado e planejamento.
Publico: financeiro e diretoria.

View Selecionada: view_receita_por_mes

Agrupado Por (campo(s) dimensao):
mes, categoria

Justificativa (por que este agrupamento?):
Permite comparacao mes a mes por categoria com leitura direta da evolucao.

Campos Desejados (separe por virgula):
mes, categoria, receita, lucro

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
  Nome: categoria
  Tipo: STRING
  Obrigatorio: Nao
  Default: null
  Label: "Categoria"

Orientacao: Portrait
Estilo: Tabela simples com linhas alternadas e destaque em totais.
Cabecalho: titulo + periodo + filtros aplicados.
Rodape: pagina X/Y + data/hora.

Usar Modelo Visual JRXML? Nao
Arquivo Modelo: (em branco)
Descricao: (em branco)
```

### Exemplo B - Prompt de relatorio master/detail (completo)

Resumo das opcoes do prompt `prompts/relatorio-master-detail.prompt.md`:

- Nome do Relatorio: obrigatorio. Nome tecnico do conjunto master/detail.
- Descricao: obrigatorio. Objetivo com visao pai-filho.
- Cenario Master/Detail: obrigatorio. Contexto de negocio de ambas as partes.
- View Master: obrigatorio. Dataset pai.
- Agrupado Por MASTER + Justificativa: obrigatorio. Identidade da linha pai.
- Campos Master: obrigatorio. Campos de apresentacao e consolidacao.
- View Detail: obrigatorio. Dataset filho.
- Agrupado Por DETAIL + Justificativa: obrigatorio. Granularidade filha.
- Campos Detail: obrigatorio. Colunas transacionais do subreport.
- Chave Master/Detail + Jointura + Cardinalidade: obrigatorio. Contrato 1:N.
- Filtros Master: opcional. Parametros para dataset pai.
- Filtros Detail: opcional. Parametros para dataset filho.
- Layout e Estilo: obrigatorio. Estrutura visual final no PDF.

Preenchimento completo (exemplo):

```text
Nome do Relatorio: VENDEDOR_VENDAS_MASTER_DETAIL
Descricao: Relatorio de vendedores com historico detalhado de vendas por item.

Cenario Master/Detail:
MASTER (Principal): vendedor com indicadores consolidados.
DETAIL (Aninhado): vendas do vendedor por data e item.
USO: analise de desempenho semanal por carteira.
PUBLICO: gerencia comercial e lideres regionais.

View Master (Principal): view_vendas_diarias

Agrupado Por MASTER (chave identidade):
vendedor_id, vendedor_nome

Justificativa:
Cada linha master representa um vendedor unico por vendedor_id.

Campos Master (separe por virgula):
vendedor_id, vendedor_nome, categoria, SUM(valor_total) as faturamento, SUM(quantidade) as itens_vendidos

View Detail (Filha): view_vendas_diarias

Agrupado Por DETAIL (linhas dentro do detail):
data, item_codigo

Justificativa:
Cada linha detail representa uma venda por item em data especifica do vendedor selecionado.

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
Tabela Master: vendedor e totais consolidados.
Tabela Detail: vendas associadas em grade filha.
Espacamento: detalhe abaixo do registro master.
Bordas: simples.
Cores: alternadas no master e neutras no detail.
```

## 4. Gerar JRXMLs

Resultado esperado em output/<nome>/:

- master.jrxml
- detail.jrxml

Antes de compilar, valide os dois:

```bash
node scripts/validate.js output/<nome>/master.jrxml
node scripts/validate.js output/<nome>/detail.jrxml
```

## 5. Compilar em 2 Estagios

A compilacao oficial de MASTER_DETAIL deve ser feita com --detail.

```bash
node scripts/compile.js \
  output/<nome>/master.jrxml \
  --detail output/<nome>/detail.jrxml \
  --relationship <relacao_em_rules_views_json> \
  --pdf
```

O pipeline executa:

1. Validacao master
2. Validacao detail
3. Validacao semantica da relacao (se --relationship for informado)
4. Compilacao detail.jasper
5. Compilacao master.jasper
6. PDF master com subreport detail

## 6. Artefatos Esperados

Na pasta output/<nome>/:

- master.jrxml
- detail.jrxml
- master.jasper
- detail.jasper
- master.pdf (quando usar --pdf)
- master.log
- metadata.json

## 7. Validacao Pos-Execucao

Checklist operacional:

- metadata.json contem reportTopology.type = MASTER_DETAIL
- metadata.json contem relationKeys e parameterBindings
- master.log contem stages 1/5 a 5/5
- PDF nao esta vazio (ideal > 1KB)
- detail aparece preenchido no PDF

## 8. Troubleshooting Master/Detail

### Parametros nao mapeados

Sintoma:

- Detail nao recebe filtro esperado

Acao:

- Verifique no master.jrxml se existe subreportParameter com nome correto
- Verifique no detail.jrxml se o parameter correspondente esta declarado
- Verifique em metadata.json reportTopology.parameterBindings

### Detail vazio

Sintoma:

- Master imprime, detail sem linhas

Acao:

- Verifique se chave master/detail existe nas duas views
- Valide a relacao com --relationship
- Revise filtros de data e tipos de field

### Subreport path invalido

Sintoma:

- Falha de carga de subreport

Acao:

- Use o comando oficial com --detail para gerar e injetar detail.jasper
- Confirme que detail.jasper existe na pasta de output
- Confira permissao de leitura do arquivo

### Mismatch de tipo em chave

Sintoma:

- Erros de comparacao no SQL ou detail sem correspondencia

Acao:

- Alinhe tipos da chave nas views e no JRXML
- Corrija class dos fields/parameters
- Rode validate.js novamente

## 9. Comando de Reproducao Rapida

```bash
node scripts/compile.js output/SMOKE_TEST_MD_001/master.jrxml --detail output/SMOKE_TEST_MD_001/detail.jrxml --relationship accessops_medicalEvents
```

## 10. Definicao de Pronto

MASTER_DETAIL esta pronto para deploy quando:

- Compila sem erro
- PDF com dados reais
- Detail preenchido
- metadata.json e master.log gerados com diagnostico

## 11. Gate de Regressao (Fase 8)

Antes de go-live, execute a suite de regressao:

```bash
node scripts/test-phase8-regression.js
```

Para validacao com PDF e dados reais:

```bash
node scripts/test-phase8-regression.js --with-pdf
```

Referencia operacional completa:

- docs/FASE8-REGRESSAO-GO-LIVE.md
