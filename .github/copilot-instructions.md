# 🤖 GitHub Copilot Instructions: JasperReports Report Generator

## Contexto Executivo

Este workspace permite que o **time de deploy** (sem conhecimento técnico em JasperReports/SQL)
gere automaticamente relatórios customizados em formato `.jrxml` e `.jasper` compilados.

**Objetivo**: Transformar um input simples (nome, campos, view, filtros) em relatórios
prontos para deployment em ambiente de produção.

---

## 🎯 Regras Globais - Modo OBRIGATÓRIO

### 0️⃣ MODO FAIL-SAFE (OBRIGATÓRIO PARA TIME DE DEPLOY)

Toda geração deve seguir esta ordem, sem pular etapas:

1. Validar view/campos em `rules/views.json`
2. Gerar JRXML compatível com JasperReports 6.2.0
3. Executar `node scripts/validate.js` (XML + SQL)
   3.5. **[NOVO - Se usou modelo]** Validar Contaminação Semântica:
   ```bash
   node scripts/validate.js output/{relatorio}.jrxml --check-model-contamination /tmp/{modelo}.jrxml
   ```

   - **Saída esperada**: Exit code 0 (sem contaminação)
   - **Se EXIT CODE 1**: Contaminação detectada. Revisar mensagens e corrigir JRXML
   - **Contaminações detectadas**:
     - 🔴 **CRITICAL**: Query ou Expressão idêntica ao modelo (indica herança de dados)
     - 🟠 **HIGH**: Campos ou Parâmetros herdados do modelo (indica risco)
   - **Ação se falhar**: Regenerar JRXML SEM usar modelo, ou corrigir manualmente
4. **[ATUALIZADO]** Executar `node scripts/compile.js ... --pdf` com Rastreabilidade:

   ```bash
   # SIMPLE
   node scripts/compile.js output/{relatorio}.jrxml --pdf \
     [--style-blueprint output/{style-blueprint}.json]

   # MASTER_DETAIL (1 nível)
   node scripts/compile.js output/{pasta}/master.jrxml \
     --detail output/{pasta}/detail.jrxml \
     --relationship {relKey} --pdf

   # MASTER_DETAIL_2L (2 níveis)
   node scripts/compile.js output/{pasta}/master.jrxml \
     --detail output/{pasta}/detail1.jrxml \
     --detail2 output/{pasta}/detail2.jrxml \
     --relationship {relKey} --pdf
   ```

   - Saída esperada: `.jasper` + `.pdf` + `.log` + `metadata.json`
   - **Novo em metadata.json**: Campo `styleSource` com rastreabilidade:
     - `type`: "jrxml-template" | "pdf-blueprint" | "nativa" (origem do estilo)
     - `path`: Caminho do modelo usado (ex: `/tmp/modelo-vendas.jrxml`)
     - `confidence`: 0.0-1.0 (confiança da extração de estilo)
     - `fallbackApplied`: boolean (se fallback foi acionado)
     - `appliedAt`: ISO timestamp (quando estilo foi aplicado)
   - **Console output agora mostra**: `Style confidence: 93.0% (threshold: 65%)`

5. Verificar artefatos e tamanho do PDF

Se qualquer etapa falhar, NÃO seguir adiante. Corrigir primeiro e repetir.

### ⚠️ BLOQUEIOS GLOBAIS (OBRIGATÓRIO)

**Estes arquivos JAMAIS podem ser alterados pelo usuário. PARAR e solicitar autorização se alguém tentar:**

❌ **PROIBIDO EDITAR:**

- `scripts/` (validação, compilação, geração)
- `setup/` (configuração de ambiente)
- `package.json`, `pom.xml` (dependências)
- `.github/copilot-instructions.md` (este arquivo)
- `JasperRunner.java`, `compile.js`, `validate.js` (scripts core)
- **`rules/views.json`** (SEM autorização explícita)

**Ação se usuário pedir:** Rejeitar com mensagem:

```
❌ Não posso alterar {arquivo}. Essa mudança requer autorização explícita.
Escopo permitido: APENAS output/<nome>/*.jrxml
```

### 1️⃣ GERAÇÃO JRXML: Sempre Parametrizado

**REGRA**: Toda query SQL DEVE usar parâmetros `$P{xxx}` para filtros, NUNCA valores hardcoded.

```xml
<!-- ❌ ERRADO -->
<queryString>
  <![CDATA[
    SELECT data, item_nome FROM view_vendas
    WHERE data >= '2026-01-01'
  ]]>
</queryString>

<!-- ✅ CORRETO -->
<queryString>
  <![CDATA[
    SELECT data, item_nome FROM view_vendas
    WHERE 1=1
      AND data >= $P{dataInicio}
      AND data <= $P{dataFim}
  ]]>
</queryString>
```

### 2️⃣ VALIDAÇÃO DE VIEWS: Sempre Conferir

