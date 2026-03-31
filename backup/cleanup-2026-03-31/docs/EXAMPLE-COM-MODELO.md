# Exemplo com Modelo JRXML (incluindo componentes complexos)

Este guia mostra um fluxo completo usando modelo visual em /tmp com subreports, charts e crosstabs tratados como placeholders visuais.

## Cenário

- Modelo visual: /tmp/modelo-operacional-complexo.jrxml
- Relatório alvo: output/indicadores-operacionais/indicadores-operacionais.jrxml
- Regras: estilo herdado do modelo, dados herdados apenas do pedido + rules/views.json

## Passo 1: Extrair blueprint visual do modelo

```bash
node scripts/extract-style-blueprint-from-jrxml.js /tmp/modelo-operacional-complexo.jrxml output/indicadores-operacionais/style.json
```

Saídas esperadas no console:
- OK Subreports detected: N
- OK Charts detected: N
- OK Crosstabs detected: N
- OK Complex components mapped as VISUAL PLACEHOLDERS (order preserved)

## Passo 2: Gerar JRXML novo com dados independentes

```bash
node scripts/generate-jrxml.js --view view_vendas_diarias --fields data,item_nome,valor_total --output output/indicadores-operacionais/indicadores-operacionais.jrxml
```

## Passo 3: Aplicar estilo do blueprint

```bash
node scripts/apply-style-blueprint-from-jrxml.js output/indicadores-operacionais/style.json output/indicadores-operacionais/indicadores-operacionais.jrxml output/indicadores-operacionais/indicadores-operacionais.styled.jrxml
```

Saídas esperadas no console:
- OK Complex placeholders (expected): subreports=..., charts=..., crosstabs=...
- OK Complex components (target): subreports=..., charts=..., crosstabs=...
- OK Complex components treated as visual placeholders only (no dataset inheritance)

## Passo 4: Validar contaminação semântica

```bash
node scripts/validate.js output/indicadores-operacionais/indicadores-operacionais.styled.jrxml --check-model-contamination /tmp/modelo-operacional-complexo.jrxml
```

Comportamento esperado:
- Exit code 0 quando não há herança semântica.
- Exit code 1 se houver herança de query/fields/parameters/variables/groups/subDatasets/datasetRun/chartDataset/crosstabDataset.

## Passo 5: Compilar com rastreabilidade

```bash
node scripts/compile.js output/indicadores-operacionais/indicadores-operacionais.styled.jrxml --pdf --style-blueprint output/indicadores-operacionais/style.json
```

Saídas esperadas:
- output/indicadores-operacionais/indicadores-operacionais.styled.jasper
- output/indicadores-operacionais/indicadores-operacionais.styled.pdf
- output/indicadores-operacionais/metadata.json
- output/indicadores-operacionais/indicadores-operacionais.styled.jrxml-style.json

## O que validar nos metadados

No arquivo .jrxml-style.json:
- complexComponents.expectedLayoutPlaceholders
- complexComponents.foundInTargetBeforeApply
- complexComponents.treatedAsVisualOnly = true
- complexComponents.datasetInheritanceApplied = false

No metadata.json da compilação:
- styleSource.type
- styleSource.path
- styleSource.confidence
- validation.contaminationCheck

## Regras de ouro

- Modelo complexo serve para layout visual, não para lógica de dados.
- subreport/chart/crosstab do modelo nunca autoriza copiar subDataset/datasetRun/chartDataset/crosstabDataset.
- Se validate.js retornar contaminação, corrigir antes de compilar.
