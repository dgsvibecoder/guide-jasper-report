# 🆘 TROUBLESHOOTING: Guia de Resolução de Problemas

## 📋 Índice

1. [XML Errors](#xml-errors)
2. [SQL Errors](#sql-errors)
3. [Compilation Errors](#compilation-errors)
4. [PDF/Rendering Errors](#pdfrendering-errors)
5. [Performance Issues](#performance-issues)
6. [Common Mistakes](#common-mistakes)

---

## 🔴 XML ERRORS

### Erro: "XML Parse Error"

**Mensagem típica:**
```
XML malformado: Unexpected token < at position 123
```

**Causas comuns:**

1. **CDATA não fechado:**
   ```xml
   <!-- ❌ ERRADO -->
   <queryString>
     <![CDATA[
       SELECT * FROM view
   </queryString>
   
   <!-- ✅ CORRETO -->
   <queryString>
     <![CDATA[
       SELECT * FROM view
     ]]>
   </queryString>
   ```

2. **Caracteres especiais não escapados:**
   ```xml
   <!-- ❌ ERRADO -->
   <text>João & Maria > 10</text>
   
   <!-- ✅ CORRETO -->
   <text>João &amp; Maria &gt; 10</text>
   ```

3. **Aspas misturadas:**
   ```xml
   <!-- ❌ ERRADO -->
   <element attr="valor'>
   
   <!-- ✅ CORRETO -->
   <element attr="valor">
   ```

**Solução:**
- Abra `.jrxml` em VSCode
- Ative validação XML (extensão redhat.vscode-xml)
- Procure por squiggles (linhas vermelhas) e corrija

---

### Erro: "Element not closed"

**Mensagem:**
```
Expected '>' or '/>' but got 'EOF'
```

**Causa:** Tag aberta sem fecha.

**Solução:**
```bash
# Procure por tags abertas
grep -n "<title" output/*/relatorio.jrxml  # Aberta
grep -n "</title" output/*/relatorio.jrxml  # Fechada

# Devem ter mesmo número!
```

---

## 🔴 SQL ERRORS

### Erro: "View not found in rules/views.json"

**Mensagem:**
```
View 'view_vendas_old' não encontrada em rules/views.json
```

**Solução:**

1. Confirmar nome correto:
   ```bash
   # Cheque banco de dados
   SELECT table_name FROM information_schema.views WHERE table_name LIKE 'view%';
   ```

2. Adicionar à `rules/views.json`:
   ```json
   {
     "views": {
       "view_vendas_old": {
         "displayName": "Vendas Antigas",
         "validFields": [
           {"name": "data", "type": "DATE", ...},
           ...
         ]
       }
     }
   }
   ```

3. Re-executar Copilot

---

### Erro: "Field not in validFields"

**Mensagem:**
```
Campo 'descricao_completa' pode não existir em view 'view_vendas_diarias'
```

**Causas:**

1. Campo digitado errado:
   ```xml
   <!-- ❌ Campo não existe -->
   SELECT descricao_completa FROM view_vendas_diarias
   
   <!-- ✅ Nome correto -->
   SELECT descricao FROM view_vendas_diarias
   ```

2. Campo não foi adicionado a `rules/views.json`

**Solução:**

1. Verificar campo no BD:
   ```sql
   SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'view_vendas_diarias';
   ```

2. Adicionar em `rules/views.json`:
   ```json
   "validFields": [
     {
       "name": "descricao_completa",
       "type": "VARCHAR(500)",
       "label": "Descrição Completa",
       ...
     }
   ]
   ```

---

### Erro: "SELECT * não permitido"

**Mensagem:**
```
SELECT * detectado - use campos explícitos
```

**Causa:** Query usa `SELECT *`

**Solução:**

```sql
<!-- ❌ ERRADO -->
SELECT * FROM view_vendas_diarias

<!-- ✅ CORRETO -->
SELECT 
  data, 
  item_nome, 
  quantidade, 
  valor_total 
FROM view_vendas_diarias
```

---

### Erro: "Parâmetros não encontrados em WHERE"

**Mensagem:**
```
Parâmetros encontrados mas sem WHERE clause
```

**Causa:** Usa $P{xxx} mas não em WHERE

**Solução:**

```sql
<!-- ❌ ERRADO -->
SELECT $P{campo} FROM view_vendas

<!-- ✅ CORRETO -->
SELECT data, item_nome FROM view_vendas
WHERE 1=1 AND data >= $P{dataInicio}
```

---

## 🟠 COMPILATION ERRORS

### Erro: "Arquivo JRXML não encontrado"

**Mensagem:**
```
Arquivo JRXML não encontrado: /path/to/relatorio.jrxml
```

**Causa:** Copilot não criou arquivo ou path errado

**Solução:**

```bash
# Verificar se arquivo existe
ls -la output/*/relatorio.jrxml

# Se não existir, rodar:
node scripts/compile.js /absolute/path/to/arquivo.jrxml
```

---

### Erro: "Compilation failed with ERROR logs"

**Mensagem no `.log`:**
```
ERROR: [timestamp] Erro compilação: Unable to compile JasperReport
```

**Comuns:**

1. **Parâmetro sem class:**
   ```xml
   <!-- ❌ ERRADO -->
   <parameter name="dataInicio"/>
   
   <!-- ✅ CORRETO -->
   <parameter name="dataInicio" class="java.util.Date"/>
   ```

2. **Field sem class:**
   ```xml
   <!-- ❌ ERRADO -->
   <field name="data"/>
   
   <!-- ✅ CORRETO -->
   <field name="data" class="java.time.LocalDate"/>
   ```

3. **Type mismatch** - Tipo SQL ≠ Tipo Java:
   ```xml
   <!-- SQL: data DATE -->
   <!-- ✅ Java: java.time.LocalDate ou java.util.Date -->
   
   <!-- SQL: valor DECIMAL -->
   <!-- ✅ Java: java.math.BigDecimal -->
   
   <!-- SQL: quantidade INT -->
   <!-- ✅ Java: java.lang.Integer -->
   ```

**Solução:** Confira mapeamento em `rules/views.json`:
```json
"typeMapping": {
  "DATE": "java.time.LocalDate",
  "DECIMAL": "java.math.BigDecimal",
  ...
}
```

---

## 🟠 PDF/RENDERING ERRORS

### Erro: `Bad value for type int: HA1`

**Mensagem típica:**
```
Unable to get value for result set field "idazienda" of class java.lang.Integer
Caused by: Bad value for type int : HA1
```

**Causa:**
- O campo da view é alfanumérico (`VARCHAR`) mas o JRXML declarou `java.lang.Integer`.

**Solução (obrigatória):**
1. Ajustar `rules/views.json` com tipo real da coluna.
2. Ajustar `<field class>` no JRXML para `java.lang.String`.
3. Reexecutar:
```bash
node scripts/validate.js output/.../relatorio.jrxml
node scripts/compile.js output/.../relatorio.jrxml --pdf
```

---

### Erro: `operator does not exist: character varying = integer`

**Mensagem típica:**
```
ERROR: operator does not exist: character varying = integer
```

**Causa:**
- Filtro comparando tipos incompatíveis no WHERE (ex.: coluna `VARCHAR` vs parâmetro `INT`).

**Solução:**
```sql
-- ✅ padrão seguro para filtro opcional
AND ($P{idps} IS NULL OR CAST(idps AS VARCHAR) = $P{idps})
```

---

### Erro: PDF pequeno (~1KB) e em branco

**Sintoma:**
- `.pdf` existe, mas arquivo muito pequeno (aprox. 1KB) e sem dados visíveis.

**Checklist de correção:**
1. Verificar se compilação foi com dados reais (não datasource vazio)
2. Verificar se filtros de data estão restritivos demais
3. Verificar tipos dos `<field>` x tipos reais da view
4. Confirmar `.log` sem `ERROR`

**Padrão recomendado para filtros de data opcionais:**
```sql
AND ($P{data_inizio} IS NULL OR datainserimento >= $P{data_inizio})
AND ($P{data_fim} IS NULL OR datainserimento <= $P{data_fim})
```

---

### Erro: `FileNotFoundException ... .pdf (Permission denied)`

**Causa comum no Windows:**
- O PDF está aberto no visualizador e bloqueado para escrita.

**Solução:**
1. Fechar o visualizador de PDF.
2. Remover o arquivo antigo.
3. Reexecutar compile.

```bash
rm -f output/.../relatorio.pdf
node scripts/compile.js output/.../relatorio.jrxml --pdf
```

---

### Erro: "PDF não renderiza / fica em branco"

**Causa:** Geralmente font ou dimensões

**Soluções:**

1. **Trocar font:**
   ```xml
   <!-- ❌ Pode não estar disponível -->
   <font fontName="Arial" size="12"/>
   
   <!-- ✅ Padrão seguro -->
   <font fontName="DejaVu Sans" size="12"/>
   ```

2. **Verificar dimensões:**
   ```xml
   <!-- pageWidth: 595 = A4 portrait -->
   <!-- leftMargin + width + rightMargin <= 595 -->
   
   <jasperReport pageWidth="595" ...>
     <!-- Se campos totalizarem > 515 (595-40-40), trunaca -->
    <detail>
        <textField>
          <reportElement x="0" y="0" width="515" height="20"/>
        </textField>
      </detail>
    </jasperReport>
   ```

3. **Verificar tipos de field:**
   ```xml
   <!-- ❌ textField com valor número sem padrão -->
   <textField><textFieldExpression>$F{valor}</textFieldExpression></textField>
   
   <!-- ✅ Com padrão de formatação -->
   <textField pattern="#,##0.00">
     <textFieldExpression>$F{valor}</textFieldExpression>
   </textField>
   ```

---

### Erro: "PDF gerado mas com layout quebrado"

**Causa:** Espaço insuficiente ou misalignamento

**Solução - Recalcular dimensões:**

```xml
<!-- Total disponível: 595px (pageWidth) -->
<!-- Menos: 40px (left margin) + 40px (right margin) = 515px util -->

<!-- Se 5 colunas: 515 / 5 = 103px each -->
<columnHeader height="25">
  <staticText>
    <reportElement x="0" y="0" width="103" height="20"/>...</staticText>
  <staticText>
    <reportElement x="103" y="0" width="103" height="20"/>...</staticText>
  <!-- etc -->
</columnHeader>

<!-- Altura de banda:
     - title: 60px (cabeçalho)
     - columnHeader: 25px (nomes cols)
     - detail: 20px (dados)
     - pageFooter: 30px (rodapé)
-->
```

---

## 🟡 PERFORMANCE ISSUES

### Erro: "Script timeout - Query muito lenta"

**Mensagem:**
```
WARNING: Query duration > 30s, timeout applied
```

**Causa:** Query retorna muitos registros ou JOIN lento

**Solução:**

1. **Adicionar LIMIT:**
   ```sql
   SELECT data, item_nome, valor_total 
   FROM view_vendas_diarias
   WHERE 1=1 AND data >= $P{dataInicio}
   LIMIT 1000  -- Padrão safe
   ```

2. **Otimizar índices BD:**
   ```sql
   CREATE INDEX idx_vendas_data ON view_vendas_diarias(data);
   CREATE INDEX idx_vendas_vendedor ON view_vendas_diarias(vendedor_id);
   ```

3. **Filtrar mais:**
   ```sql
   WHERE 1=1 
     AND data >= $P{dataInicio}
     AND data <= $P{dataFim}  -- Reduz dataset
     AND vendedor_id = $P{vendedorId}  -- Ainda mais
   ```

---

## 🔴 COMMON MISTAKES

### ❌ Erro Clássico 1: Esquecer `$P{}`

```xml
<!-- ❌ ERRADO - Valor hardcoded -->
<parameter name="dataInicio" class="java.util.Date"/>
<queryString>
  <![CDATA[
    SELECT * FROM view_vendas 
    WHERE data >= '2026-01-01'  <!-- Não vai usar param! -->
  ]]>
</queryString>

<!-- ✅ CORRETO - Usa parâmetro -->
<queryString>
  <![CDATA[
    SELECT * FROM view_vendas 
    WHERE data >= $P{dataInicio}  <!-- Usa param -->
  ]]>
</queryString>
```

---

### ❌ Erro Clássico 2: Parâmetro sem default

```xml
<!-- ❌ ERRADO - User precisa passar sempre -->
<parameter name="dataInicio" class="java.util.Date"/>

<!-- ✅ CORRETO - Default automático -->
<parameter name="dataInicio" class="java.util.Date">
  <defaultValueExpression>
    <![CDATA[java.time.LocalDate.now().minusDays(30)]]>
  </defaultValueExpression>
</parameter>
```

---

### ❌ Erro Clássico 3: Typo em campo

```sql
-- ❌ ERRADO
SELECT data, item_nomme, valor FROM ...
-- 'item_nomme' não existe!

-- ✅ CORRETO
SELECT data, item_nome, valor FROM ...
```

**Prevenir:** Sempre validar com:
```bash
node scripts/validate.js relatorio.jrxml
```

---

### ❌ Erro Clássico 4: Sem WHERE 1=1

```sql
-- ❌ Problema: difícil adicionar filtros dinâmicos
SELECT * FROM view
WHERE data >= $P{dataInicio}
  AND vendedor_id = $P{vendedorId}

-- Se `vendedorId` é NULL, falha!

-- ✅ CORRETO: WHERE 1=1 primeiro
SELECT * FROM view
WHERE 1=1
  AND data >= $P{dataInicio}
  AND vendedor_id = $P{vendedorId}  -- Safe se NULL
```

---

## 🔍 Debug Checklist

Se algo falhar, verificar em ordem:

1. **Arquivo `.jrxml` existe?**
   ```bash
   ls -la output/*/relatorio.jrxml
   ```

2. **XML bem-formado?**
   ```bash
   node scripts/validate.js output/*/relatorio.jrxml
   ```

3. **View existe em BD?**
   ```sql
   SELECT * FROM view_vendas_diarias LIMIT 1;
   ```

4. **Campos existem na view?**
   ```bash
   cat rules/views.json | grep -A20 "view_vendas_diarias"
   ```

5. **Parâmetros definidos?**
   ```bash
   grep "<parameter" output/*/relatorio.jrxml
   ```

6. **4 bandas presentes?**
   ```bash
   grep -E "<(title|columnHeader|detail|pageFooter)" output/*/relatorio.jrxml
   ```

7. **Compile log (`.log`) sem ERROs?**
   ```bash
   grep "ERROR" output/*/relatorio.log
   ```

---

## 📞 Ainda Não Resolveu?

1. Coletar informações:
   ```bash
   # Output completo
   cat output/RELATORIO_*/relatorio.log
   
   # JRXML como está
   cat output/RELATORIO_*/relatorio.jrxml
   
   # Arquivo rules/views
   cat rules/views.json
   ```

2. Abrir issue com:
   - ❌ Erro exato (mensagem)
   - 📋 `.log` anexado
   - 🔍 `.jrxml` gerado
   - 🎯 Passo exato que falhou

3. Consultar [JASPER-REFERENCE.md](JASPER-REFERENCE.md)

---

**Última atualização:** 30 de Março de 2026
