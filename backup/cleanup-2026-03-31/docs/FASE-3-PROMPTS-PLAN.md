# 📋 FASE 3 - PROMPTS E UX OPERACIONAL - PLANO DE EXECUÇÃO

**Status**: ⏳ EM PLANEJAMENTO (Antes de Iniciar)  
**Estimativa**: ~2-3h implementação + validação  
**Dependência**: Concluída ✅ Fase 0, 1, 2

---

## 🎯 Objetivo

Integrar o novo modelo de JRXML (`/tmp`) no workflow operacional de deploy team, atualizando:

1. **`.github/copilot-instructions.md`** - Adicionar regras para modo JRXML-modelo
2. **`prompts/relatorio-simples.prompt.md`** - Adicionar campo "Modelo Visual (JRXML)"
3. **`docs/EXAMPLE-COM-MODELO.md`** - Novo arquivo com exemplo end-to-end
4. **`docs/JRXML-MODELO-ANTI-PATTERNS.md`** - O que NÃO fazer com modelo

---

## 📐 Tarefas Detalhadas

### Tarefa 1: Atualizar `copilot-instructions.md`

**Localização**: `.github/copilot-instructions.md`

**Mudanças Necessárias**:

#### 1.1 Adicionar Nova Seção após "## 🔗 Integração com Skills"

```markdown
## 📦 NOVO: Suporte a Modelos JRXML em /tmp

### ℹ️ O que é um Modelo JRXML?

Um arquivo `.jrxml` colocado em `/tmp` pode servir como **APENAS fonte visual** (fonts, cores, dimensões de banda, margens). 
O modelo **NUNCA** fornece dados (query, fields, parâmetros).

### 📝 Quando Usar Modelo JRXML?

✅ **USE quando**:
- Está criando 5+ relatórios com mesmo layout visual (reutilizar design)
- Precisa preservar estilos de navegação/headers entre relatórios
- Quer garantir consistência visual em suite de relatórios
- Seu modelo `.jrxml` vem de legado com layout consagrado

❌ **NÃO USE quando**:
- Quer copiar campos de dados do modelo
- Precisa reutilizar queries (use `rules/views.json` em lugar disso)
- Modelo tem lógica de agregação/grupos (trata no novo JRXML via view)

### 🔧 Workflow com Modelo

Se `/tmp/modelo-vendas.jrxml` existe:

1. **Extrair blueprint visual**:
   ```bash
   node scripts/extract-style-blueprint-from-jrxml.js /tmp/modelo-vendas.jrxml output/style.json
   ```

2. **Gerar novo JRXML com dados**:
   ```bash
   node scripts/generate-jrxml.js --view view_vendas --fields data,valor --output output/novo.jrxml
   ```

3. **Aplicar estilo do modelo**:
   ```bash
   node scripts/apply-style-blueprint-from-jrxml.js output/style.json output/novo.jrxml output/novo-styled.jrxml 0.75
   ```

4. **Compilar final**:
   ```bash
   node scripts/compile.js output/novo-styled.jrxml --pdf
   ```

### ⚠️ Regras de Ouro para Modelo JRXML

| Regra | Razão | Contraexemplo |
|-------|-------|---------------|
| ✅ Modelo tem 0 `<parameter>` | Impede contaminação de filtros | ❌ `<parameter name="dataInicio">` copiado para novo JRXML |
| ✅ Modelo tem 0 `<field>` | Apenas estilo, zero dados | ❌ field copiado causa erro se campo não existe em view |
| ✅ Modelo tem `<queryString>` dummy | Placeholder visual, nunca usado | ❌ Query real copiada → select errado em novo JRXML |
| ✅ Nenhuma variável/group no modelo | Agora, lógica vem do novo JRXML | ❌ Group copiada interfere com agregação |
| ✅ Modelo tem 0 `$F{}`, `$P{}`, `$V{}` expressões | Impede expressão inválida em novo report | ❌ `$F{campo_inexistente}` copiada quebra novo JRXML |

### 📊 Confiança de Estilo

Se blueprint extraído tem `confidence < 0.65` → fallback automático (novo JRXML não estilizado).
Para forçar aplicação mesmo com confiança baixa:
```bash
node scripts/apply-style-blueprint-from-jrxml.js output/style.json output/novo.jrxml output/novo-styled.jrxml 0.50
```

### 🎓 Exemplos

Veja `docs/EXAMPLE-COM-MODELO.md` para workflow completo com modelo.
Veja `docs/JRXML-MODELO-ANTI-PATTERNS.md` para o que evitar.
```

