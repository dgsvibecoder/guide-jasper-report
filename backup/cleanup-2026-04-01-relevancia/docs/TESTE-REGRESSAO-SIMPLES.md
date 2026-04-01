# Casos de Teste de Regressão - Modo Simples (Fase 0)

Objetivo: Suite de testes de regressão para validar que Modo Simples permanece funcional após mudanças em fases futuras.

Execução esperada: Antes e depois de CADA fase (1-8).

Test Runner: Manual (via terminal) até Fase 8.

## 1. Smoke Test - Relatorio Simples Minimo

### Teste: SMOKE_SIMPLES_001

**Contexto:**
Validar que um relatório simples básico (sem filtros, sem modelo) compila e gera PDF.

**Entrada (prompt simplificado):**
```
Nome: SMOKE_TEST_SIMPLES_001
View: view_vendas_diarias
Campos: data, item_nome, valor_total
Filtros: nenhum
Layout: Tabela simples
```

**Passos:**
1. Criar arquivo JRXML com query simples (SELECT data, item_nome, valor_total FROM view_vendas_diarias)
2. Executar: `node scripts/validate.js output/SMOKE_TEST*/smoke_test.jrxml`
3. Executar: `node scripts/compile.js output/SMOKE_TEST*/smoke_test.jrxml --pdf`

**Resultado esperado:**
```
✅ XML bem-formado
✅ 0 parâmetros encontrados
✅ 4/4 bandas presentes
✅ VALIDAÇÃO SUCESSO
✅ Generated .jasper
✅ Generated .pdf
✅ Generated .log
✅ Generated metadata.json
```

**Critério de Aceite:** Exit code 0, PDF gerado com tamanho > 2KB

**Rollback:** Se falhar, Fase 0 BLOQUEADA

---

## 2. Smoke Test - Relatorio Simples com Filtros

### Teste: SMOKE_SIMPLES_002

**Contexto:**
Validar que parametros SQL são injetados corretamente.

**Entrada (prompt):**
```
Nome: SMOKE_TEST_SIMPLES_002
View: view_vendas_diarias
Campos: data, item_nome, valor_total
Filtros:
  - dataInicio: DATE
  - dataFim: DATE
```

**Passos:**
1. Gerar JRXML com parametros $P{dataInicio} e $P{dataFim}
2. Validar
3. Compilar com --pdf

**Resultado esperado:**
```
OK 2 parameters found
✅ VALIDAÇÃO SUCESSO
✅ PDF gerado com dados reais preenchidos
```

**Critério de Aceite:** Exit code 0, PDF mostra registros dentro do período

**Rollback:** Se falhar, Fase 0 BLOQUEADA

---

## 3. Teste - Validação de Tipos (SQL vs JRXML)

### Teste: SMOKE_SIMPLES_003

**Contexto:**
Validar que mismatch tipo SQL/JRXML é detectado (erro crítico evitado).

**Entrada (propositalmente incorreta):**
```
View: view_vendas_diarias
Campo: vendedor_id (INT na view)
JRXML declara: <field name="vendedor_id" class="java.lang.String"/>
```

**Passos:**
1. Gerar JRXML com field type errado propositalmente
2. Executar: `node scripts/validate.js output/ERROR_*/relatorio.jrxml rules/views.json`

**Resultado esperado:**
```
❌ Field type mismatch for 'vendedor_id': rules type 'INT' expects java.lang.Integer or java.lang.Long, but JRXML declares java.lang.String.
ERROR VALIDATION FAILED
```

Exit code: 2 (erro, nao 0)

**Critério de Aceite:** Validador rejeita e impede compilação

**Rollback:** Se não rejeitar corretamente, revisar rules/views.json

---

## 4. Teste - Contaminação Semantica de Modelo

### Teste: SMOKE_SIMPLES_004

**Contexto:**
Validar que modelo visual não contamina dados do novo relatório.

**Entrada:**
```
Criar arquivo modelo em /tmp/modelo-contaminated.jrxml com:
  - <field name="campo_x" class="...">
  - <parameter name="parametro_x" class="...">
  - Query real (não dummy)

Criar novo JRXML que herda campos/parâmetros do modelo
```

**Passos:**
1. Gerar novo JRXML copiando fields do modelo
2. Executar: `node scripts/validate.js output/NEW_*/novo.jrxml rules/views.json --check-model-contamination /tmp/modelo-contaminated.jrxml`

**Resultado esperado:**
```
🔴 [CRITICAL] fields: Target JRXML inherited all fields from model
❌ ERROR: Semantic data contamination detected!
```

Exit code: 1 (erro)

**Critério de Aceite:** Validador bloqueia contaminação

**Rollback:** Se não detectar, revisão crítica de lógica de validação

---

## 5. Teste - Estrutura de Metadata

### Teste: SMOKE_SIMPLES_005

**Contexto:**
Validar que metadata.json mantem estrutura esperada (baseline para mudanças futuras).

**Passos:**
1. Compilar relatorio simples
2. Verificar metadata.json contém:
   - reportName
   - generatedAt
   - compiledAt
   - outputs (jrxml, jasper, pdf, log)
   - checksums
   - jasper (version="JasperReports 6.2.0")
   - styleSource (type="nativa")
   - validation