Antes de gerar JRXML, **VALIDE** a view em `rules/views.json`:

- View existe?
- Campos solicitados existem em `validFields`?
- Tipos corretos?

**Se NÃO encontrar**: Rejeitar e informar campo/view inválida.

### 3️⃣ ESTRUTURA JRXML: Template Obrigatório

Todo JRXML gerado DEVE incluir:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport name="{reportName}"
  pageWidth="595" pageHeight="842"
  orientation="Portrait"
  leftMargin="40" rightMargin="40"
  topMargin="40" bottomMargin="40">

  <!-- Parâmetros -->
  <parameter name="dataInicio" class="java.util.Date"/>
  <parameter name="dataFim" class="java.util.Date"/>

  <!-- Query -->
  <queryString>
    <![CDATA[SELECT ... FROM view WHERE 1=1 AND ...]]>
  </queryString>

  <!-- Campos (field) -->
  <field name="campo1" class="java.lang.String"/>

  <!-- Bandas: title, columnHeader, detail, pageFooter -->
  <title><band height="60">...</band></title>
  <columnHeader><band height="25">...</band></columnHeader>
  <detail><band height="20">...</band></detail>
  <pageFooter><band height="30">...</band></pageFooter>

</jasperReport>
```

### 4️⃣ COMPILAÇÃO: Obrigatória via Script

Sempre compile gerado JRXML:

```bash
node scripts/compile.js output/{relatorio}/{relatorio}.jrxml --pdf
```

Saída esperada: `.jasper` + `.pdf` preview + `.log` + `metadata.json`

### 4.1️⃣ PDF COM DADOS REAIS: Obrigatório

Não usar datasource vazio para validação final. O PDF final deve vir de conexão real com banco (`pdf-with-data`).

### 4.2️⃣ Verificação de PDF vazio (Regra de Ouro)

Após compilar, valide:

- Arquivo `.pdf` existe
- Tamanho > 1KB (aproximação prática para evitar PDF em branco)
- `.log` sem `ERROR`

Se PDF estiver muito pequeno ou visualmente vazio, revisar imediatamente:

1. Tipos `<field>` no JRXML vs tipos reais da view
2. Filtros de data muito restritivos
3. Filtro opcional com cast inadequado (ex.: `varchar = integer`)

### 4.3️⃣ Master/Detail - Pipeline Obrigatório

Para relatórios `MASTER_DETAIL`, seguir obrigatoriamente:

1. Validar `master.jrxml` e `detail.jrxml` com `validate.js`
2. Compilar em 2 estágios via `compile.js --detail`
3. Informar `--relationship` quando existir chave em `rules/views.json`
4. Conferir `metadata.json.reportTopology` e `master.log`

Comando padrão:

```bash
node scripts/compile.js output/{pasta}/master.jrxml \
  --detail output/{pasta}/detail.jrxml \
  --relationship {relationshipKey} \
  --pdf
```

Saída mínima esperada:

- `master.jasper`
- `detail.jasper`
- `master.pdf`
- `master.log`
- `metadata.json` com `reportTopology.type = MASTER_DETAIL`

### 4.4️⃣ Master/Detail 2 Níveis - Pipeline Obrigatório

Para relatórios `MASTER_DETAIL_2L` (master → detail1 → detail2), seguir obrigatoriamente:

1. Validar `master.jrxml`, `detail1.jrxml` e `detail2.jrxml` com `validate.js --detail` e `--detail2`
2. Compilar em 3 estágios via `compile.js --detail --detail2`
3. Informar `--relationship` referenciando entrada com `detail2View` e `relationship2` em `rules/views.json`
4. Conferir `metadata.json.reportTopology.type = MASTER_DETAIL_2L` e `master.log`
5. **Limite: 2 níveis máximo. `--detail3` é bloqueado com erro.**

Comando padrão:

```bash
node scripts/compile.js output/{pasta}/master.jrxml \
  --detail output/{pasta}/detail1.jrxml \
  --detail2 output/{pasta}/detail2.jrxml \
  --relationship {relationshipKey} \
  --pdf