#### 1.2 Adicionar Seção de Anti-Padrões no Modelo

```markdown
## ⚠️ Anti-Padrões com Modelo JRXML (NOVO)

❌ **NÃO FAÇA** (com modelo):

| Padrão | Por Quê | Solução |
|--------|---------|---------|
| Copiar `<queryString>` real | Dados errados → select quebrado | Use `<queryString><![CDATA[SELECT 1]]></queryString>` no modelo |
| Reutilizar `<field>` do modelo | Campo pode não existir na view nova | Declare 0 fields no modelo |
| Compartilhar `<parameter>` model | Filtro copiado forma contrato falso | Sempre zerador parâmetros no novo JRXML |
| Incluir `<group>` ou aggregação | Lógica não porta entre views | Definir group no novo JRXML conforme sua semântica |
| Herdar expressão `$F{campo_x}` | Campo pode ter nome/tipo diferente | Validar cada expressão → ajustar se necessário |
| Modelo com 400+ linhas | Overhead visual de parse | Manter modelo < 200 linhas de estilo puro |
| Versionar `/tmp` no Git | Modelos mudam frequentemente | `.gitkeep` apenas, modelo é temp |
```

---

### Tarefa 2: Atualizar `prompts/relatorio-simples.prompt.md`

**Localização**: `prompts/relatorio-simples.prompt.md`

**Contexto**: Este é o template de input que deploy team segue.

**Mudanças Necessárias**:

#### 2.1 Adicionar novo campo no template

```markdown
# 📋 TEMPLATE: Gerar Relatório Simples com Jasper Report

## Preencha os campos abaixo:

### 📌 Informações Básicas

- **Nome do Relatório**: [ex: VENDAS_DIARIAS]
- **View de Dados**: [ex: view_vendas_diarias - validar em rules/views.json]
- **Descrição**: [ex: Sumariza vendas por dia, filtrável por data]

### 📊 Campos a Exibir

Selecione campos da view (separe por vírgula):
```
[ex: data, item_nome, quantidade, valor_total]
```

Validar em `rules/views.json` > `views[view_name].validFields`

### 🔍 Filtros (Opcional)

Se quer filtro na geração:
```
[ex: dataInicio (DATE), dataFim (DATE), vendedor_id (INTEGER)]
```

**Regra**: Cada filtro vira `<parameter>` no JRXML gerado.

### 🎨 NOVO: Modelo Visual em /tmp (Opcional)

Se tem arquivo modelo visual `.jrxml`:

- **Usar Modelo?**: Sim / Não
- **Caminho do Modelo**: [ex: /tmp/modelo-vendas.jrxml]

**⚠️ Importante**: Modelo é **APENAS visual** (fonts, cores, tamanho de banda).
Seus filtros e campos de dados virão de NOVO JRXML, never from modelo.

**Verificação Pré-Uso**:
```bash
node scripts/validate.js /tmp/modelo-vendas.jrxml --check-semantic-contamination
```

Se output disser "OK: No semantic data found", modelo é seguro usar.

### 📋 Encaminhamento para Deploy

Uma vez preenchido → envie para:

```
Copilot Agent:
  1. Valide campos em rules/views.json
  2. Gere JRXML (com ou sem modelo)
  3. Compile → .jasper + .pdf
  4. Entregue artefatos
```

---
```

#### 2.2 Adicionar Seção de Checklist

