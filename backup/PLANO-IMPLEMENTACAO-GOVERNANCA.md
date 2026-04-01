# PLANO DE IMPLEMENTAÇÃO: MATRIZ DE GOVERNANÇA PARA BLINDAGEM DO SETUP

**Data:** 1º de Abril de 2026  
**Objetivo:** Mover validações críticas do guia para camadas de enforço (instructions, rules, skill, script) para blindar setup contra erros de usuário leigo.

---

## EXECUTIVO

O guia [docs/GUIA-CREATE-JASPER-REPORTS.md](docs/GUIA-CREATE-JASPER-REPORTS.md) contém regras operacionais que hoje são apenas **recomendações de leitura**. Para blindar setup, essas regras precisam ser **enforçadas automaticamente** nas 4 camadas:

1. **Instructions** (.github/copilot-instructions.md) → Contexto de prompt global
2. **Rules** (rules/views.json) → Contrato de dados obrigatório
3. **Skills/Prompts** (prompts/) → Fluxo operacional estruturado
4. **Scripts** (scripts/validate.js, compile.js) → Bloqueio definitivo (exit code 1 se falhar)

---

## MATRIZ DE GOVERNANÇA: REGRA POR REGRA

### SEÇÃO 1: FLUXO OBRIGATÓRIO (FAIL-SAFE)

**Regra:** "Sempre siga esta ordem: 1) Validar view/campos, 2) Gerar JRXML, 3) Validar XML/SQL, 4) Compilar, 5) Conferir artefatos"

| Regra | Descrição | Camada Alvo | Ação | Prioridade |
|-------|-----------|-------------|-------|-----------|
| 1.1 | Parar e corrigir se qualquer etapa falhar antes de prosseguir | **Instructions** | Adcionar bloqueio: "NUNCA prosseguir adiante sem validacao/compilacao bem-sucedida. Exit code != 0 = parada obrigatória." | CRÍTICA |
| 1.2 | Validação de view/campos obrigatória antes de gerar | **Rules** (views.json) | Manter validFields atualizado; reforçar que omissão de campo = erro fatal | CRÍTICA |
| 1.3 | Geração sempre com $P{...} (sem hardcode de filtro) | **Instructions** | Adicionar regra: "SELECT deve usar $P{paramName} para TODOS os filtros. SELECT * é proibido." | CRÍTICA |
| 1.4 | Validar XML/SQL com validate.js | **Scripts** (validate.js) | Já existe; reforçar exit code 1 se falhar + mensagens de erro claras | MÉDIA |
| 1.5 | Compilar com --pdf e verificar PDF não vazio | **Scripts** (compile.js) | Adicionar detecção automática: falhar se PDF < 1KB ou log com ERROR | CRÍTICA |

---

### SEÇÃO 2: REGRAS DE CAMPOS E TIPOS

**Regra:** "Sempre informar view e campos explícitos. Tipo do filtro confere com tipo do campo da view (STRING vs INT)"

| Regra | Descrição | Camada Alvo | Ação | Prioridade |
|-------|-----------|-------------|-------|-----------|
| 2.1 | Campo não pode ser vazio ou genérico | **Rules** (views.json) | Manter validFields com type exato (DATE, VARCHAR(N), INT, DECIMAL) | CRÍTICA |
| 2.2 | Filtro STRING nunca pode filtrar campo INT e vice-versa | **Rules** (views.json) + **Scripts** (validate.js) | Adicionar regra em validate.js: conferir type de field vs type de parameter no JRXML | CRÍTICA |
| 2.3 | SELECT explícito (nunca SELECT *) | **Instructions** + **Scripts** (validate.js) | Adicionar regra: fail se SELECT * detectado em JRXML | CRÍTICA |

---

### SEÇÃO 3: MODO SIMPLE

**Regra:** "Use SIMPLE quando houver 1 query e sem subreport"