```

Saída mínima esperada:

- `master.jasper`
- `detail1.jasper`
- `detail2.jasper`
- `master.pdf`
- `master.log`
- `metadata.json` com `reportTopology.type = MASTER_DETAIL_2L`

### 5️⃣ FONTS & ESTILOS: DejaVu Sans Padrão

Usar APENAS fontes que funcionam em PDF sem embeding:

- `DejaVu Sans` (standard)
- `DejaVu Serif` (alternativa)
- **EVITAR**: Arial, Helvetica (podem não renderizar em PDF)

---

## 🔒 COMPATIBILIDADE JRXML COM JASPERREPORTS 6.2.0

### Versão & Atributos Bloqueados

**Versão:** Sempre 6.2.0 (sem exceção)  
**Atributos MODERNOS PROIBIDOS** (versões posteriores):

- ❌ `uuid` (versão 6.4+)
- ❌ `kind` (versão 6.3+)
- ❌ `splitType` (versão 6.3+)
- ❌ Qualquer atributo com namespace `xmlns:` customizado

**Validação automática:** `validate.js` falha se detectar esses atributos.

### Estrutura Obrigatória

**4 Bandas OBRIGATÓRIAS em SIMPLE:**

```xml
<title>...</title>
<columnHeader>...</columnHeader>
<detail>...</detail>
<pageFooter>...</pageFooter>
```

**7 Bandas OBRIGATÓRIAS em MASTER_DETAIL:**

```xml
<!-- MASTER -->
<title>...</title>
<columnHeader>...</columnHeader>
<detail>...</detail>
<pageFooter>...</pageFooter>

<!-- DETAIL (subreport) -->
<columnHeader>...</columnHeader>
<detail>...</detail>
<pageFooter>...</pageFooter>
```

**10 Bandas OBRIGATÓRIAS em MASTER_DETAIL_2L:**

```xml
<!-- MASTER -->
<title>...</title>
<columnHeader>...</columnHeader>
<detail>...</detail>
<pageFooter>...</pageFooter>

<!-- DETAIL1 (subreport do master) -->
<columnHeader>...</columnHeader>
<detail>...</detail>
<pageFooter>...</pageFooter>

<!-- DETAIL2 (subreport do detail1) -->
<columnHeader>...</columnHeader>
<detail>...</detail>
<pageFooter>...</pageFooter>
```

**Validação automática:** `validate.js` falha se qualquer banda obrigatória estiver faltando.

### Fonts Garantidas (PDF Safe)

**Permitidas:**

- ✅ `DejaVu Sans` (recomendada)
- ✅ `DejaVu Serif`
- ✅ `DejaVu Sans Mono`

**Proibidas:**

- ❌ `Arial` (pode não renderizar em PDF)
- ❌ `Helvetica` (pode não renderizar em PDF)
- ❌ `Times New Roman` (pode causar problemas em PDF)
- ❌ Qualquer font customizada sem embedding

**Validação automática:** `validate.js` avisa se font não-padrão detectada.

### Encoding & CDATA

**Obrigatório:**

```xml
<?xml version="1.0" encoding="UTF-8"?>

<queryString>
  <![CDATA[
    SELECT ... FROM ... WHERE ...
  ]]>
</queryString>
```

**Proibido:**

- ❌ `encoding="ISO-8859-1"` ou outro (sempre UTF-8)
- ❌ Query fora de `<![CDATA[...]]>` (quebra parse)
- ❌ `SELECT *` (sempre explícito)

**Validação automática:** `validate.js` falha se CDATA mal-formado ou SELECT \* detectado.

---

## 📋 REGRAS DE MODO: SIMPLE vs MASTER_DETAIL vs MASTER_DETAIL_2L

### MODO SIMPLE (Padrão)

**Use SIMPLE quando:**

- ✅ 1 única view como fonte de dados
- ✅ 1 única query (sem subreport)
- ✅ Sem relação pai-filho

**Características obrigatórias:**

- query única em `<queryString>`
- Sem elemento `<subreport>`
- metadata.json.reportTopology.type = `SIMPLE`

**Comando compilação:**

```bash
node scripts/compile.js output/{nome}/{nome}.jrxml --pdf
```

**Validação:** `validate.js` verifica:

- ✓ View existe em rules/views.json
- ✓ Todos campos existem em validFields
- ✓ Tipos dos campos coincidem com tipos em rules/views.json
- ✓ Nenhum `<subreport>` presente

### MODO MASTER_DETAIL (Relacional)

**Use MASTER_DETAIL quando:**

- ✅ 2 views com relação pai-filho (1:N)
- ✅ Relacionamento EXISTE em rules/views.json.relationships
- ✅ Cardinalidade é obrigatoriamente 1:N

**Características obrigatórias:**

- master.jrxml com query principal
- detail.jrxml com subreport (parameterizado por chave mestre)
- Relacionamento declarado em rules/views.json.relationships com:
  ```json
  {
    "masterView": "...",
    "detailView": "...",
    "relationship": {
      "localKey": "...",
      "foreignKey": "...",
      "cardinality": "1:N"
    }
  }
  ```
- metadata.json.reportTopology.type = `MASTER_DETAIL`

**Comando compilação:**

```bash
node scripts/compile.js output/{pasta}/master.jrxml \
  --detail output/{pasta}/detail.jrxml \
  --relationship {relationshipKey} \
  --pdf
