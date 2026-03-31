# 📋 FASE 4 - VALIDAÇÃO E AUDITORIA EM SCRIPTS - PLANO DE EXECUÇÃO

**Status**: ⏳ EM PLANEJAMENTO (Antes de Iniciar)  
**Estimativa**: ~2-3h Implementação + Testes  
**Dependência**: Concluída ✅ Fase 0, 1, 2, 3

---

## 🎯 Objetivo

Integrar validação de semantic contamination e metadata auditoria nos scripts existentes:

1. **Evolva `scripts/validate.js`** - Detectar se JRXML-alvo foi contaminado com dados do modelo
2. **Evolva `scripts/compile.js`** - Rastrear origem do estilo (modelo vs nativa)
3. **Atualize output metadata** - Adicionar campos de auditoria de estilo

---

## 📐 Tarefas Detalhadas

### Tarefa 1: Evolua `scripts/validate.js`

**Localização**: `scripts/validate.js`

**Funcionalidade Atual**: Valida XML bem-formado, tipos JRXML x view fields

**Mudanças Necessárias**:

#### 1.1 Novo Parâmetro CLI

```bash
# Novo flag para validação com modelo
node scripts/validate.js <jrxml-file> --check-model-contamination <source.jrxml-or-path>

# Exemplo:
node scripts/validate.js output/relatorio-vendas.jrxml --check-model-contamination /tmp/modelo-vendas.jrxml
```

**Lógica**:
1. Se `--check-model-contamination` fornecido:
   - Parse JRXML alvo
   - Parse source modelo
   - Valide que JRXML alvo NÃO herdou:
     - `<queryString>` from modelo
     - `<field>` from modelo
     - `<parameter>` from modelo
     - `<variable>` from modelo
     - `<group>` from modelo
     - Expressões `$F{}`, `$P{}`, `$V{}` identicas ao modelo
   - Se alguma contaminação encontrada: ERROR saída, exit code 1
   - Se limpo: OK, exit code 0

#### 1.2 Novo Output: Relatório de Contaminação

Se contaminação detectada, output detalhado:

```
ERROR: Semantic Data Contamination Detected

Contamination Type: <queryString> inherited
  - Expected (from model): SELECT 1
  - Found (in target): SELECT data, vendedor FROM view_vendas (MATCH!)
  
Recommendation: Do not reuse data semantics from modelo.

Exit code: 1
```

#### 1.3 Integração com compile.js

`compile.js` pode chamar `validate.js --check-model-contamination` como pré-requisito:

```javascript
// Em compile.js, antes de compilar JRXML alvo:
if (blueprint && blueprint.source?.jrxmlModelPath) {
  // Validar que JRXML-alvo não foi contaminado pelo modelo
  execSync(`node scripts/validate.js ${jrxmlPath} --check-model-contamination ${blueprint.source.jrxmlModelPath}`);
}
// Se validation falhar, execSync throw → compile falha (fail-safe)
```

---

### Tarefa 2: Evolva `scripts/compile.js`

**Localização**: `scripts/compile.js`

**Funcionalidade Atual**: Compila JRXML usando jaspcompile CLI, gera .jasper + .pdf

**Mudanças Necessárias**:

#### 2.1 Novo Input: Blueprint JSON (Opcional)

```bash
# Novo parâmetro para rastreabilidade
node scripts/compile.js <jrxml-file> --pdf --style-blueprint <blueprint.json>

# Exemplo:
node scripts/compile.js output/relatorio-vendas.jrxml --pdf --style-blueprint output/blueprint.json
```

**Lógica**:
1. Se `--style-blueprint` fornecido:
   - Ler blueprint.json
   - Extrair: sourceInputMode, jrxmlModelPath, confidence, jrxmlModelSha256
   - Guardar em output metadata
2. Se sem blueprint: Criar objeto empty styleSource

#### 2.2 Novo Output: metadata.json Evoluído

Adicionar campos de styleSource a `output/{report}/metadata.json`:

```json
{
  "reportName": "VENDAS_POR_DATA",
  "generatedAt": "2026-03-30T14:32:00Z",
  "compiledAt": "2026-03-30T14:35:00Z",
  "jrxml": {
    "file": "output/VENDAS_POR_DATA/VENDAS_POR_DATA.jrxml",
    "hash": "sha256:abc123def456..."
  },
  "jasper": {
    "file": "output/VENDAS_POR_DATA/VENDAS_POR_DATA.jasper",
    "hash": "sha256:xyz789uva012...",
    "size": "189462",
    "version": "JasperReports 6.2.0"
  },
  "pdf": {
    "file": "output/VENDAS_POR_DATA/VENDAS_POR_DATA.pdf",
    "size": "45234",
    "hasData": true
  },
  "styleSource": {
    "type": "jrxml-template",
    "path": "/tmp/modelo-vendas.jrxml",
    "sha256": "modelo_hash_aqui",
    "confidence": 0.93,
    "fallbackApplied": false,
    "appliedAt": "2026-03-30T14:33:00Z"
  },
  "dataSource": {
    "view": "view_vendas_diarias",
    "fields": ["data", "item_nome", "quantidade", "valor_total"],
    "filters": [
      {"name": "dataInicio", "type": "DATE"},
      {"name": "dataFim", "type": "DATE"}
    ]
  },
  "validation": {
    "xmlValid": true,
    "sqlValid": true,
    "contaminationCheck": "passed",
    "typeConsistency": "passed"
  }
}
```

