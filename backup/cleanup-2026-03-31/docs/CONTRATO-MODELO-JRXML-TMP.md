# CONTRATO: Uso de JRXML-Modelo em /tmp para Estilo e Design

**Data**: 2026-03-31  
**Status**: Vigente (Fase 0 - Onda 1)  
**Escopo**: Define rigorosamente o que pode e o que não pode ser herdado de um JRXML-modelo

---

## 1. Definição Formal: JRXML-Modelo

Um **JRXML-Modelo** é um arquivo `.jrxml` colocado na pasta raiz `/tmp` do workspace, que será **lido exclusivamente para extrair informação visual e estrutural**, nunca para injetar:

- Dados operacionais (query SQL, campos de banco, parâmetros)
- Lógica de agregação, agrupamento ou cálculo
- Conteúdo textual estático ou dinâmico
- Dataset bindings ou relacionamentos de dados

### Razão

O workspace já possui um pipeline de geração de JRXML parametrizados a partir de pedidos textuais e validação contra `rules/views.json`. O modelo em `/tmp` não substitui esse pipeline; ele apenas **informa** como o JRXML final deve **parecer visualmente**.

---

## 2. Convenção de Nomenclatura e Resolução

### Nomenclatura no /tmp

```
/tmp/
├── .gitkeep                          # Formaliza estrutura no git
├── modelo-vendas-simples.jrxml       # Modelo de relatório de vendas
├── modelo-censo-ocupacional.jrxml    # Modelo de censo
└── meu-modelo-customizado.jrxml      # Nomeação livre, sem restricoes
```

**Regra**:
- Nomes descritivos, sufixo `.jrxml`
- Sem versionamento obrigatório em git
- Sem limite de quantidade de modelos

### Referência no Pedido

Ao solicitar geração com modelo, o operador usa o **caminho relativo**:

```md
Nome do Relatório: VENDAS_DIARIAS
View Selecionada: view_vendas_diarias
Campos Desejados: data, item_nome, valor_total
Modelo Visual JRXML: /tmp/modelo-vendas-simples.jrxml
```

Ou simplesmente o **nome do arquivo** (será resolvido em `/tmp`):

```md
Modelo Visual JRXML: modelo-vendas-simples.jrxml
```

---

## 3. Matriz de Herança: Permitido vs. Proibido

### ❌ PROIBIDO - Semantica de Dados (Nunca Herdado)

| Elemento | Razão | Ejemplos |
|----------|-------|----------|
| `<queryString>` | SQL é específica do novo relatório | `SELECT * FROM view_vendas WHERE ...` |
| `<field>` | Campos vêm do pedido + validação rules/views.json | `<field name="data" class="java.sql.Date">` |
| `<parameter>` | Parâmetros vêm do pedido de geração | `<parameter name="dataInicio" class="java.util.Date">` |
| `<variable>` | Variáveis acopladas a lógica de dados | `<variable name="totalVendas" calculation="Sum">` |
| `<group>` (lógica) | Agrupamentos são específicos de cada query | `<group name="vendedor"> ... COUNT(*) ...` |
| `<sortField>` | Ordenação é semântica de dados | `<sortField name="valor_total" order="Ascending">` |
| `<subDataset>` | Datasets secundários para subreports | `<subDataset name="detalhes"> <queryString>` |
| `<datasetRun>` | Binding de dados em subreports | `<datasetRun subDatasetName="detalhes">` |
| Expressões `$F{}` | Referências a fields (dinâmicas) | `<textFieldExpression>$F{valor_total}.toString()</textFieldExpression>` |
| Expressões `$P{}` | Referências a parâmetros | `<textFieldExpression>$P{dataInicio}</textFieldExpression>` |
| Expressões `$V{}` | Referências a variáveis | `<textFieldExpression>$V{totalVendas}</textFieldExpression>` |
| Texto dinâmico em staticText | Labels que refletem dados | `<text>Total de $P{ano}</text>` |
| Logica condicional acoplada | Visibilidade condicionada por `$F{}`, `$P{}` | `<reportElement ... printWhenExpression="$F{status}=='Ativo'">` |

---

### ✅ PERMITIDO - Estrutura Visual e Design (Sempre Herdado)

| Elemento | Descrição | Exemplos |
|----------|-----------|----------|
| Dimensões da página | Width, height em pontos | `pageWidth="595" pageHeight="842"` |
| Orientação | Portrait ou Landscape | `orientation="Portrait"` |
| Margens | Left, right, top, bottom em pontos | `leftMargin="40" rightMargin="40"` |
| Largura de coluna | Cálculo visual de espaço | `columnWidth="515"` |
| Alturas de bandas | Altura visual de title, header, detail, footer | Band `.height` |
| Tipografia | Família, tamanho, bold, italic, cor | `fontName="DejaVu Sans" size="10" isBold="true"` |
| Cores | Cores de texto, fundo, bordas, acentos | `forecolor="#222222" backcolor="#F7F7F7"` |
| Bordas e linhas | Largura, estilo (solid, dashed) | `lineWidth="0.5" style="Solid"` |
| Estrutura de bandas (visual) | Presença de title, columnHeader, detail, pageFooter, summary | Nomes de bandas |
| Posicionamento de elementos estáticos | Coordenadas X, Y de rectangles, lines, elementos decorativos | `x="10" y="50" width="100" height="20"` |
| Elementos decorativos | Rectangles, lines, ellipses para visual | `<rectangle>`, `<line>`, `<ellipse>` |
| Padding/espaçamento | Espaçamento interno em células | Margens internas |

---

### ⚠️ CASOS ESPECIAIS: Componentes Complexos como Placeholders Visuais