```

**Validação:** `validate.js` verifica:

- ✓ masterView existe em rules/views.json
- ✓ detailView existe em rules/views.json
- ✓ Relacionamento existe em rules/views.json.relationships
- ✓ Cardinalidade = "1:N" (jamais N:N ou 1:1)
- ✓ localKey existe em masterView
- ✓ foreignKey existe em detailView
- ✓ Tipos de localKey e foreignKey coincidem (INT=INT, VARCHAR=VARCHAR)
- ✓ detail.jrxml tem `<subreport>` com parameterização correta

**Erro comum:** Tentar usar MASTER_DETAIL sem relacionamento em rules/views.json → FALHA obrigatória com mensagem clara.

### MODO MASTER_DETAIL_2L (Relacional com 2 níveis)

**Use MASTER_DETAIL_2L quando:**

- ✅ 3 views com relação em cadeia: master → detail1 → detail2
- ✅ Relacionamento com `detail2View` e `relationship2` EXISTE em rules/views.json.relationships
- ✅ Cardinalidade 1:N em ambos os níveis
- ✅ **Limite máximo: 2 níveis de detail** (--detail3 é bloqueado com erro)

**Características obrigatórias:**

- master.jrxml com query principal
- detail1.jrxml com subreport para detail2 (parameterizado por `SUBREPORT_DETAIL2_PATH`)
- detail2.jrxml com query do segundo nível
- **master.jrxml DEVE repassar `SUBREPORT_DETAIL2_PATH` para detail1 via `<subreportParameter>`**
- Relacionamento declarado em rules/views.json.relationships com:
  ```json
  {
    "masterView": "...",
    "detailView": "...",
    "detail2View": "...",
    "relationship": {
      "localKey": "...",
      "foreignKey": "...",
      "cardinality": "1:N"
    },
    "relationship2": {
      "localKey": "...",
      "foreignKey": "...",
      "cardinality": "1:N"
    }
  }
  ```
- metadata.json.reportTopology.type = `MASTER_DETAIL_2L`
- Parâmetros necessários em master.jrxml:
  ```xml
  <parameter name="SUBREPORT_DETAIL_PATH" class="java.lang.String"/>
  <parameter name="SUBREPORT_DETAIL2_PATH" class="java.lang.String"/>
  ```
- Subreport em master.jrxml deve repassar SUBREPORT_DETAIL2_PATH para detail1:
  ```xml
  <subreportParameter name="SUBREPORT_DETAIL2_PATH">
    <subreportParameterExpression>$P{SUBREPORT_DETAIL2_PATH}</subreportParameterExpression>
  </subreportParameter>
  ```

**Comando compilação:**

```bash
node scripts/compile.js output/{pasta}/master.jrxml \
  --detail output/{pasta}/detail1.jrxml \
  --detail2 output/{pasta}/detail2.jrxml \
  --relationship {relationshipKey} \
  --pdf
