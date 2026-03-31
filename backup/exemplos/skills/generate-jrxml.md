# Skill: Gerar JRXML para JasperReports 6.2.0

**Objetivo:** Gerar relatórios JasperReports (`.jrxml`) válidos, compiláveis e funcionais a partir de input simples.

**Audience:** Team Copilot (quando acionado para gerar relatórios)

**Status:** v1.0 - Stable

---

## 🎯 Quando Usar Esta Skill

- User pede para gerar relatório JRXML
- User fornece: nome, campos, view, filtros
- Precisa gerar XML bem-formado + compilável
- Precisa de SQL parametrizado

---

## 📋 Fluxo Completo

```
INPUT
  ↓
└─ validar input (view, campos, filtros)
  ↓
└─ gerar JRXML template
  ↓
└─ preencher query (SELECT + WHERE)
  ↓
└─ preencher campos (field mappings)
  ↓
└─ preencher bandas (title, columnHeader, detail, footer)
  ↓
└─ validar XML
  ↓
└─ validar tipos SQL->Java (rules/views.json vs <field class>)
  ↓
└─ compilar e validar PDF com dados reais
  ↓
OUTPUT (jrxml + compile instructions)
```

---

## 1️⃣ VALIDAÇÃO DO INPUT

**Verificar:**

- [ ] Nome do relatório: não vazio, sem caracteres especiais
- [ ] View existe em `rules/views.json`
- [ ] Todos campos existem em `validFields` da view
- [ ] Tipos de filtros válidos: DATE, INT, STRING, DECIMAL
- [ ] Layout é realista (não > 10 colunas)

**Se falhar:**
```
❌ View 'view_xyz' não encontrada em rules/views.json
   Opções disponíveis: view_vendas_diarias, view_pacientes_atendidos
   
❌ Campo 'descricao_muito_longa' não existe na view
   Campos válidos: [lista de validFields]
   
❌ Tipo de filtro 'BLOB' não suportado
   Tipos válidos: DATE, INT, STRING, DECIMAL
```

Rejeitar e pedir correção antes de gerar.

---

## 2️⃣ TEMPLATE BASE JRXML

Sempre começar com esta estrutura:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport 
  xmlns="http://jasperreports.sourceforge.net/jasperreports"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports
  http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
  
  name="{REPORT_NAME}"
  pageWidth="595"
  pageHeight="842"
  orientation="Portrait"
  columnWidth="515"
  leftMargin="40"
  rightMargin="40"
  topMargin="40"
  bottomMargin="40">
  
  <!-- PARAMETROS: adicionar para cada filtro -->
  <!-- QUERY STRING: uma só -->
  <!-- FIELDS: um por campo -->
  <!-- VARIABLES: se agregações -->
  <!-- BANDAS: title, columnHeader, detail, pageFooter (+ summary se agregação) -->
  
</jasperReport>
```

---

## 3️⃣ PARAMETROS (Filters)

Para cada filtro, criar `<parameter>`:

```xml
<!-- PATTERN -->
<parameter name="{FILTRO_NAME}" class="{JAVA_CLASS}">
  <defaultValueExpression>
    <![CDATA[{DEFAULT_VALUE}]]>
  </defaultValueExpression>
</parameter>

<!-- EXEMPLOS -->
<parameter name="dataInicio" class="java.util.Date">
  <defaultValueExpression><![CDATA[TODAY()-30]]></defaultValueExpression>
</parameter>

<parameter name="dataFim" class="java.util.Date">
  <defaultValueExpression><![CDATA[TODAY()]]></defaultValueExpression>
</parameter>

<parameter name="vendedorId" class="java.lang.Integer">
  <defaultValueExpression><![CDATA[null]]></defaultValueExpression>
</parameter>
```

**Type Mapping (Java Classes):**
- DATE → `java.util.Date`
- INT → `java.lang.Integer`
- STRING → `java.lang.String`
- DECIMAL → `java.math.BigDecimal`

**Regras para filtros opcionais (obrigatório):**
- Default deve ser `null`
- SQL deve usar padrão: `($P{param} IS NULL OR campo = $P{param})`
- Nunca comparar `VARCHAR` com `INTEGER`

---

## 4️⃣ QUERY STRING

Pattern obrigatório:

```xml
<queryString>
  <![CDATA[
    SELECT 
      {CAMPO1},
      {CAMPO2},
      {CAMPO3}
    FROM {VIEW_NAME}
    WHERE 1=1
      AND {CONDICAO1} >= $P{filtro1}
      AND {CONDICAO2} <= $P{filtro2}
      AND ({CONDICAO3} = $P{filtro3} OR $P{filtro3} IS NULL)
    ORDER BY {CAMPO_PRINCIPAL} DESC
  ]]>