```markdown
## ✅ Checklist antes de Usar Modelo

- [ ] Modelo `.jrxml` existe em `/tmp`
- [ ] Modelo **não tem** query real (só placeholder)
- [ ] Modelo **não tem** `<parameter>` for filtros
- [ ] Modelo **não tem** `<field>` declarations
- [ ] Modelo **não tem** expressões `$F{}`, `$P{}`, `$V{}`
- [ ] View/campos solicitados existem em `rules/views.json`
- [ ] Confiança esperada>=65% (se <65%, copilot faz fallback)
```

---

### Tarefa 3: Criar `docs/EXAMPLE-COM-MODELO.md`

**Arquivo Novo**: `docs/EXAMPLE-COM-MODELO.md`

**Conteúdo**:

```markdown
# 📚 EXEMPLO COMPLETO: Relatório com Modelo JRXML

## Cenário

Time de BI quer criar 3 relatórios com **MESMO layout visual**:
1. `VENDAS_POR_DATA`
2. `VENDAS_POR_VENDEDOR`
3. `VENDAS_POR_CATEGORIA`

Solução: Usar 1 **modelo visual** em `/tmp` aplicado a 3 JRXMLs diferentes (cada com view/filtros próprios).

---

## 🔧 Pré-requisito: Criar Modelo ~

### Passo 1: Acessar /tmp

```bash
cd guide-jasper-report/tmp
ls -la
# Output: .gitkeep (modelo não versionado)
```

### Passo 2: Insira Modelo (ex: modelo-vendas.jrxml)

Copie arquivo do team de design:
```
/tmp/modelo-vendas.jrxml
```

Modelo contém:
- Página 595x842 (A4)
- Margens 40pt
- Header com logo (rectangle + image)
- Detail com 5 colunas
- Footer com "Página X de Y"

**IMPORTANTE**: Modelo tem `<queryString><![CDATA[SELECT 1]]></queryString>` DUMMY. Zero dados reais.

---

## 🚀 Workflow: Gerar 3 Relatórios com Modelo

### Relatório 1: VENDAS_POR_DATA

```bash
# 1️⃣ Extrair blueprint visual do modelo
node scripts/extract-style-blueprint-from-jrxml.js \
  /tmp/modelo-vendas.jrxml \
  output/blueprint-vendas.json

# Output:
# output/blueprint-vendas.json ← contém fonts, colors, band heights
# output/blueprint-vendas.json.log ← auditoria

# Visualmente inspecione:
cat output/blueprint-vendas.json | jq '.tokens.font'
# {
#   "fallbackFamily": "DejaVu Sans",
#   "sizesByRole": {
#     "title": 16,
#     "header": 11,
#     "detail": 10,
#     "footer": 8
#   }
# }
```

```bash
# 2️⃣ Gerar JRXML com sua view (view_vendas_diarias)
node scripts/generate-jrxml.js \
  --name VENDAS_POR_DATA \
  --view view_vendas_diarias \
  --fields data,item_nome,quantidade,valor_total \
  --filters dataInicio,dataFim \
  --output output/relatorio-vendas-data.jrxml

# Output:
# output/relatorio-vendas-data.jrxml ← JRXML novo SEM estilo de modelo
```

```bash
# 3️⃣ Aplicar estilo do modelo
node scripts/apply-style-blueprint-from-jrxml.js \
  output/blueprint-vendas.json \
  output/relatorio-vendas-data.jrxml \
  output/relatorio-vendas-data-styled.jrxml

# Output:
# output/relatorio-vendas-data-styled.jrxml ← Estilo aplicado! ✅
# output/relatorio-vendas-data-styled.jrxml-style.json ← Auditoria
```

```bash
# 4️⃣ Compilar
node scripts/compile.js output/relatorio-vendas-data-styled.jrxml --pdf