| Regra | Descrição | Camada Alvo | Ação | Prioridade |
|-------|-----------|-------------|-------|-----------|
| 3.1 | Prompt SIMPLE obrigatório com campos exatos conforme template | **Skills** (prompts/relatorio-simples.prompt.md) | Já existe; adicionar checklist pré-envio validando todos os campos obrigatórios | MÉDIA |
| 3.2 | Exemplo de prompt SIMPLE validado contra rules/views.json | **Rules** + **Skills** | Usar exemplo VENDAS_DIARIAS_POR_VENDEDOR; adicionar nota: "Exemplo verificado contra rules/views.json" | MÉDIA |
| 3.3 | Artefatos esperados (5 arquivos) devem existir após compile | **Scripts** (compile.js) | Adicionar verificação: fail se algum dos 5 artefatos está faltando (jrxml, jasper, pdf, log, metadata.json) | MÉDIA |

---

### SEÇÃO 4: MODO MASTER_DETAIL

**Regra:** "Use MASTER_DETAIL quando houver relação pai-filho (1:N). Sempre informar chave de relação e cardinalidade 1:N"

| Regra | Descrição | Camada Alvo | Ação | Prioridade |
|-------|-----------|-------------|-------|-----------|
| 4.1 | Relacionamento DEVE existir em rules/views.json.relationships | **Rules** (views.json) | Já existe (vendedores_vendas); adicionar campo obrigatório "validationRequired": true para cada relação usável | CRÍTICA |
| 4.2 | Cardinalidade obrigatoria 1:N (nunca N:N ou 1:1 em md) | **Rules** (views.json) | Reforçar em cada relação: "cardinality": "1:N" é obrigatório; validate.js deve falhar se diferente | CRÍTICA |
| 4.3 | Chaves master e detail devem existir em ambas as views | **Scripts** (validate.js) | Adicionar validação: conferir se localKey existe em masterView e foreignKey existe em detailView | CRÍTICA |
| 4.4 | Tipos das chaves master/detail DEVEM coincidir | **Scripts** (validate.js) | Adicionar validação: master.vendedor_id (INT) == detail.vendedor_id (INT); falhar se tipos diferentes | CRÍTICA |
| 4.5 | Prompt MASTER_DETAIL obrigatório com --relationship flag | **Skills** (prompts/relatorio-master-detail.prompt.md) | Já existe; adicionar obrigatoriedade de informar relationship key durante compile | MÉDIA |
| 4.6 | Artefatos esperados (7 arquivos) MASTER_DETAIL | **Scripts** (compile.js) | Adicionar verificação: fail se algum dos 7 artefatos faltando (master/detail .jrxml, .jasper, master.pdf, .log, metadata.json) | MÉDIA |

---

### SEÇÃO 5: REGRAS DE ESCOPO E NÃO ALTERAÇÃO

**Regra:** "Não alterar scripts, setup, dependências, rules/views.json sem autorização. Alterar somente relatório alvo"

| Regra | Descrição | Camada Alvo | Ação | Prioridade |
|-------|-----------|-------------|-------|-----------|
| 5.1 | Bloqueio global: jamais alterar scripts, setup, runner sem autorização | **Instructions** | Adicionar regra obrigatória: "Nunca gere código para package.json, compile.js, validate.js, scripts/ ou pom.xml" | CRÍTICA |
| 5.2 | Bloqueio global: jamais alterar rules/views.json sem autorização | **Instructions** | Adicionar regra obrigatória: "Se usuário pedir para alterar rules/views.json, PARAR e pedir autorização explícita" | CRÍTICA |
| 5.3 | Escopo de alteração pós-criação: somente output/<nome>/ | **Skills** (prompts de alteração em GUIA seção 10) | Reforçar em prompt de alteração: "Somente arquivos JRXML do relatório alvo serão alterados" | MÉDIA |
| 5.4 | Relatório alterado deve ser validado e compilado obrigatoriamente | **Instructions** + **Scripts** | Adicionar em instructions: "Pós-alteração, executar validate.js + compile.js --pdf obrigatoriamente" | CRÍTICA |

---

### SEÇÃO 6: REGRAS DE COMPATIBILIDADE JRXML