**Campos Novos de `styleSource`**:
- `type`: "nativa" | "jrxml-template" | "pdf-blueprint"
- `path`: /tmp/modelo-vendas.jrxml (ou PDF path)
- `sha256`: Hash do arquivo fonte
- `confidence`: 0.0-1.0 score
- `fallbackApplied`: boolean
- `appliedAt`: ISO timestamp

---

### Tarefa 3: Integração com Pipeline

**Localização**: Não muda arquivos, apenas define fluxo

**Novo Workflow com Modelo**:

```bash
# Passo 1: Extrair blueprint do modelo
BLUEPRINT=$(node scripts/extract-style-blueprint-from-jrxml.js \
  /tmp/modelo-vendas.jrxml \
  output/blueprint.json)

# Passo 2: Gerar novo JRXML
node scripts/generate-jrxml.js \
  --view view_vendas \
  --fields data,valor \
  --output output/novo.jrxml

# Passo 3: Aplicar estilo + Gerar aplicacao metadata
node scripts/apply-style-blueprint-from-jrxml.js \
  output/blueprint.json \
  output/novo.jrxml \
  output/novo-styled.jrxml

# Passo 4: Validar contaminação (NOVO)
node scripts/validate.js output/novo-styled.jrxml \
  --check-model-contamination /tmp/modelo-vendas.jrxml

# Passo 5: Compilar com rastreabilidade (NOVO)
node scripts/compile.js output/novo-styled.jrxml \
  --pdf \
  --style-blueprint output/blueprint.json

# Resultado:
# - output/novo-styled.jrxml ✅
# - output/novo-styled.jasper ✅
# - output/novo-styled.pdf ✅
# - output/novo-styled.jrxml-style.json ✅ (from apply)
# - output/metadata.json ✅ (from compile, com styleSource fields)
```

---

### Tarefa 4: Atualize Copilot Instructions

**Localização**: `.github/copilot-instructions.md`

**Mudança**:

Após Tarefa 3 (Aplicar estilo), adicionar:

```markdown
3.5. 🔐 **NOVO - Validar Contaminação (se usou modelo):**
   - Se blueprint JSON foi gerado:
     - Executar: `node scripts/validate.js output/novo-styled.jrxml --check-model-contamination /tmp/modelo-vendas.jrxml`
     - Se ERROR: modelo foi contaminado, STOP e rejeitar relatório
     - Se OK: dados estão seguros, procedeu para compilação

4. 🔧 **Compilar com Rastreabilidade:**
   - Executar: `node scripts/compile.js output/novo-styled.jrxml --pdf --style-blueprint output/blueprint.json`
   - Output novo: metadata.json com campos `styleSource.*` adicionados
   - Rastreabilidade completa de origem de estilo
```

---

## 🛡️ Validações Implementadas

### ✅ Constraint 1: Sem Herança de Query

```javascript
// validate.js
if (modelQueryString === targetQueryString) {
  throw new Error('Query herdada do modelo - contaminação detectada');
}
```

### ✅ Constraint 2: Sem Herança de Fields

```javascript
// validate.js
modelFieldNames = modelJrxml.fields.map(f => f.name);
targetFieldNames = targetJrxml.fields.map(f => f.name);

if (setEqual(modelFieldNames, targetFieldNames)) {
  throw new Error('Fields idênticas ao modelo - contaminação detectada');
}
```

### ✅ Constraint 3: Sem Expressões Idênticas

```javascript
// validate.js
detectIdenticalExpressions(modelJrxml, targetJrxml);
// Se encontrar $F{campo_x} idêntica tanto em modelo quanto target → ERROR
```

### ✅ Constraint 4: Metadata Rastreável

```javascript
// compile.js
metadata.styleSource = {
  type: blueprintOriginType,
  path: blueprintSourcePath,
  sha256: computeSha256(blueprintJson),
  confidence: blueprintConfidence,
  fallbackApplied: blueprintFallback,
  appliedAt: new Date().toISOString()
};
```

---

## 📊 Acceptance Criteria - Fase 4