**Critério de Aceite:** Metadata tem todas as chaves esperadas, sem mudanças de estrutura

**Rollback:** Se estrutura mudar, avaliar impacto em fases seguintes

---

## 6. Teste - PDF com Dados Reais

### Teste: SMOKE_SIMPLES_006

**Contexto:**
Validar que PDF gerado tem dados do banco (não vazio).

**Entrada:**
Relatorio com filtros opcionais (dataInicio=null, dataFim=null devem retornar alguns dados)

**Passos:**
1. Compilar com --pdf
2. Verificar tamanho de PDF > 2KB
3. Verificar no log: "pdf-with-data" gerado com sucesso
4. Abrir PDF e validar conteúdo (manual ou OCR)

**Resultado esperado:**
```
OK Generated pdf with data: [path].pdf
```

PDF contém tabela com dados, não branco.

**Critério de Aceite:** PDF visual com dados, exit code 0

**Rollback:** Se PDF vazio, investigar filtros e conexão BD

---

## 7. Teste - Bandas Obrigatorias

### Teste: SMOKE_SIMPLES_007

**Contexto:**
Validar que 4 bandas obrigatorias (title, columnHeader, detail, pageFooter) estão presentes.

**Entrada:**
JRXML com todas 4 bandas.

**Passos:**
1. Executar: `node scripts/validate.js [relatorio]`
2. Validar output: OK 4/4 key bands found

**Critério de Aceite:** Mensagem menciona 4/4 encontradas

**Rollback:** Se validador mudar contador de bandas, reavaliação necessária

---

## 8. Teste - Fonts DejaVu Sans

### Teste: SMOKE_SIMPLES_008

**Contexto:**
Validar que PDF renderiza corretamente com DejaVu Sans (Arial causa issues).

**Entrada:**
JRXML com fonts="DejaVu Sans"

**Passos:**
1. Compilar com --pdf
2. Abrir PDF e validar renderização de caracteres
3. Verificar se não há caracteres corrompidos

**Critério de Aceite:** PDF renderiza sem distorção, caracteres legíveis

**Rollback:** Se regressão de rendering, investigar font embedding

---

## 9. Teste - Compatibilidade SQL

### Teste: SMOKE_SIMPLES_009

**Contexto:**
Validar que SQL gerado é compatível com PostgreSQL 12+.

**Entrada:**
Query com WHERE 1=1, tipos de filtro validados, sem syntax modernos.

**Passos:**
1. Extrair query do JRXML
2. Verificar se valores parametrizados ($P{...}) são válidos em PostgreSQL
3. Validar que não há SELECT *
4. Executar no banco manualmente (opcional)

**Critério de Aceite:** Query executa sem erro, retorna resultados esperados

**Rollback:** Se SQL muda ou fica inválido, bloquear fase

---

## 10. Teste - Compilacao Incremental

### Teste: SMOKE_SIMPLES_010

**Contexto:**
Validar que compilação é idempotente (rodar 2x gera mesmo .jasper).

**Entrada:**
Relatorio simples com seed fixo.

**Passos:**
1. Compilar e coletar SHA256 do .jasper
2. Compilar novamente
3. Comparar SHA256

**Resultado esperado:**
Ambas compilações geram .jasper com mesmo hash (idempotente).

**Critério de Aceite:** Hashes idênticos

**Rollback:** Se hashes diferem, investigar timestamps/seed geração

---

## 11. Plano de Execução por Fase

### Fase 0 (Agora)

```bash
# Executar todos os testes acima manualmente
# Documentar status em BASELINE-MODO-SIMPLES.md
# Se todos passam: Fase 0 APPROVED
# Se algum falha: BLOCKED, revisar antes de prosseguir
```

### Fases 1-8

Antes de cada merge:

```bash
# Smoke tests rápidos (1, 2, 8)
node scripts/validate.js output/SMOKE_*/relatorio.jrxml
node scripts/compile.js output/SMOKE_*/relatorio.jrxml --pdf
```

Após cada fase completa:

```bash
# Suite completa (todos 11 testes)
# Podem ser automatizados com Jest ou similar em Fase 8
```

---

## 12. Criterio de Aceite Global

Fase 0 aprovada quando:

- ✅ Testes 1 e 2 passam (smoke básicos)
- ✅ Teste 3 rejeita tipo errado (validação funciona)
- ✅ Teste 4 detecta contaminação (segurança de modelo)
- ✅ Testes 5-10 confirmam estrutura esperada

Se qualquer teste falha: **Fase 0 BLOQUEADA**, não avançar para Fase 1.

---

## 13. Evidencias de Aprovaçao Fase 0

Documentar e anexar ao aprovar:

- [ ] Log terminal de execução de todos testes
- [ ] Screenshot de PDFs gerados (modo simples básico)
- [ ] Validação de metadata.json com todas chaves
- [ ] Checksums de baseline arquivos críticos
- [ ] Confirmação de nenhuma regressão em Modo Simples

Próxima ação: Executar testes, documentar, solicitar aprovação de Fase 0.