| Componente | Regra | Detalhe |
|------------|-------|--------|
| `<subreport>` | Permitido como **placeholder visual** | Posição, tamanho, altura. **NÃO** herdará dataset ou `subreportDatasetRun` |
| `<chart>` | Permitido como **placeholder visual** | Posição, tamanho, tipo de chart (visual). **NÃO** herdará `chartDataset` ou bindings |
| `<crosstab>` | Permitido como **placeholder visual** | Posição, tamanho, estrutura de colunas (visual). **NÃO** herdará `crosstabDataset` ou detalhes de cálculo |
| `<frame>` | Permitido como container visual | Posição, tamanho, bordas. Conteúdo pode ser descartado e regenerado |
| `<image>` | Permitido se logotipo/decorativo | Imagens estáticas (não expressões dinâmicas) |

**Tradução**: Se o modelo tem um `<subreport>` em (x=50, y=100, width=200, height=150), o novo relatório pode preservar **esse espaço de layout**. Mas o novo relatório definirá seu **próprio** `subreportDatasetRun`, query e campos.

---

## 4. Regra Inequívoca (Ouro)

> **"Um JRXML-Modelo em `/tmp` nunca participa da semântica de dados nem do conteúdo textual/operacional do novo relatório. Sua única função é informar decisões visuais (layout, cores, tipografia, posicionamento e estrutura genérica de bandas). Toda lógica de dados, query, fields, parâmetros, variáveis, grupos e expressões vinculadas vêm exclusivamente do pedido de geração e das regras em `rules/views.json`."**

---

## 5. Operação no Pedido de Geração

### Com Modelo

```markdown
Nome do Relatório: VENDAS_DIARIAS
View Selecionada: view_vendas_diarias
Campos Desejados: data, item_nome, valor_total, vendedor_nome
Filtros:
  - dataInicio (DATE)
  - dataFim (DATE)
Modelo Visual JRXML: /tmp/modelo-vendas-simples.jrxml
Instrução: Use apenas estilo e layout do modelo. Gere dados a partir de view_vendas_diarias.
```

### Sem Modelo (Fluxo Existente)

```markdown
Nome do Relatório: VENDAS_DIARIAS
View Selecionada: view_vendas_diarias
Campos Desejados: data, item_nome, valor_total, vendedor_nome
Filtros:
  - dataInicio (DATE)
  - dataFim (DATE)
[Nenhum modelo referenciado]
```

---

## 6. Decisão: Schema de Blueprint

**Escolha: Opção A - Evoluir `STYLE-BLUEPRINT.schema.json`**

O schema existente será estendido para suportar:

```json
{
  "source": {
    "inputMode": "jrxml-template-path | attachment | tmp-path",
    "pdfReference": "...",
    "jrxmlModelPath": "/tmp/modelo-vendas-simples.jrxml",  // NOVO
    "jrxmlModelSha256": "...",  // NOVO
    "sourcePdfSha256": "...",
    "mimeType": "application/pdf | text/xml"  // NOVO
  }
}
```

Isso permite:
- Rastreamento da origem (PDF legado, JRXML-modelo em `/tmp`, ou geração limpa)
- Auditoria de qual modelo foi usado
- Validação de integridade

---

## 7. Compatibilidade com JasperReports 6.2.0

**Regra Técnica**:

Qualquer JRXML-modelo deve ser **compilável com JasperReports 6.2.0** para ser aceito. Isso significa:

- ❌ Não usar atributos/elementos da versão 6.17+ (ex: `uuid`, `kind`, `splitType`)
- ✅ Usar apenas atributos conhecidos em 6.2.0
- ✅ Se tiver componentes 6.17+, serão stripados durante extracao

Validação será feita durante **Fase 1** (Extrator de Estilo).

---

## 8. Documentação para o Time de Deploy

### O que Fazer

✅ Coloque um `.jrxml` modelo em `/tmp/` se quiser que o novo relatório tenha um **visual similar**.

✅ Referencie o modelo no pedido de geração.

✅ O agente Copilot usará o modelo apenas para **estilo, cores, margens, tipografia, posicionamento**.

### O que NÃO Fazer

❌ Não coloque os **campos exatos** que deseja no modelo esperando que sejam herdados.

❌ Não use um modelo com **query diferente** da view que você vai solicitar.

❌ Não coloque textos **dinâmicos** no modelo em staticText e espere que apareçam no novo relatório.

❌ Não use modelo com **subreports/charts/crosstabs** complexos esperando que a lógica seja copiada; apenas o layout será preservado.

---

## 9. Critérios de Aceitação (Fase 0 Completa)

- ✅ Pasta `/tmp` criada com `.gitkeep` no repositório
- ✅ Contrato formal documentado e inequívoco
- ✅ Matriz de herança permitida/proibida clara e testável
- ✅ Regra de ouro documentada
- ✅ Convenção de nomenclatura definida
- ✅ Schema de blueprint decidido (Opção A: evolução existente)
- ✅ Compatibilidade JasperReports 6.2.0 definida
- ✅ O time consegue distinguir: "estilo e design" vs. "dados e semântica"

---

## 10. Próximas Fases

### Fase 1: Extrator de Estilo JRXML
Implementação do script que lê `/tmp/modelo.jrxml` e extrai um artefato de estilo sanitizado.

### Fase 2: Aplicação do Blueprint
Evolução do `apply-style-blueprint-phase*.js` para aceitar origem `jrxml-template-path`.

### Fase 3: Prompts e UX
Atualização de `.github/copilot-instructions.md` e `prompts/relatorio-simples.prompt.md`.

### Fase 4: Validação e Auditoria
Checklist de sanitizacao no `validate.js`.

### Fase 5: Subreports, Charts, Crosstabs
Tratamento seguro como placeholders visuais.

---

**FIM DO CONTRATO - Assinado em 31 de Março de 2026**