**Regra:** "Manter compatibilidade JasperReports 6.2.0. Não usar atributos modernos (uuid, kind, splitType)"

| Regra | Descrição | Camada Alvo | Ação | Prioridade |
|-------|-----------|-------------|-------|-----------|
| 6.1 | JRXML deve ser compatível com JasperReports 6.2.0 | **Instructions** | Adicionar: "Jamais use atributos uuid, kind, splitType (versões > 6.2.0)" | CRÍTICA |
| 6.2 | 4 bandas obrigatórias: title, columnHeader, detail, pageFooter | **Scripts** (validate.js) | Adicionar validação: fail se alguma banda obrigatória falta em SIMPLE ou detail | MÉDIA |
| 6.3 | Fonts seguras para PDF (DejaVu Sans/Serif apenas) | **Instructions** | Reforçar: "NUNCA use Arial, Helvetica, Courier. Apenas DejaVu Sans, DejaVu Serif" | MÉDIA |
| 6.4 | SELECT deve estar em CDATA e bem-formado | **Scripts** (validate.js) | Adicionar detecção: fail se SELECT estar fora de <![CDATA[...]]> ou malformado | MÉDIA |

---

### SEÇÃO 7: VALIDAÇÃO DE ARTEFATOS FINAIS

**Regra:** "PDF não está vazio, log sem ERROR, metadata presente. Se PDF < 1KB, revisar"

| Regra | Descrição | Camada Alvo | Ação | Prioridade |
|-------|-----------|-------------|-------|-----------|
| 7.1 | PDF deve ter tamanho > 1KB (aproximação prática) | **Scripts** (compile.js) | Adicionar aviso/erro se PDF < 1KB + sugestões (revisão de filtros, tipos) | CRÍTICA |
| 7.2 | Log não deve conter "ERROR" | **Scripts** (compile.js) | Parse do .log; fail se "ERROR" encontrado; WARN é tolerável | CRÍTICA |
| 7.3 | metadata.json obrigatório com timestamp, datasource, topology | **Scripts** (compile.js) | Verificar: metadata.json existe, tem timestamp e campos mínimos (reportTopology, diagnostics) | MÉDIA |
| 7.4 | Checklist pós-geração automático | **Scripts** (compile.js) | Ao final, imprimir summary: "✓ JRXML válido, ✓ PDF gerado, ✓ Log sem ERROR, ✓ Metadata presente" | MÉDIA |

---

### SEÇÃO 8: REGRAS DE ALTERAÇÃO PÓS-CRIAÇÃO

**Regra:** "Para alteração segura: regra ou visual. Parar em erro. Não alterar setup"

| Regra | Descrição | Camada Alvo | Ação | Prioridade |
|-------|-----------|-------------|-------|-----------|
| 8.1 | Prompt de alteração de REGRA deve pedir escopo explícito (view, campo, filtro, relação) | **Skills** (GUIA seção 10.2) | Já existe; reforçar em instructions que deve ser seguido **ipsis litteris** | MÉDIA |
| 8.2 | Prompt de alteração VISUAL deve bloquear query/fields/parametros | **Instructions** | Adicionar regra: "Se alteração é VISUAL, jamais permitir mudanças em SELECT, fields ou parâmetros" | CRÍTICA |
| 8.3 | Alteração requer validação + compilação obrigatória | **Scripts** (compile.js) | Verificar pós-alteração; se falhar, parar e exibir erro com sugestão | CRÍTICA |
| 8.4 | Confirmação explícita que nenhum arquivo fora do escopo foi alterado | **Instructions** | Adicionar obrigatoriedade: "Sempre confirmar que apenas output/<nome>/*.jrxml foram tocados" | MÉDIA |

---

## MAPEAMENTO POR CAMADA

### CAMADA 1: INSTRUCTIONS (.github/copilot-instructions.md)

**O que adicionar:**

