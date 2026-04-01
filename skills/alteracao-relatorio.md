# 🔧 SKILL: Alteração Segura de Relatório Pós-Criação

**Objetivo:** Permitir que time de deploy altere relatórios já criados SEM quebrar setup global ou violar compatibilidade JasperReports 6.2.0.

**Referência:** [GUIA-CREATE-JASPER-REPORTS.md - Seção 10](../docs/GUIA-CREATE-JASPER-REPORTS.md#-10-como-modificar-um-report-depois-de-criado-sem-quebrar-setup)

---

## 🎯 Tipos de Alteração Permitida

### ✅ TIPO 1: ALTERAÇÃO DE REGRA (Dados/Filtros/Campos)

**Quando usar:** Você quer mudar os DADOS que o relatório exibe (campos, filtros, agregações, SQL).

#### Escopo Permitido (PODE FAZER)

```
✅ Adicionar/remover campos (validar em rules/views.json)
✅ Adicionar/remover filtros (parametrizado com $P{...})
✅ Mudar view (se nova view existe em rules/views.json)
✅ Mudar SQL (respeitando $P{...} syntax, sem SELECT *)
✅ Mudar agregações (SUM, COUNT, AVG - via <variable>)
✅ Mudar relacionamento master/detail (se novo relacionamento existe em rules/views.json.relationships)
✅ Alterar SOMENTE arquivo(s) em output/<NOME_RELATORIO>/
```

#### Escopo Proibido (NÃO PODE FAZER)

```
❌ Alterar tipos de campos sem validação em rules/views.json
❌ Remover bandas obrigatórias (title, columnHeader, detail, pageFooter)
❌ Usar atributos JasperReports 6.3+ (uuid, kind, splitType, etc.)
❌ Usar SELECT *
❌ Hardcoded valores em filtros (sempre $P{...})
❌ Alterar arquivos fora de output/<NOME_RELATORIO>/
❌ Alterar rules/views.json, scripts/, setup/, ou dependências
❌ Mudar compatibilidade JasperReports (sempre 6.2.0)
```

#### ✅ CHECKLIST PRÉ-ALTERAÇÃO (TIPO REGRA)

- [ ] Identificar arquivo alvo: `output/<NOME>/relatorio.jrxml` (SIMPLE) ou `output/<NOME>/master.jrxml + detail.jrxml` (MASTER_DETAIL)
- [ ] Nova view (se mudar): existe em `rules/views.json`?
- [ ] Novos campos (se adicionar): existem em `validFields` da view?
- [ ] Tipos de campos: conferem com tipos em `rules/views.json`?
- [ ] Novos filtros: têm tipo correto? (DATE, INT, DECIMAL, STRING)
- [ ] Novo relacionamento (se master/detail): existe em `rules/views.json.relationships`?
- [ ] Cardinalidade (se relacionamento): é sempre 1:N?
- [ ] Nenhum arquivo FORA de `output/<NOME>/` será alterado?
- [ ] Compatibilidade JasperReports: mantém 6.2.0 (nenhum uuid, kind, splitType)?

#### ✅ CHECKLIST PÓS-ALTERAÇÃO (TIPO REGRA)

Depois de fazer a alteração:

1. **Validação XML/SQL:**
   ```bash
   node scripts/validate.js output/<NOME>/relatorio.jrxml
   # Esperado: exit code 0 (sem erro)
   ```

2. **Compilação com PDF:**
   ```bash
   node scripts/compile.js output/<NOME>/relatorio.jrxml --pdf
   # Esperado: .jasper, .pdf, .log, metadata.json gerados
   ```

3. **Verificação de PDF:**
   - [ ] PDF gerado com tamanho > 1KB
   - [ ] PDF tem dados (não vazio)
   - [ ] Log sem `ERROR`
   - [ ] Dados fazem sentido (novos campos aparecem, filtros funcionam)

4. **Confirmação Final:**
   - [ ] Nenhum arquivo fora de `output/<NOME>/` foi alterado
   - [ ] Todos os artefatos esperados presentes (.jrxml, .jasper, .pdf, .log, metadata.json)
   - [ ] Pronto para deployment

---

### ✅ TIPO 2: ALTERAÇÃO VISUAL (Layout/Fonts/Cores)

**Quando usar:** Você quer mudar APENAS a APARÊNCIA do relatório (cores, fonts, margens, layout) SEM alterar dados.

#### Escopo Permitido (PODE FAZER)

```
✅ Mudar cores de texto/background
✅ Mudar fonts (APENAS DejaVu Sans/Serif/Mono)
✅ Mudar tamanho de banda (altura)
✅ Ajustar margens de página
✅ Reorganizar posição de campos (x, y)
✅ Mudar alinhamento de texto
✅ Mudar espaçamento entre elementos
✅ Alterar cabeçalho/rodapé (visual apenas)
✅ Alterar SOMENTE arquivo(s) em output/<NOME_RELATORIO>/
```

#### Escopo Proibido (NÃO PODE FAZER)

```
❌ Alterar view ou nome da view
❌ Adicionar/remover campos (mudaria <field>)
❌ Mudar SQL (<queryString>)
❌ Adicionar/remover parâmetros
❌ Adicionar subreport (transformaria SIMPLE em MASTER_DETAIL)
❌ Mudar tipos de campos
❌ Usar fonts não-padrão
❌ Alterar cálculos ou agregações
❌ Alterar arquivos fora de output/<NOME_RELATORIO>/
❌ Alterar qualquer coisa que afete dados
```

#### ✅ CHECKLIST PRÉ-ALTERAÇÃO (TIPO VISUAL)

- [ ] Identificar arquivo alvo: `output/<NOME>/relatorio.jrxml` (SIMPLE) ou `output/<NOME>/master.jrxml + detail.jrxml` (MASTER_DETAIL)
- [ ] Listar EXATAMENTE quais ajustes visuais serão feitos (cores, fonts, dimensões)
- [ ] Confirmar que NENHUMA mudança de dados será feita
- [ ] Nenhum arquivo FORA de `output/<NOME>/` será alterado?
- [ ] Compatibilidade JasperReports: mantém 6.2.0?

#### ✅ CHECKLIST PÓS-ALTERAÇÃO (TIPO VISUAL)

Depois de fazer a alteração:

1. **Validação XML:**
   ```bash
   node scripts/validate.js output/<NOME>/relatorio.jrxml
   # Esperado: exit code 0 (sem erro)
   ```

2. **Compilação com PDF:**
   ```bash
   node scripts/compile.js output/<NOME>/relatorio.jrxml --pdf
   # Esperado: .jasper, .pdf, .log, metadata.json gerados
   ```

3. **Verificação Visual:**
   - [ ] PDF gerado com tamanho > 1KB
   - [ ] Layout está correto (cores, fonts, alinhamento como esperado)
   - [ ] Log sem `ERROR`
   - [ ] **Dados EXATAMENTE IGUAIS** (nenhuma mudança de campos ou valores)
   - [ ] Fonts renderizam corretamente (DejaVu Sans)

4. **Confirmação Final:**
   - [ ] Nenhum arquivo fora de `output/<NOME>/` foi alterado
   - [ ] Nenhuma mudança foi feita na regra de dados (SQL, fields, parâmetros)
   - [ ] Todos os artefatos esperados presentes (.jrxml, .jasper, .pdf, .log, metadata.json)
   - [ ] Pronto para deployment

---

## 📋 Universål - Validação Obrigatória (Ambos os Tipos)

**Você SEMPRE deve fazer isso ao fim (TIPO REGRA ou VISUAL):**

| Passo | Comando | Saída Esperada | Saída de Erro |
|-------|---------|----------------|---------------|
| 1. Validação | `node scripts/validate.js output/<NOME>/{arquivo}.jrxml` | `exit code 0` | `exit code 1` → PARAR e corrigir |
| 2. Compilação | `node scripts/compile.js output/<NOME>/{arquivo}.jrxml --pdf` | `.jasper`, `.pdf`, `.log`, `metadata.json` | Arquivo faltando → PARAR |
| 3. PDF Size | Abrir `.pdf` gerado | > 1KB, com dados visíveis | < 1KB ou branco → Revisar filtros/tipos |
| 4. Log Check | Ler `.log` gerado | Sem `ERROR` | `ERROR` encontrado → PARAR e corrigir |

**Se qualquer passo falhar: PARAR, CORRIGIR, e REPETIR do passo 1.**

---

## 🔗 MASTER_DETAIL - Alteração com Detalhe

Se alterando relatório MASTER_DETAIL (master.jrxml + detail.jrxml):

### Validação master e detail:

```bash
node scripts/validate.js output/<NOME>/master.jrxml
node scripts/validate.js output/<NOME>/detail.jrxml
```

Ambos devem sair com `exit code 0`.

### Compilação com relacionamento:

```bash
node scripts/compile.js output/<NOME>/master.jrxml \
  --detail output/<NOME>/detail.jrxml \
  --relationship <relationshipKey> \
  --pdf
```

Onde `<relationshipKey>` é o nome exato do relacionamento em `rules/views.json.relationships`.

### Verificação pós-compilação:

- [ ] `master.jasper` gerado
- [ ] `detail.jasper` gerado
- [ ] `master.pdf` gerado com dados do master E detail aninhado
- [ ] `master.log` sem `ERROR`
- [ ] `metadata.json` com `reportTopology.type = MASTER_DETAIL`

---

## 📝 Exemplos de Alteração (TIPO REGRA)

### Exemplo 1: Adicionar Filtro Opcional

**Relatório:** VENDAS_DIARIAS_POR_VENDEDOR (SIMPLE)

**Objetivo:** Adicionar filtro opcional `categoria` (STRING)

**Passos:**
1. Editar `output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml`
2. Adicionar parâmetro no header:
   ```xml
   <parameter name="categoria" class="java.lang.String"/>
   ```
3. Adicionar ao WHERE da query:
   ```sql
   AND (categoria = $P{categoria} OR $P{categoria} IS NULL)
   ```
4. Validar: `node scripts/validate.js output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml`
5. Compilar: `node scripts/compile.js output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml --pdf`
6. Verificar PDF: deve exibir dados completos (categoria não filtrada) ou categorizados (se filtro aplicado)

### Exemplo 2: Adicionar Novo Campo

**Relatório:** VENDAS_DIARIAS_POR_VENDEDOR (SIMPLE)

**Objetivo:** Adicionar coluna `item_codigo` (novo campo)

**Passos:**
1. Validar em `rules/views.json`: campo `item_codigo` existe em `view_vendas_diarias.validFields`? ✅ Sim
2. Editar `output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml`
3. Adicionar field no header:
   ```xml
   <field name="item_codigo" class="java.lang.String"/>
   ```
4. Adicionar coluna na detail band (com textField renderizando `$F{item_codigo}`)
5. Validar: `node scripts/validate.js output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml`
6. Compilar: `node scripts/compile.js output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml --pdf`
7. Verificar PDF: nova coluna item_codigo deve aparecer com dados

---

## 📝 Exemplos de Alteração (TIPO VISUAL)

### Exemplo 1: Aumentar Largura de Coluna e Centralizar

**Relatório:** VENDAS_DIARIAS_POR_VENDEDOR (SIMPLE)

**Objetivo:** Aumentar coluna `item_nome` de 100px → 150px, centralizar quantidade

**Passos:**
1. Editar `output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml`
2. Localizar `<reportElement>` para coluna item_nome (detail band)
3. Alterar `width="100"` → `width="150"`
4. Localizar `<textField>` para quantidade
5. Alterar `<textAlignment>` para `Center`
6. Validar: `node scripts/validate.js output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml`
7. Compilar: `node scripts/compile.js output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml --pdf`
8. Verificar PDF: coluna item_nome mais larga, quantidade centralizada, dados iguais

### Exemplo 2: Mudar Cores do Cabeçalho

**Relatório:** VENDAS_DIARIAS_POR_VENDEDOR (SIMPLE)

**Objetivo:** Cabeçalho com fundo cinza claro, texto em branco

**Passos:**
1. Editar `output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml`
2. Localizar `<columnHeader>` band
3. Em cada `<reportElement>` de cabeçalho, alterar:
   - Fundo: `<staticText>... <box><topPen.../></box> </staticText>` → adicionar `<backcolor code="#E8E8E8"/>`
   - Texto: `<textElement>...<font .../><forecolor code="#FFFFFF"/></textElement>`
4. Validar: `node scripts/validate.js output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml`
5. Compilar: `node scripts/compile.js output/VENDAS_DIARIAS_POR_VENDEDOR/relatorio.jrxml --pdf`
6. Verificar PDF: cabeçalho com fundo cinza e texto branco, dados iguais

---

## 🛑 SOS: Erros Comuns na Alteração

| Erro | Causa | Solução |
|------|-------|--------|
| `exit code 1` em validate.js | XML malformado, campo inexistente, ou tipo errado | Verificar campo em rules/views.json, validar CDATA, confirmar tipos |
| PDF vazio (~1KB) | Filtro muito restritivo ou tipo de campo errado | Remover filtro, permitir NULL, validar tipos em rules/views.json |
| `ERROR` no .log | Tipo de campo mismatch (ex.: String vs Integer) | Alterar `<field class>` no JRXML ou tipo no rules/views.json (se autorizado) |
| `ERROR` no compile.js | Arquivo .jrxml ou dependency missing | Confirmar caminho correto, revalidar JRXML |
| Font não renderiza | Usou Arial/Helvetica em vez de DejaVu | Trocar font para DejaVu Sans |
| Arquivo alterado fora de `output/<NOME>/` | Acidente ou confusão de escopo | PARAR, desfazer, alterar SOMENTE em `output/<NOME>/` |

---

## 📚 Referências

- **Guia Principal:** [GUIA-CREATE-JASPER-REPORTS.md#10-como-modificar-um-report-depois-de-criado-sem-quebrar-setup](../docs/GUIA-CREATE-JASPER-REPORTS.md)
- **Rules de Dados:** [rules/views.json](../rules/views.json)
- **Compatibilidade JasperReports 6.2.0:** [.github/copilot-instructions.md#🔒-compatibilidade-jrxml-com-jasperreports-62-0](.github/copilot-instructions.md)
- **Exemplos de Relatórios:** [examples/](../examples/)

---

**Versão:** 1.0  
**Fase:** CAMADA 3 - SKILLS/PROMPTS  
**Atualização:** Abril 2026
