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
   node scripts/compile.js output/{relatorio}.jrxml --pdf \
     [--style-blueprint output/{style-blueprint}.json]
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

### 5️⃣ FONTS & ESTILOS: DejaVu Sans Padrão

Usar APENAS fontes que funcionam em PDF sem embeding:
- `DejaVu Sans` (standard)
- `DejaVu Serif` (alternativa)
- **EVITAR**: Arial, Helvetica (podem não renderizar em PDF)

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

| Padrão | Por Quê | Solução |
|--------|---------|--------|
| Copiar `<queryString>` real | Dados errados → select quebrado | Use `<queryString><![CDATA[SELECT 1]]></queryString>` no modelo |
| Reutilizar `<field>` do modelo | Campo pode não existir na view nova | Declare 0 fields no modelo |
| Compartilhar `<parameter>` model | Filtro copiado forma contrato falso | Sempre zerador parâmetros no novo JRXML |
| Incluir `<group>` ou aggregação | Lógica não porta entre views | Definir group no novo JRXML conforme sua semântica |
| Herdar expressão `$F{campo_x}` | Campo pode ter nome/tipo diferente | Validar cada expressão → ajustar se necessário |
| Modelo com 400+ linhas | Overhead visual de parse | Manter modelo < 200 linhas de estilo puro |
| Versionar `/tmp` no Git | Modelos mudam frequentemente | `.gitkeep` apenas, modelo é temp |

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

---

## �📞 Troubleshooting Rápido

| Erro | Causa | Solução |
|------|-------|--------|
| XML Parse Error | CDATA malformado | Cheque `<![CDATA[...]]>` |
| View not found | View não existe | Validar em `rules/views.json` |
| Field mismatch | Campo não em validFields | Adicionar campo em rules/views.json |
| `Bad value for type int: HA1` | Field Java incorreto (String declarado como Integer) | Corrigir `<field class>` para `java.lang.String` |
| `operator does not exist: character varying = integer` | Filtro com tipos diferentes no WHERE | Ajustar para comparação com mesmo tipo/cast seguro |
| PDF em branco (~1KB) | 0 linhas retornadas ou erro de mapeamento | Tornar filtros opcionais + validar tipos em `validate.js` |
| `FileNotFoundException ... .pdf (Permission denied)` | PDF aberto e bloqueado no Windows | Fechar visualizador, remover PDF antigo e compilar de novo |
| Compilation fails | JRXML syntax | Rodé `validate.js` |
| PDF not rendering | Font issue | Trocar para DejaVu Sans |
| Contaminação em `subDataset` / `datasetRun` | Modelo complex component herdado indevidamente | Remover bindings herdados e revalidar com `--check-model-contamination` |
| Chart/Crosstab herdou dataset do modelo | Placeholders tratados como lógica de dados por engano | Manter apenas geometria visual; definir datasets no relatório novo |

---

## 🎓 Modo Ensino (Copilot Agent)

Quando usuário é novo, ofereça:

1. **Primeiro relatório**: Use `examples/sample-report-vendas.jrxml` como base
2. **Explicação inline**: Comente cada seção do JRXML
3. **Validação step-by-step**: Mostre output de `validate.js` e `compile.js`
4. **Docs**: Referencie `docs/QUICKSTART.md`

---

**Última Atualização:** 31 de Março de 2026 (Fase 5 - Placeholders Complexos)
**Versão:** 1.3 (subreports/charts/crosstabs como visual-only + validação de dataset inheritance)  
**Responsável:** Deploy Team