1. **Bloqueios globais:**
   ```
   ❌ Nunca altere: scripts/, setup, package.json, pom.xml, JasperRunner.java, compile.js, validate.js
   ❌ Nunca altere: rules/views.json sem autorização explícita
   ❌ Nunca use: SELECT *, atributos uuid/kind/splitType, fonts Arial/Helvetica
   ✅ Sempre pare em erro (exit code != 0) antes de prosseguir
   ✅ Sempre execute validate.js + compile.js --pdf pós-geração ou alteração
   ```

2. **Regras de compatibilidade:**
   ```
   ✅ JasperReports 6.2.0 ONLY
   ✅ 4 bandas: title, columnHeader, detail, pageFooter
   ✅ Fonts: DejaVu Sans/Serif
   ✅ Parâmetros $P{...} para TODOS os filtros
   ```

3. **Regras de modo:**
   ```
   ✅ SIMPLE: 1 query sem subreport
   ✅ MASTER_DETAIL: deve ter relacionamento válido em rules/views.json com cardinalidade 1:N
   ✅ Chaves master/detail devem ter MESMOS tipos (INT=INT, VARCHAR=VARCHAR)
   ```

4. **Regras de alteração:**
   ```
   ✅ Se alteração é REGRA: pode mudar view, campos, filtros, SQL
   ✅ Se alteração é VISUAL: JAMAIS mudar view, campos, filtros, SQL
   ✅ Sempre rodar validate.js + compile.js --pdf pós-alteração
   ✅ Confirmar explicitamente que SOMENTE output/<nome>/*.jrxml foram tocados
   ```

---

### CAMADA 2: RULES (rules/views.json)

**O que adicionar/reforçar:**

1. **Cada view deve ter:**
   ```json
   "validFields": [
     {
       "name": "campo",
       "type": "DATE|INT|DECIMAL|VARCHAR(N)",
       "isKey": true|false,
       "sortable": true|false,
       "filterable": true|false,
       "aggregatable": true|false
     }
   ]
   ```

2. **Cada relacionamento MASTER_DETAIL deve ter:**
   ```json
   "relationships": {
     "vendedores_vendas": {
       "masterView": "view_vendas_diarias",
       "detailView": "view_vendas_diarias",
       "relationship": {
         "localKey": "vendedor_id",
         "foreignKey": "vendedor_id",
         "cardinality": "1:N"  // ← OBRIGATÓRIO
       }
     }
   }
   ```

3. **Adicionar campo obrigatório:**
   ```json
   "validationRequired": true  // ← bloqueio: relação não pode ser usada sem validação
   ```

---

### CAMADA 3: SKILLS/PROMPTS (prompts/)

**O que reforçar/estruturar:**

1. **prompts/relatorio-simples.prompt.md**
   - Adicionar checklist pré-preenchimento:
     ```
     ☐ Nome único, sem espaços, UPPERCASE_WITH_UNDERSCORES
     ☐ View existe em rules/views.json? (copiar nome exatamente)
     ☐ Campos existem em view? (validar em validFields)
     ☐ Filtros têm tipo correto? (DATE, INT, STRING, DECIMAL)
     ☐ Tipo filtro confere com tipo do campo? (STRING com VARCHAR, INT com INT)
     ```

2. **prompts/relatorio-master-detail.prompt.md**
   - Adicionar checklist pré-preenchimento:
     ```
     ☐ View master existe em rules/views.json?
     ☐ View detail existe em rules/views.json?
     ☐ Relacionamento (masterView, detailView) existe em rules/views.json.relationships?
     ☐ Cardinalidade é 1:N?
     ☐ Chave master (ex: vendedor_id) existe em AMBAS as views?
     ☐ Tipos das chaves coincidem? (INT=INT, VARCHAR=VARCHAR)
     ```

3. **skill: alteracao-relatorio.md** (NOVO)
   - Skill dedicado para alterações pós-criação
   - 2 variantes: REGRA e VISUAL
   - Checklist de validação pós-alteração

---

### CAMADA 4: SCRIPTS (validate.js, compile.js)

**Validações a adicionar em validate.js:**

1. **Validação de campos:**
   ```javascript
   // Conferir se all fields declarados existem em view
   // Conferir se types dos fields coincidem com validFields da view
   // Fail se mismatch
   ```