# Output:
# output/relatorio-vendas-data-styled.jasper ✅
# output/relatorio-vendas-data-styled.pdf ✅ (preview com dados)
```

### Relatório 2: VENDAS_POR_VENDEDOR

Repita com view `view_vendas_por_vendedor`:

```bash
# Reusar MESMO blueprint!!
node scripts/generate-jrxml.js \
  --name VENDAS_POR_VENDEDOR \
  --view view_vendas_por_vendedor \
  --fields vendedor_nome,quantidade,valor_total \
  --filters dataInicio,dataFim \
  --output output/relatorio-vendas-vendedor.jrxml

node scripts/apply-style-blueprint-from-jrxml.js \
  output/blueprint-vendas.json \
  output/relatorio-vendas-vendedor.jrxml \
  output/relatorio-vendas-vendedor-styled.jrxml

node scripts/compile.js output/relatorio-vendas-vendedor-styled.jrxml --pdf
```

### Relatório 3: VENDAS_POR_CATEGORIA

Idem:

```bash
node scripts/generate-jrxml.js \
  --name VENDAS_POR_CATEGORIA \
  --view view_vendas_por_categoria \
  --fields categoria_nome,quantidade,valor_total,margem_lucro \
  --filters dataInicio,dataFim \
  --output output/relatorio-vendas-categoria.jrxml

node scripts/apply-style-blueprint-from-jrxml.js \
  output/blueprint-vendas.json \
  output/relatorio-vendas-categoria.jrxml \
  output/relatorio-vendas-categoria-styled.jrxml

node scripts/compile.js output/relatorio-vendas-categoria-styled.jrxml --pdf
```

---

## ✅ Resultado

Todos 3 relatórios compartilham:
- ✅ Mesmo layout visual (header, footer, band heights)
- ✅ Mesmas fonts/colors
- ✅ ❌ ZERO código copiado (queries, fields, parâmetros diferentes)

3x JPEGs visualmente idênticos, dados totalmente diferentes.

---

## 🔍 Verificação: Auditoria

Cada relatório estilizado deixa rastro:

```bash
cat output/relatorio-vendas-data-styled.jrxml-style.json
{
  "fallbackApplied": false,
  "blueprintOrigin": "jrxml-template-path",
  "jrxmlModelSource": "/tmp/modelo-vendas.jrxml",
  "confidence": 0.93,
  "threshold": 0.65,
  "bandHeights": {
    "title": 60,
    "columnHeader": 24,
    "detail": 20,
    "pageFooter": 30
  },
  "generatedAt": "2026-03-30T15:45:00Z"
}
```

**Rastreabilidade**: Qualquer analista pode verificar:
- Confiança do aplicador (0.93 = excelente)
- Se fallback foi usado (não)
- Qual modelo foi fonte (modelo-vendas.jrxml em /tmp)
- Timestamp exato

---

## 🎓 Lições Aprendidas

1. **Reusar Blueprint**: Extrair `.json` uma vez, aplicar a N JRXMLs
2. **Isolamento de Dados**: View/query/fields cada JRXML mantém seus próprios
3. **Confiança Importa**: Blueprint com confiança baixa (< 0.65) ativa fallback automático
4. **Auditoria**: Sempre verificar `.jrxml-style.json` para rastrear estilo

---

## ⚠️ Problemas Comuns

### Erro: "View not found in rules/views.json"

Causa: Campo ou view não cadastrada  
Solução: Adicionar em `rules/views.json` antes de gerar JRXML

### Erro: "Fallback applied due to low confidence"

Causa: Modelo tem layout incompatível  
Solução: 
- Revisar modelo (pode ter bandas muito largas)
- Ou aceitar relatório sem estilo (fallback OK também)

### Output: PDF muito pequeno (~1KB, em branco)

Causa: View retorna 0 registros (filtro muito restritivo)  
Solução: Relaxar filtro (ex: data range maior) ou validar dados na view

---

## 📚 Próximas Leituras

- `docs/JRXML-MODELO-ANTI-PATTERNS.md` - O que NÃO fazer
- `docs/CONTRATO-MODELO-JRXML-TMP.md` - Contrato formal
- `.github/copilot-instructions.md` - Regras detalhadas
```