```

**Pipeline interno (3-stage):**

1. Validate master.jrxml (Stage 1/6)
2. Validate detail1.jrxml (Stage 2/6)
3. Validate detail2.jrxml (Stage 2.5/6)
4. Semantic M/D validation master+detail1 (Stage 2.7)
5. Semantic M/D 2L validation detail1→detail2 (Stage 2.8)
6. Compile detail2 → detail2.jasper (Stage 3/6)
7. Compile detail1 → detail1.jasper (Stage 4/6)
8. Compile master → master.jasper (Stage 5/6)
9. Generate PDF com `SUBREPORT_DETAIL_PATH=detail1.jasper` + `SUBREPORT_DETAIL2_PATH=detail2.jasper` (Stage 6/6)

**Saída mínima esperada:**

- `detail2.jasper`
- `detail1.jasper`
- `master.jasper`
- `master.pdf`
- `master.log`
- `metadata.json` com `reportTopology.type = MASTER_DETAIL_2L`

**Validação:** `validate.js` verifica (além de tudo do MASTER_DETAIL):

- ✓ detail2View existe em rules/views.json
- ✓ relationship2 existe na entrada do relacionamento
- ✓ relationship2.localKey existe em detailView
- ✓ relationship2.foreignKey existe em detail2View
- ✓ Tipos de relationship2 keys coincidem
- ✓ Cardinalidade relationship2 = "1:N"
- ✓ detail1.jrxml tem `<subreport>` (para detail2)

**Erro se tentar --detail3:** BLOQUEADO com exit code 1.

```
ERROR: Máximo de 2 níveis de detail suportados. Use apenas --detail e --detail2.
```

**Erro comum:** Esquecer de repassar `SUBREPORT_DETAIL2_PATH` via `<subreportParameter>` no master.jrxml → detail2 não encontrado em runtime.

---

## ✏️ REGRAS DE ALTERAÇÃO PÓS-CRIAÇÃO

### Escopo Protegido

**Permitido editar:**

- ✅ APENAS `output/<nome>/<nome>.jrxml` (para SIMPLE)
- ✅ APENAS `output/<nome>/master.jrxml` + `output/<nome>/detail.jrxml` (para MASTER_DETAIL)
- ✅ APENAS `output/<nome>/master.jrxml` + `output/<nome>/detail1.jrxml` + `output/<nome>/detail2.jrxml` (para MASTER_DETAIL_2L)

**PROIBIDO editar:**

- ❌ Nenhum arquivo fora de `output/<nome>/`
- ❌ Nenhum arquivo de setup, scripts, regras

**Validação:** Verificar explicitamente antes de proceder que nenhum arquivo fora do escopo foi tocado.

### Dois Tipos de Alteração

#### Tipo 1: Alteração de REGRA (Dados/Filtros)

**Quando mudar:** View, campos, filtros, agregações, SQL

**Sim, pode:**

- ✅ Adicionar/remover campos
- ✅ Mudar view (se ainda existe em rules/views.json)
- ✅ Adicionar/remover filtros
- ✅ Mudar SQL (respeitando $P{...} syntax)
- ✅ Mudar relacionamento (se novo existe em rules/views.json.relationships)

**Não, com bloco obrigatório:**

- ❌ Alterar tipos de campos sem validação em rules/views.json
- ❌ Remover bandas obrigatórias
- ❌ Usar atributos 6.3+ (uuid, kind, splitType)

**Pipeline obrigatório:**

```bash
# 1. Editar output/<nome>/<nome>.jrxml
# 2. Validar
node scripts/validate.js output/<nome>/<nome>.jrxml
# 3. Se sai exit code 0, compilar
node scripts/compile.js output/<nome>/<nome>.jrxml --pdf
# 4. Verificar PDF gerado (>1KB, sem ERROR no log)
```

#### Tipo 2: Alteração VISUAL (Layout/Fonts/Cores)

**Quando mudar:** Layouts, cores, fonts, margens, dimensões

**Sim, pode:**

- ✅ Mudar cores de texto/background
- ✅ Mudar fonts (APENAS DejaVu Sans/Serif)
- ✅ Mudar tamanho de banda
- ✅ Ajustar margens de página
- ✅ Reorganizar posição de campos (x, y)

**JAMAIS (bloco obrigatório):**

- ❌ Alterar view ou nome da view
- ❌ Remover/adicionar campos (`<field>`)
- ❌ Mudar SQL (`<queryString>`)
- ❌ Adicionar/remover parâmetros
- ❌ Adicionar subreport (transforma SIMPLE em MASTER_DETAIL)

**Pipeline obrigatório:**

```bash
# 1. Editar APENAS cores/fonts/layout em output/<nome>/<nome>.jrxml
# 2. Validar (deve sair exit code 0 sem mudança de dados)
node scripts/validate.js output/<nome>/<nome>.jrxml
# 3. Compilar
node scripts/compile.js output/<nome>/<nome>.jrxml --pdf
# 4. Verificar PDF visualmente (layout correto, dados iguais)
```

### Checklist Pós-Alteração

Antes de entregar relatório alterado, SEMPRE verificar:

- [ ] Arquivo alterado está em `output/<nome>/` (correto)
- [ ] Nenhum arquivo fora escopo foi editado
- [ ] `validate.js` rodou com exit code 0
- [ ] `compile.js --pdf` rodou sem ERROR no log
- [ ] PDF foi gerado (>1KB)
- [ ] Se era REGRA: dados fazem sentido (campos novos, filtros funcionam)
- [ ] Se era VISUAL: layout está bonito, dados inalterados

**Se qualquer check falhar:** PARAR e corrigir. NÃO entregar relatório com erro.

---

## 📋 Checklist de Qualidade (Antes de Entregar)

- [ ] XML bem-formado (sem parse errors)
- [ ] View existe em `rules/views.json`
- [ ] Todos campos em `validFields` da view
- [ ] SQL usa `SELECT` explícito (não `SELECT *`)
- [ ] Todos filtros parametrizados (`$P{xxx}`)
- [ ] Parâmetros definidos no header (`<parameter>`)
- [ ] 4 bandas presentes: title, columnHeader, detail, pageFooter
- [ ] Fonts: DejaVu Sans
- [ ] Compila sem ERROR logs
- [ ] PDF preview gerado
- [ ] Metadata versionado (timestamp + checksums)
- [ ] **[NOVO - Se usou modelo]** Contaminação semântica validada:
  - ✅ Exit code 0 em `validate.js --check-model-contamination`
  - ✅ Nenhuma 🔴 CRITICAL ou 🟠 HIGH encontrada
  - ✅ Arquivo `.log` sem mensagens "CONTAMINATION"
- [ ] **[NOVO]** Rastreabilidade de estilo em `metadata.json`:
  - ✅ Campo `styleSource` presente (ou omitido se nativo)
  - ✅ Campo `confidence` > 0.65 (se estilo aplicado)
  - ✅ Campo `dataSource` documenta view/campos/filtros
  - ✅ Campo `validation` documenta todas as verificações
- [ ] **[NOVO]** Console output de compilação mostra:
  - ✅ `Style confidence: XX.X% (threshold: 65%)` (se aplicado)
  - ✅ Sem WARN sobre "Failed to parse blueprint JSON"

---

## 🔧 Exemplos Inline

### Caso 1: Relatório Simples com 1 Filtro

**Input:**

```
Relatório: VENDAS_POR_DATA
View: view_vendas_diarias
Campos: data, item_nome, valor_total
Filtro: data_inicio (DATE) a data_fim (DATE)
```

**Output (XML snippet):**

```xml
<parameter name="dataInicio" class="java.util.Date">
  <defaultValueExpression>
    <![CDATA[
      java.time.LocalDate.now().minusDays(30)
    ]]>
  </defaultValueExpression>