| # | Critério | Status | Verificação |
|----|----------|--------|-------------|
| 1 | `validate.js` tem novo flag `--check-model-contamination` | ⏳ | CLI test |
| 2 | Detecta herança de `<queryString>` | ⏳ | Unit test |
| 3 | Detecta herança de `<field>` | ⏳ | Unit test |
| 4 | Detecta herança de `<parameter>` | ⏳ | Unit test |
| 5 | Detecta expressões `$F{}` idênticas | ⏳ | Unit test |
| 6 | Output ERROR aclaro se contaminação encontrada | ⏳ | Integration test |
| 7 | `compile.js` aceita `--style-blueprint` | ⏳ | CLI test |
| 8 | metadata.json tem novos campos `styleSource.*` | ⏳ | JSON test |
| 9 | campos: type, path, sha256, confidence, fallbackApplied, appliedAt | ⏳ | JSON schema validation |
| 10 | `styleSo

urce.type` retorna jrxml-template, nativa, ou pdf-blueprint | ⏳ | Unit test |
| 11 | Workflow integrando validate + compile funciona end-to-end | ⏳ | Integration test |
| 12 | `.github/copilot-instructions.md` documentado (passos 3.5, 4) | ⏳ | Documentation review |

---

## 📚 Exemplo de Teste End-to-End

```bash
#!/bin/bash
# test-phase4-validation.sh

# Setup
mkdir -p test-output
cp /tmp/modelo-vendas.jrxml test-output/

# 1. Extract blueprint
node scripts/extract-style-blueprint-from-jrxml.js \
  test-output/modelo-vendas.jrxml \
  test-output/blueprint.json

# 2. Generate JRXML (com dados diferentes)
node scripts/generate-jrxml.js \
  --view view_vendas_por_categoria \
  --fields categoria_nome,valor \
  --output test-output/novo.jrxml

# 3. Apply style
node scripts/apply-style-blueprint-from-jrxml.js \
  test-output/blueprint.json \
  test-output/novo.jrxml \
  test-output/novo-styled.jrxml

# 4. Validar contaminação (NOVO TESTE)
echo "Testing contamination check..."
node scripts/validate.js test-output/novo-styled.jrxml \
  --check-model-contamination test-output/modelo-vendas.jrxml

if [ $? -eq 0 ]; then
  echo "✅ Contamination check PASSED"
else
  echo "❌ Contamination check FAILED"
  exit 1
fi

# 5. Compilar com rastreabilidade (NOVO TESTE)
echo "Testing compile with style tracking..."
node scripts/compile.js test-output/novo-styled.jrxml \
  --pdf \
  --style-blueprint test-output/blueprint.json

# 6. Verificar metadata (NOVO TESTE)
if grep -q '"styleSource"' test-output/metadata.json; then
  echo "✅ Metadata tracking PASSED"
  cat test-output/metadata.json | jq '.styleSource'
else
  echo "❌ Metadata tracking FAILED"
  exit 1
fi

echo "✅ Phase 4 acceptance tests PASSED"
```

---

## 🚀 Próximos Passos: Fase 5

| Fase | O que | Quando |
|------|-------|--------|
| **Fase 4 (Agora)** | Validação em Scripts | ⏳ PLANEJADO |
| **Fase 5** | Subreports/Charts/Crosstabs | → Depois |

**Phase 5 Tasks**:
- [ ] Placeholder detection em extract-style-blueprint-from-jrxml.js
- [ ] Component dimension preservation
- [ ] Validation para evitar query inheritance from complex components
- [ ] Exemplos com subreports/charts

---

## 📦 Arquivos a Modificar

| Arquivo | O que Mudar |
|---------|------------|
| `scripts/validate.js` | Adicionar flag e lógica de contaminação |
| `scripts/compile.js` | Adicionar rastreabilidade styleSource |
| `.github/copilot-instructions.md` | Passos 3.5, 4 adicionados |

---

## ⏱️ Timeline Estimado

| Tarefa | Tempo Estimado |
|--------|--------|
| Tarefa 1: Evolua validate.js | 45 min |
| Tarefa 2: Evolua compile.js | 45 min |
| Tarefa 3: Integração define fluxo | 15 min |
| Tarefa 4: Atualizar copilot-instructions.md | 15 min |
| **Testes End-to-End** | 30 min |
| **Total** | ~2.5h |

---

## ✅ Conclusão pré-Implementação

Fase 4 adicionará **validação automática** e **rastreabilidade completa** ao pipeline:

1. ✅ Detectar semantic contamination (dados herdados de modelo)
2. ✅ Rastrear origem de estilo em metadata
3. ✅ Fail-safe: se contaminação, rejeitar automaticamente
4. ✅ Auditoria: cada relatório tem registro de qual modelo foi usado

**Pronto para Implementação**: Sim — plano claro, tarefas bem-definidas.

---

Assinado: GitHub Copilot  
Data: 30 de Março de 2026  

**Status**: Ready para início de Fase 4