---

### Tarefa 4: Criar `docs/JRXML-MODELO-ANTI-PATTERNS.md`

**Arquivo Novo**: `docs/JRXML-MODELO-ANTI-PATTERNS.md`

**Conteúdo**:

```markdown
# ⚠️ Anti-Padrões: O que NÃO fazer com Modelo JRXML

---

## 1️⃣ ❌ NÃO: Copiar `<queryString>` Real para Modelo

### Problema

```xml
<!-- ❌ MODELO COM QUERY REAL -->
<queryString>
  <![CDATA[
    SELECT data, vendedor, total 
    FROM vendas 
    WHERE data >= '2026-01-01'
  ]]>
</queryString>
```

Quando extrator process este modelo:
1. Query é IGNORADA (não visually relevant)
2. Novo JRXML gerado terá query DIFERENTE (de sua view)
3. Risco: Deploy tentando executar query errada

### Solução

```xml
<!-- ✅ MODELO COM QUERY DUMMY -->
<queryString>
  <![CDATA[
    SELECT 1
  ]]>
</queryString>
```

Novo JRXML com query CORRETA fica **intacta** após aplicação de estilo.

---

## 2️⃣ ❌ NÃO: Declarar `<field>` no Modelo

### Problema

```xml
<!-- ❌ MODELO COM FIELDS -->
<field name="data" class="java.util.Date"/>
<field name="vendor_nome" class="java.lang.String"/>
<field name="vendor_id" class="java.lang.Integer"/>
```

Script extrator **ignora** fields (não visual), mas se você depois aplicar 
manualmente sem entender:
- Pode copiar para novo JRXML
- Novo JRXML pode não ter campo "vendor_nome" (chama-se "vendedor_nome")
- Runtime error: "Unknown field: vendor_nome"

### Solução

```xml
<!-- ✅ MODELO COM ZERO FIELDS -->
<!-- (Pense em modelo como "estrutura visual vazia") -->
```

Cada JRXML gerado declara seus próprios `<field>`.

---

## 3️⃣ ❌ NÃO: Incluir `<parameter>` no Modelo

### Problema

```xml
<!-- ❌ MODELO COM PARÂMETROS -->
<parameter name="dataInicio" class="java.util.Date">
  <defaultValueExpression><![CDATA[new Date()]]></defaultValueExpression>
</parameter>
<parameter name="dataFim" class="java.util.Date"/>
```

Novo JRXML pode ter **DIFERENTES** parâmetros filtros:
- Modelo: `dataInicio`, `dataFim`
- Novo: `dataInicio`, `dataFim`, `vendedorId` (extra)

**Contaminação**: Se você herdar parameters do modelo, novo JRXML fica com parâmetros que não usa.

### Solução

```xml
<!-- ✅ MODELO COM ZERO PARÂMETROS -->
<!-- Parâmetros sempre definidos no JRXML GERADO, nunca no modelo -->
```

---

## 4️⃣ ❌ NÃO: Usar Expressões `$F{}`, `$P{}`, `$V{}`

### Problema

```xml
<!-- ❌ MODELO COM EXPRESSÕES DINÂMICAS -->
<textField>
  <textFieldExpression>$F{valor_total}</textFieldExpression>
</textField>

<textField>
  <textFieldExpression>$P{dataInicio}</textFieldExpression>
</textField>

<staticText>
  <text>Total: $V{sumTotal}</text>
</staticText>
```

Extrator **valida e rejeita** isto, mas se foi passado, pode causar:
- JSON blueprint com expressão copiada
- Novo JRXML herda expressão `$F{valor_total}` errada
- PDF rendering fail ou valor errado

### Solução

```xml
<!-- ✅ MODELO COM TEXTO LITERAL (SEM EXPRESSÕES) -->
<textField>
  <textFieldExpression>"[Valor aqui]"</textFieldExpression>