</queryString>
```

**Regras:**

1. ✅ SELECT explícito (não `SELECT *`)
2. ✅ WHERE 1=1 como base
3. ✅ Todos filtros parametrizados com `$P{xxx}`
4. ✅ Filtros opcionais: `(campo = $P{param} OR $P{param} IS NULL)`
5. ✅ ORDER BY lógico
6. ✅ `ORDER BY` lógico
7. ❌ Não forçar `LIMIT` por padrão sem requisito de negócio

---

## 5️⃣ FIELDS (Mapeamento)

Um `<field>` por coluna SELECT:

```xml
<!-- PATTERN -->
<field name="{COLUMN_NAME}" class="{JAVA_CLASS}"/>

<!-- EXEMPLOS -->
<field name="data" class="java.time.LocalDate"/>
<field name="item_nome" class="java.lang.String"/>
<field name="quantidade" class="java.lang.Integer"/>
<field name="valor_total" class="java.math.BigDecimal"/>
```

**Type Mapping SQL → Java (Jasper 6.2 safe):**
```
DATE → java.sql.Date ou java.util.Date
INT → java.lang.Integer
VARCHAR → java.lang.String
DECIMAL → java.math.BigDecimal
TIMESTAMP → java.sql.Timestamp ou java.util.Date
```

---

## 6️⃣ BANDAS (Sections)

### TITLE Band (Cabeçalho)

```xml
<title>
  <band height="60">
    <!-- Nome do relatório -->
    <staticText>
      <reportElement x="0" y="0" width="515" height="25"/>
      <textElement>
        <font fontName="DejaVu Sans" size="18" isBold="true"/>
      </textElement>
      <text>{REPORT_NAME}</text>
    </staticText>
    
    <!-- Data/Hora -->
    <textField pattern="dd/MM/yyyy HH:mm">
      <reportElement x="0" y="30" width="515" height="15"/>
      <textElement>
        <font fontName="DejaVu Sans" size="9"/>
      </textElement>
      <textFieldExpression>new java.util.Date()</textFieldExpression>
    </textField>
  </band>
</title>
```

### COLUMN HEADER Band (Títulos das Colunas)

```xml
<columnHeader>
  <band height="25">
    <!-- Para cada coluna: -->
    <staticText>
      <reportElement x="{X_POS}" y="0" width="{WIDTH}" height="20" backcolor="#E0E0E0"/>
      <textElement>
        <font fontName="DejaVu Sans" size="11" isBold="true"/>
      </textElement>
      <text>{COLUMN_TITLE}</text>
    </staticText>
  </band>
</columnHeader>
```

**Cálculo de posições:**
- Total disponível: 515px
- Se 5 colunas: 515 / 5 = 103px cada
- x posição: 0, 103, 206, 309, 412

### DETAIL Band (Dados)

```xml
<detail>
  <band height="20">
    <!-- Para cada coluna: -->
    <textField>
      <reportElement x="{X_POS}" y="0" width="{WIDTH}" height="20"/>
      <textElement>
        <font fontName="DejaVu Sans" size="10"/>
      </textElement>
      <textFieldExpression>$F{COLUMN_NAME}</textFieldExpression>
    </textField>
  </band>
</detail>
```

**Padrões comuns:**
- Data: `pattern="dd/MM/yyyy"`
- Decimal: `pattern="#,##0.00"`
- Inteiro: sem padrão

### PAGE FOOTER Band (Rodapé)

```xml
<pageFooter>
  <band height="30">
    <line>
      <reportElement x="0" y="0" width="515" height="1"/>
      <pen lineWidth="0.5"/>
    </line>
    
    <textField>
      <reportElement x="10" y="10" width="350" height="15"/>
      <textElement>
        <font fontName="DejaVu Sans" size="9"/>
      </textElement>
      <textFieldExpression>"Total: " + $V{REPORT_COUNT}</textFieldExpression>
    </textField>
    
    <textField>
      <reportElement x="400" y="10" width="115" height="15"/>
      <textElement textAlignment="Right">
        <font fontName="DejaVu Sans" size="9"/>
      </textElement>
      <textFieldExpression>"Página " + $V{PAGE_NUMBER}</textFieldExpression>
    </textField>
  </band>
</pageFooter>
```

---

## 7️⃣ AGREGAÇÕES (Se Necessário)

Se relatório tem SUM, AVG, etc:

```xml
<!-- VARIABLE -->
<variable name="totalVendas" class="java.math.BigDecimal" 
  resetType="Report" calculation="Sum">
  <variableExpression>$F{valor_total}</variableExpression>
</variable>

<!-- SUMMARY BAND (Final do relatório) -->
<summary height="40">
  <band>
    <staticText>
      <reportElement x="250" y="10" width="80" height="20"/>
      <textElement>
        <font fontName="DejaVu Sans" size="12" isBold="true"/>
      </textElement>
      <text>TOTAL GERAL:</text>
    </staticText>
    
    <textField pattern="#,##0.00">
      <reportElement x="330" y="10" width="100" height="20"/>
      <textElement textAlignment="Right">
        <font fontName="DejaVu Sans" size="12" isBold="true"/>
      </textElement>
      <textFieldExpression>$V{totalVendas}</textFieldExpression>
    </textField>
  </band>