</parameter>

<queryString>
  <![CDATA[
    SELECT
      data,
      item_nome,
      valor_total
    FROM view_vendas_diarias
    WHERE 1=1
      AND data >= $P{dataInicio}
      AND data <= $P{dataFim}
    ORDER BY data DESC
  ]]>
</queryString>
```

### Caso 2: Relatório com Agregação (SUM)

**Input:**

```
Relatório: VENDAS_TOTAIS_POR_VENDEDOR
View: view_vendas_diarias
Campos: vendedor_nome, valor_total (SUM)
Filtro: data_inicio, data_fim
```

**Output (XML snippet):**

```xml
<variable name="totalVendas" class="java.math.BigDecimal"
  resetType="Report" calculation="Sum">
  <variableExpression>$F{valor_total}</variableExpression>
</variable>

<summary height="50">
  <band>
    <staticText>
      <text>Total Geral Vendas:</text>
    </staticText>
    <textField pattern="#,##0.00">
      <textFieldExpression>$V{totalVendas}</textFieldExpression>
    </textField>
  </band>
</summary>
```

### Caso 3: Typecast para Data

**SQL com typecast:**

```xml
<queryString>
  <![CDATA[
    SELECT
      date(data_creacao) as data,  -- TypeCast para DATE
      COUNT(*) as total
    FROM view_pacientes
    WHERE 1=1
      AND date(data_creacao) >= $P{dataInicio}
      AND date(data_creacao) <= $P{dataFim}
    GROUP BY date(data_creacao)
  ]]>
</queryString>
```

---

## 🚀 Workflow Copilot: 3 MODOS

### MODO 1: Geração Rápida (Simples)

```
Input → JRXML → Compile → Entrega
Tempo: ~2-3 min
Ideal para: Relatórios simples, 5-8 campos
```

### MODO 2: Geração com Iteração

```
Input → Plan → JRXML Draft → Validação → Refinement → Compile → Entrega
Tempo: ~5-10 min
Ideal para: Relatórios complexos, agregações, múltiplos filtros
```

### MODO 3: Modo Agent (Detalhado)

```
Usar @workspace para contexto completo:
1. Ler examples/ para referência de estilo
2. Validar contra rules/views.json
3. Gerar JRXML
4. Compilar e testar
5. Gerar relatório final
Tempo: ~15-20 min
Ideal para: Relatórios do zero, sem exemplos
```

**Recomendação**: Copilot deve sugerir MODO 1 por padrão, oferecer MODO 2/3 se complexidade detectada.

---

## 📂 Arquivos de Referência

Quando gerar JRXML, considere:

1. **examples/**: PDFs/JRXMLs de legado como referência visual
2. **rules/views.json**: Campos válidos, tipos, agregações permitidas
3. **prompts/relatorio-simples.prompt.md**: Template de input
4. **skills/generate-jrxml.md**: Skill detalhada com exemplos
5. **docs/QUICKSTART.md**: Trilha dupla (SIMPLE e MASTER_DETAIL)
6. **docs/MASTER-DETAIL-QUICKSTART.md**: Guia operacional dedicado para master/detail

---

## ⚠️ Anti-Padrões: O que NÃO fazer

```xml
❌ SELECT * (Use campos explícitos)
❌ Hardcoded filters (Use $P{xxx})
❌ Atributos de Jasper moderno incompatíveis com 6.2.0 (`uuid`, `kind`, `splitType`, etc.)
❌ Fonts não-standard (Use DejaVu Sans)
❌ Sem bandas (Sempre inclua 4: title, columnHeader, detail, pageFooter)
❌ XML malformado (Valide antes de compilar)
❌ Sem documentação (metadata.json obrigatório)
❌ Forçar `LIMIT` por padrão em relatório operacional sem alinhamento com negócio
❌ Declarar IDs alfanuméricos como `Integer` quando a view retorna `VARCHAR`
```

---

## ⚠️ Anti-Padrões com Modelo JRXML (NOVO)

❌ **NÃO FAÇA** (com modelo):

| Padrão                           | Por Quê                             | Solução                                                         |
| -------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| Copiar `<queryString>` real      | Dados errados → select quebrado     | Use `<queryString><![CDATA[SELECT 1]]></queryString>` no modelo |
| Reutilizar `<field>` do modelo   | Campo pode não existir na view nova | Declare 0 fields no modelo                                      |
| Compartilhar `<parameter>` model | Filtro copiado forma contrato falso | Sempre zerador parâmetros no novo JRXML                         |
| Incluir `<group>` ou aggregação  | Lógica não porta entre views        | Definir group no novo JRXML conforme sua semântica              |
| Herdar expressão `$F{campo_x}`   | Campo pode ter nome/tipo diferente  | Validar cada expressão → ajustar se necessário                  |
| Modelo com 400+ linhas           | Overhead visual de parse            | Manter modelo < 200 linhas de estilo puro                       |
| Versionar `/tmp` no Git          | Modelos mudam frequentemente        | `.gitkeep` apenas, modelo é temp                                |

---

## 🔗 Integração com Skills

- **skill: generate-jrxml.md** - Detalhes técnicos de geração
- **prompt: relatorio-simples.prompt.md** - Template de input para deploy team
- **rules: views.json** - Fonte de verdade para campos/views válidas

---

## � NOVO: Suporte a Modelos JRXML em /tmp

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

4. **Validar Contaminação (CRÍTICO SE USOU MODELO)**:

```bash
node scripts/validate.js output/novo-styled.jrxml --check-model-contamination /tmp/modelo-vendas.jrxml
```

- **Se exit code 0**: OK, nenhuma contaminação detectada. Proceder para compilação.
- **Se exit code 1**: ERRO! Contaminação semântica encontrada. Analisar mensagens e corrigir novo JRXML.

5. **Compilar final com Rastreabilidade**:

```bash
node scripts/compile.js output/novo-styled.jrxml --pdf \
  --style-blueprint output/style.json