</textField>

<textField>
  <textFieldExpression>"Período: [Data aqui]"</textFieldExpression>
</textField>

<staticText>
  <text>Total: [Será preenchido]</text>
</staticText>
```

Expressões dinâmicas **SEMPRE** vêm do novo JRXML.

---

## 5️⃣ ❌ NÃO: Copiar `<group>` ou `<sortField>`

### Problema

```xml
<!-- ❌ MODELO COM GROUP -->
<group name="GroupByVendedor">
  <groupExpression><![CDATA[$F{vendedor_nome}]]></groupExpression>
  <groupHeader>
    <band height="30">
      <!-- header de grupo -->
    </band>
  </groupHeader>
</group>

<sortField name="data" order="Descending"/>
```

Novo JRXML pode ter **DIFERENTES** grupos:
- Modelo: Group por Vendedor
- Novo JRXML: Group por Data + Category

**Risco**: Lógica de agrupamento não porta.

### Solução

```xml
<!-- ✅ MODELO: ZERO GRUPOS, ZERO SORT -->
<!-- Grupos/sort vêm SEMPRE do novo JRXML conforme sua semântica de dados -->
```

---

## 6️⃣ ❌ NÃO: Incluir Lógica de Agregação no Modelo

### Problema

```xml
<!-- ❌ MODELO COM AGREGAÇÃO -->
<variable name="sumTotal" class="java.math.BigDecimal" 
  resetType="Report" calculation="Sum">
  <variableExpression>$F{valor}</variableExpression>
</variable>

<summary height="40">
  <band>
    <textField>
      <textFieldExpression>$V{sumTotal}</textFieldExpression>
    </textField>
  </band>
</summary>
```

Novo JRXML pode agregar **DIFERENTE**:
- Modelo: SUM(valor_total) por Report
- Novo: SUM(valor_total) por Vendedor

### Solução

```xml
<!-- ✅ MODELO: ZERO VARIÁVEIS DE CÁLCULO -->
<!-- Variáveis sempre definidas no novo JRXML conforme lógica de dados -->
```

---

## 7️⃣ ❌ NÃO: Usar Atributos JR 6.17+ em Modelo

### Problema

```xml
<!-- ❌ MODELO COM ATRIBUTOS MODERNOS (JR 6.17+) -->
<jasperReport ... uuid="abc-def-ghi" kind="report">
  <detail>
    <band height="20" splitType="Prevent">
      <element type="text" name="f1" uuid="xyz"/>
```

Validador JR 6.2.0 **não reconhece** `uuid`, `kind`, `type`, `name`, `splitType`:
- Parse falha com erro ambíguo
- Ou silenciosamente ignora (corrupting output)

### Solução

```xml
<!-- ✅ MODELO: APENAS ATRIBUTO

S SUPORTADOS EM JR 6.2.0) -->
<jasperReport pageWidth="595" pageHeight="842">
  <detail>
    <band height="20">
      <staticText>
```

**Regra**: Se seu modelo vem de JR 6.17+, **validar com `scripts/validate.js`** antes de usar.

---

## 8️⃣ ❌ NÃO: Modelo com 400+ linhas

### Problema

```
Modelo grande = overhead visual parse
Tipos complexos: subreports, charts, crosstabs são processos à parte
Ninguém quer manter modelo gigante
```

### Solução

**Manter modelo < 200 linhas** puro estilo:
- Title band
- Column header com colors + fonts
- Detail band
- Page footer

Se precisa subreport/chart no estilo → use **Fase 5** (placeholder logic).

---

## 9️⃣ ❌ NÃO: Versionear modelo em Git

### Problema

```
/tmp realmente é /tmp (temporary)
Se versionear modelo JRXML em .git:
  - Git history fica pesado (binário-ish XML)
  - Modelos mudam frequentemente
  - Conflitos de merge desnecessários