2. **Validação de filtros:**
   ```javascript
   // Conferir se all parameters $P{...} têm type declarado (date, int, string, decimal)
   // Fail se parameter não declarado em header
   ```

3. **Validação de SQL:**
   ```javascript
   // Detectar SELECT * → FAIL
   // Detectar hardcoded filter values → WARN
   // Conferir CDATA bem-formado
   ```

4. **Validação de compatibilidade:**
   ```javascript
   // Detectar atributos uuid, kind, splitType → FAIL (6.2.0 incompatível)
   // Conferir 4 bandas presentes em SIMPLE e detail
   ```

5. **Validação de MASTER_DETAIL (novo):**
   ```javascript
   // Se detectar <subreport>:
   //   - Conferir se masterView e detailView existem em rules/views.json
   //   - Conferir se relacionamento existe em relationships
   //   - Conferir se cardinality = "1:N"
   //   - Conferir se localKey == foreignKey em types (INT=INT, etc.)
   //   - FAIL se alguma validação falhar
   ```

**Validações a adicionar em compile.js:**

1. **Pós-compilação PDF:**
   ```javascript
   // Conferir se PDF foi gerado
   // Conferir tamanho: if file.size < 1024 bytes → WARN + sugestões
   // Parse .log: if "ERROR" encontrado → FAIL
   ```

2. **Artefatos finais:**
   ```javascript
   // SIMPLE: verificar jrxml, jasper, pdf, log, metadata.json existem → FAIL se faltando
   // MASTER_DETAIL: verificar master/detail jrxml, master/detail jasper, master.pdf, log, metadata.json → FAIL se faltando
   ```

3. **Metadata checks:**
   ```javascript
   // Verificar metadata.json é válido JSON
   // Verificar tem timestamp, reportTopology, diagnostics
   // Print summary: "✓ Gerado com sucesso" com lista de artefatos
   ```

---

## CRONOGRAMA DE IMPLEMENTAÇÃO

| Fase | Camada | Item | Esforço | Prazo |
|------|--------|------|---------|-------|
| 1 | Instructions | Adicionar bloqueios globais + regras de compatibilidade | 1h | Semana 1 |
| 2 | Rules | Reforçar validFields + adicionar validationRequired em relationships | 30min | Semana 1 |
| 3 | Scripts (validate.js) | Adicionar validações de campo, filtro, SQL, compatibilidade, master/detail | 3h | Semana 1-2 |
| 4 | Scripts (compile.js) | Adicionar checks pós-compilação, artefatos, metadata | 2h | Semana 2 |
| 5 | Skills | Criar skill de alteração-relatorio.md com checklists | 1h | Semana 2 |
| **TOTAL** | **Todas** | **Matriz de governança implementada** | **7.5h** | **Semana 2** |

---

## CRITÉRIO DE SUCESSO

Após implementação:

✅ **Instructions:** Copilot sempre bloqueará pedido para alterar setup/scripts/rules.json  
✅ **Rules:** Cada view/relacionamento tem contrato explícito; omissão de campo = erro claro  
✅ **Scripts:** Qualquer JRXML inválido falha no validate.js com mensagem clara  
✅ **Scripts:** Pós-compile, PDF vazio ou log com ERROR causa fail e parada  
✅ **Skills:** Prompt de alteração garante escopo fechado (regra ou visual, mas não ambos)  

**Resultado:** Usuário leigo não consegue quebrar setup acidentalmente; qualquer tentativa é bloqueada com mensagem clara.

---

## NOTAS IMPORTANTES

1. **Não criar novo arquivo** enquanto implementação não iniciada. Este é plano apenas.
2. **Validações em scripts** (validate.js, compile.js) são o bloqueio **definitivo**; instructions/rules/skills são reforço.
3. **Exit code 1** em validate.js/compile.js é essencial; sem ele, usuário continua mesmo com erro.
4. **Mensagens de erro** devem ser claras, curtas e com sugestão de ação (ex.: "Campo 'xyz' não existe em view ABC. Verifique rules/views.json").

---

FIM DO PLANO.