```

- Metadados agora incluem `styleSource` com confiança e rastreabilidade
- Console mostra: `Style confidence: XX%` (deve ser > 65%)

6. **[FASE 5 - NOVO] Componentes Complexos como Placeholders Visuais**:
   - Se o modelo tiver `<subreport>`, `<chart>` ou `<crosstab>`, tratar como **layout-only**:
     - Preservar somente `x`, `y`, `width`, `height`, banda e ordem visual
     - **NUNCA** herdar `subDataset`, `datasetRun`, `chartDataset`, `crosstabDataset`
   - O `validate.js --check-model-contamination` agora bloqueia heranças desses datasets
   - O `apply-style-blueprint-from-jrxml.js` registra contagem esperada/encontrada em `.jrxml-style.json`

### ⚠️ Regras de Ouro para Modelo JRXML

| Regra                                             | Razão                                    | Contraexemplo                                              |
| ------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| ✅ Modelo tem 0 `<parameter>`                     | Impede contaminação de filtros           | ❌ `<parameter name="dataInicio">` copiado para novo JRXML |
| ✅ Modelo tem 0 `<field>`                         | Apenas estilo, zero dados                | ❌ field copiado causa erro se campo não existe em view    |
| ✅ Modelo tem `<queryString>` dummy               | Placeholder visual, nunca usado          | ❌ Query real copiada → select errado em novo JRXML        |
| ✅ Nenhuma variável/group no modelo               | Agora, lógica vem do novo JRXML          | ❌ Group copiada interfere com agregação                   |
| ✅ Modelo tem 0 `$F{}`, `$P{}`, `$V{}` expressões | Impede expressão inválida em novo report | ❌ `$F{campo_inexistente}` copiada quebra novo JRXML       |

### 📊 Confiança de Estilo

Se blueprint extraído tem `confidence < 0.65` → fallback automático (novo JRXML não estilizado).
Para forçar aplicação mesmo com confiança baixa:

```bash
node scripts/apply-style-blueprint-from-jrxml.js output/style.json output/novo.jrxml output/novo-styled.jrxml 0.50
```

### 🎓 Exemplos

Veja `docs/EXAMPLE-COM-MODELO.md` para workflow completo com modelo.
Veja `docs/JRXML-MODELO-ANTI-PATTERNS.md` para o que evitar.

---

## �📞 Troubleshooting Rápido

| Erro                                                   | Causa                                                 | Solução                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| XML Parse Error                                        | CDATA malformado                                      | Cheque `<![CDATA[...]]>`                                                                            |
| View not found                                         | View não existe                                       | Validar em `rules/views.json`                                                                       |
| Field mismatch                                         | Campo não em validFields                              | Adicionar campo em rules/views.json                                                                 |
| `Bad value for type int: HA1`                          | Field Java incorreto (String declarado como Integer)  | Corrigir `<field class>` para `java.lang.String`                                                    |
| `operator does not exist: character varying = integer` | Filtro com tipos diferentes no WHERE                  | Ajustar para comparação com mesmo tipo/cast seguro                                                  |
| PDF em branco (~1KB)                                   | 0 linhas retornadas ou erro de mapeamento             | Tornar filtros opcionais + validar tipos em `validate.js`                                           |
| `FileNotFoundException ... .pdf (Permission denied)`   | PDF aberto e bloqueado no Windows                     | Fechar visualizador, remover PDF antigo e compilar de novo                                          |
| Compilation fails                                      | JRXML syntax                                          | Rodé `validate.js`                                                                                  |
| PDF not rendering                                      | Font issue                                            | Trocar para DejaVu Sans                                                                             |
| Contaminação em `subDataset` / `datasetRun`            | Modelo complex component herdado indevidamente        | Remover bindings herdados e revalidar com `--check-model-contamination`                             |
| Chart/Crosstab herdou dataset do modelo                | Placeholders tratados como lógica de dados por engano | Manter apenas geometria visual; definir datasets no relatório novo                                  |
| `Subreport not found` ou detail não carrega            | Caminho `detail.jasper` inválido                      | Compilar com `--detail` e confirmar arquivo na mesma pasta de output                                |
| Detail vazio no PDF master/detail                      | Chave de relação não mapeada ou filtro excessivo      | Revisar `subreportParameter`, `--relationship` e filtros do detail                                  |
| Mismatch de tipo na chave master/detail                | Tipos diferentes entre views/JRXML                    | Alinhar tipos em `rules/views.json`, `<field class>` e parâmetros                                   |
| `detail2` não encontrado em runtime                    | `SUBREPORT_DETAIL2_PATH` não repassado pelo master    | Adicionar `<subreportParameter name="SUBREPORT_DETAIL2_PATH">` no subreport do master.jrxml         |
| `ERROR: Máximo de 2 níveis`                            | Tentativa de usar `--detail3`                         | Máximo suportado é 2 níveis (`--detail` + `--detail2`)                                              |
| `detail2View` not found in rules/views.json            | Relacionamento não tem campo `detail2View`            | Adicionar `detail2View` e `relationship2` na entrada do relacionamento em `rules/views.json`        |
| Detail2 vazio no PDF                                   | Chave de relação nível 2 não mapeada                  | Revisar `relationship2` em `rules/views.json` e parâmetro `SUBREPORT_DETAIL2_PATH` no detail1.jrxml |

---

## 🎓 Modo Ensino (Copilot Agent)

Quando usuário é novo, ofereça:

1. **Primeiro relatório**: Use `examples/sample-report-vendas.jrxml` como base
2. **Explicação inline**: Comente cada seção do JRXML
3. **Validação step-by-step**: Mostre output de `validate.js` e `compile.js`
4. **Docs**: Referencie `docs/QUICKSTART.md`
5. **Master/Detail**: Quando for formato MASTER_DETAIL, referencie `docs/MASTER-DETAIL-QUICKSTART.md`

---

## 🛡️ SUMÁRIO: CAMADAS DE PROTEÇÃO (FASE 1 DE GOVERNANÇA)

Este arquivo (`copilot-instructions.md`) implementa **Camada 1 de Governança**: Instruções de Prompt

| Camada | Localização         | Função                                                        | Implementação            |
| ------ | ------------------- | ------------------------------------------------------------- | ------------------------ |
| **1**  | ⬅️ Este arquivo     | Bloqueios de prompt + regras de compatibilidade               | ✅ IMPLEMENTADO (FASE 1) |
| **2**  | rules/views.json    | Contrato obrigatório de dados (view, campos, tipos, relações) | ⏳ FASE 2                |
| **3**  | scripts/validate.js | Validação técnica de XML/SQL (exit code 1 em erro)            | ⏳ FASE 3                |
| **4**  | scripts/compile.js  | Bloqueio final (PDF vazio, log ERROR, artefatos faltando)     | ⏳ FASE 4                |
| **5**  | prompts/ + skills/  | Estrutura de fluxo de input (checklists pré-preenchimento)    | ⏳ FASE 5                |

**Objetivo da Camada 1 (ESTE ARQUIVO):**

- ✅ Bloquears alterações a arquivos protegidos (scripts, setup, rules.json)
- ✅ Enforçar compatibilidade JasperReports 6.2.0
- ✅ Definir regras de modo (SIMPLE vs MASTER_DETAIL)
- ✅ Proteger fluxo de alteração pós-criação (REGRA vs VISUAL)

---

**Última Atualização:** 1 de Abril de 2026 (B3 - Suporte a MASTER_DETAIL_2L)
**Versão:** 1.6 (adição de MASTER_DETAIL_2L: modo, pipeline 3-stage, validação, troubleshooting)  
**Responsável:** Deploy Team + Engenharia de IA