```

### Solução

```bash
# ✅ USE .gitkeep apenas
cat /tmp/.gitkeep
# "This folder holds temporary JRXML models (not versioned)"
```

Modelo é inserido manualmente por time de design, **não versiona**.

---

## 🔟 ❌ NÃO: Aplicar Estilo com Confiança < 0.40

### Problema

```bash
# ❌ NÃO FAÇA:
node apply-style-blueprint-from-jrxml.js \
  blueprint.json novo.jrxml styled.jrxml 0.30
# Confiança 0.30 = modelo muito danificado/incompatível
```

Resultado: Blueprint feito com erros podem aplicar erros para novo JRXML.

### Solução

```bash
# ✅ MÍNIMO: 0.65 (default)
node apply-style-blueprint-from-jrxml.js \
  blueprint.json novo.jrxml styled.jrxml 0.65

# Se confiança < 0.65 → fallback automático (novo JRXML sem estilo)
```

---

## 🎯 Checklist: Desfaz Anti-Padrões

Antes de usar modelo `modelo.jrxml`:

- [ ] `grep -c "<queryString>" modelo.jrxml` → 1 (com valor dummy como `SELECT 1`)
- [ ] `grep -c "<field " modelo.jrxml` → 0
- [ ] `grep -c "<parameter " modelo.jrxml` → 0
- [ ] `grep -c "\$F{" modelo.jrxml` → 0
- [ ] `grep -c "\$P{" modelo.jrxml` → 0
- [ ] `grep -c "\$V{" modelo.jrxml` → 0
- [ ] `grep -c "<group " modelo.jrxml` → 0
- [ ] `grep -c "uuid=" modelo.jrxml` → 0
- [ ] `wc -l modelo.jrxml` → < 200
- [ ] Executar extrator: confidence >= 0.65

---

## 📚 Referências

- `docs/CONTRATO-MODELO-JRXML-TMP.md` - O que IS/ISN'T allowed
- `docs/EXAMPLE-COM-MODELO.md` - Uso correto
- `.github/copilot-instructions.md` - Regras detalhadas
```

---

## 📊 Resumo de Tarefas - Fase 3

| # | Tarefa | Arquivo | Tipo | Status |
|----|--------|---------|------|--------|
| 1 | Atualizar copilot-instructions.md com seção JRXML | `.github/copilot-instructions.md` | Atualizar | ⏳ |
| 2 | Adicionar campo "Modelo Visual (JRXML)" em prompt | `prompts/relatorio-simples.prompt.md` | Atualizar | ⏳ |
| 3 | Criar exemplo end-to-end com 3 relatórios | `docs/EXAMPLE-COM-MODELO.md` | Criar | ⏳ |
| 4 | Documentar anti-padrões e checklist | `docs/JRXML-MODELO-ANTI-PATTERNS.md` | Criar | ⏳ |

---

## ✅ Acceptance Criteria - Fase 3

Ao final da Fase 3:

- [ ] Deploy team consegue ler `.github/copilot-instructions.md` e entender modelo JRXML sem Copilot
- [ ] Prompt template (`relatorio-simples.prompt.md`) menciona modelo e como usar
- [ ] Existe exemplo completo (`EXAMPLE-COM-MODELO.md`) com 3 relatórios reais
- [ ] Anti-padrões documentados (`JRXML-MODELO-ANTI-PATTERNS.md`) com checklist
- [ ] Zero questões sobre "Posso copiar campo do modelo?" → resposta é documentada

---

## 🚀 Próximas Fases

Após Fase 3 ✅:
- **Fase 4**: Evolução de `validate.js` + `compile.js` para detecção de contaminação
- **Fase 5**: Placeholder logic para subreports/charts/crosstabs

---

**Estimativa**: 2-3h para edição de docs + criação de exemplos  
**Dependências**: Fase 2 ✅ completada  
**Prioridade**: ALTA (operacional para deploy team)

---

**Data**: 30 de Março de 2026  
**Status**: Ready para iniciar  
**Próximo Passo**: Começar por Tarefa 1