</summary>
```

---

## 8️⃣ Compatibilidade JasperReports 6.2.0 (Obrigatório)

Não usar no JRXML:

- `uuid` em `<jasperReport>`
- `kind="..."` em componentes visuais
- `splitType` em `<band>` (para este setup)

Usar estrutura clássica com `<title><band ...>`, `<columnHeader><band ...>`, `<detail><band ...>`, `<pageFooter><band ...>`.

---

## 9️⃣ Diagnóstico de Erros Reais (Playbook)

Erro: `Bad value for type int: HA1`
- Causa: campo alfanumérico da view declarado como Integer no JRXML
- Correção: trocar `<field class>` para `java.lang.String`

Erro: `operator does not exist: character varying = integer`
- Causa: filtro comparando tipos diferentes
- Correção: alinhar tipo do parâmetro ao tipo da coluna e usar cast seguro quando necessário

Erro: PDF gerado e vazio (~1KB)
- Causa comum: query sem linhas por filtro rígido ou mismatch de tipo
- Correção: tornar filtros opcionais (`null`) e revalidar tipos com `node scripts/validate.js`

---

## 8️⃣ CHECKLIST DE QUALIDADE

Antes de entregar JRXML:

- [ ] `<?xml version="1.0" encoding="UTF-8"?>` é primeira linha
- [ ] Elemento raiz é `<jasperReport>`
- [ ] Parâmetros: todos filtros do input estão aqui
- [ ] Query: SELECT explícito, WHERE 1=1, $P{} parametrizado
- [ ] Fields: um por coluna, tipos Java corretos
- [ ] Bandas: title (cabeçalho), columnHeader (nomes), detail (dados), pageFooter (rodapé)
- [ ] Fonts: apenas DejaVu Sans
- [ ] XML bem-formado (sem tags abertas/fechadas erradas)
- [ ] Dimensões: x+width não excedem 515px

---

## 9️⃣ VALIDAÇÃO XML

Ao gerar, validar com:

```bash
node scripts/validate.js /path/to/relatorio.jrxml
```

Deve retornar:
```
✓ XML bem-formado
✓ View 'xxx' validada
✓ N parâmetros encontrados
✓ 4/4 bandas recomendadas
✅ VALIDAÇÃO SUCESSO
```

---

## 🔟 COMPILAÇÃO

Instructar user a compilar:

```bash
node scripts/compile.js output/{RELATORIO}/{relatorio}.jrxml --pdf
```

Resultado:
- `.jasper` compilado
- `.pdf` preview
- `.log` de validação
- `metadata.json` versionado

---

## ❌ Anti-Padrões (Nunca Fazer)

```xml
❌ <queryString> SELECT * FROM ...
❌ <parameter name="data"/> (sem class)
❌ <field name="campo"/> (sem class)
❌ <font fontName="Arial"/> (usar DejaVu Sans)
❌ <textField>$F{campo}</textField> (sem reportElement)
❌ WHERE data = '2026-01-01' (usar $P{})
❌ 15 colunas em 595px (design quebra)
```

---

## 📚 Exemplos Rápidos

### Exemplo: Relatório 3 Campos, 2 Filtros

**Input:**
```
Nome: VENDAS_SIMPLES
View: view_vendas_diarias
Campos: data, item_nome, valor_total
Filtros: dataInicio, dataFim
```

**Output:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport name="VENDAS_SIMPLES" pageWidth="595" pageHeight="842" ...>
  <parameter name="dataInicio" class="java.util.Date"><defaultValueExpression><![CDATA[TODAY()-30]]></defaultValueExpression></parameter>
  <parameter name="dataFim" class="java.util.Date"><defaultValueExpression><![CDATA[TODAY()]]></defaultValueExpression></parameter>
  
  <queryString>
    <![CDATA[
      SELECT data, item_nome, valor_total
      FROM view_vendas_diarias
      WHERE 1=1 AND data >= $P{dataInicio} AND data <= $P{dataFim}
      ORDER BY data DESC
    ]]>
  </queryString>
  
  <field name="data" class="java.time.LocalDate"/>
  <field name="item_nome" class="java.lang.String"/>
  <field name="valor_total" class="java.math.BigDecimal"/>
  
  <title height="60">...</title>
  <columnHeader height="25">...</columnHeader>
  <detail height="20">...</detail>
  <pageFooter height="30">...</pageFooter>
</jasperReport>
```

---

## 🎓 Modo Ensino

Se user é novo:

1. Explique cada seção (parâmetros, query, fields, titulo, etc)
2. Mostre exemplo simples INLINE no response
3. Referencie `.github/copilot-instructions.md`
4. Sugira validação com `validate.js`
5. Aponte para `docs/EXAMPLES.md`

---

**Última versão:** 1.0  
**Data:** 30 de Março de 2026  
**Compatibilidade:** JasperReports 6.2.0+
