# 📚 EXEMPLOS: Casos de Uso Práticos

## 📋 Índice

1. [Exemplo 1: Relatório Simples (Vendas Diárias)](#exemplo-1-relatório-simples)
2. [Exemplo 2: Com Agregação (Vendas por Vendedor)](#exemplo-2-com-agregação)
3. [Exemplo 3: Com Múltiplos Filtros (Pacientes)](#exemplo-3-com-múltiplos-filtros)

---

## ✅ Exemplo 1: Relatório Simples

**Nome:** VENDAS_DIARIAS  
**Complexidade:** ⭐ Básico  
**Tempo:** 5 minutos

### 1.1 Input do Deploy Team

```yaml
Nome Relatório: VENDAS_DIARIAS
View: view_vendas_diarias
Descrição: Relatório listando todas as vendas de um período

Campos:
  - data (Data da Venda)
  - item_nome (Item)
  - quantidade (Quantidade)
  - valor_total (Valor Total R$)
  - vendedor_nome (Vendedor)

Filtros:
  - dataInicio (DATE, obrigatório)
  - dataFim (DATE, obrigatório)

Layout: Tabela simples com cabeçalho e rodapé
```

### 1.2 JRXML Gerado

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
  name="VENDAS_DIARIAS"
  pageWidth="595"
  pageHeight="842"
  orientation="Portrait"
  columnWidth="515"
  leftMargin="40"
  rightMargin="40"
  topMargin="40"
  bottomMargin="40">

  <!-- PARAMETROS -->
  <parameter name="dataInicio" class="java.util.Date">
    <defaultValueExpression>
      <![CDATA[TODAY()-30]]>
    </defaultValueExpression>
  </parameter>
  <parameter name="dataFim" class="java.util.Date">
    <defaultValueExpression>
      <![CDATA[TODAY()]]>
    </defaultValueExpression>
  </parameter>

  <!-- QUERY PARAMETRIZADA -->
  <queryString>
    <![CDATA[
      SELECT 
        data,
        item_nome,
        quantidade,
        valor_total,
        vendedor_nome
      FROM view_vendas_diarias
      WHERE 1=1
        AND data >= $P{dataInicio}
        AND data <= $P{dataFim}
      ORDER BY data DESC, vendedor_nome ASC
    ]]>
  </queryString>

  <!-- CAMPOS -->
  <field name="data" class="java.time.LocalDate"/>
  <field name="item_nome" class="java.lang.String"/>
  <field name="quantidade" class="java.lang.Integer"/>
  <field name="valor_total" class="java.math.BigDecimal"/>
  <field name="vendedor_nome" class="java.lang.String"/>

  <!-- TITLE (Cabeçalho) -->
  <title height="60">
    <band>
      <staticText>
        <reportElement x="0" y="0" width="515" height="25"/>
        <textElement>
          <font fontName="DejaVu Sans" size="18" isBold="true"/>
        </textElement>
        <text>RELATÓRIO DE VENDAS DIÁRIAS</text>
      </staticText>
      
      <textField pattern="dd/MM/yyyy HH:mm">
        <reportElement x="0" y="30" width="515" height="15"/>
        <textElement>
          <font fontName="DejaVu Sans" size="9"/>
        </textElement>
        <textFieldExpression>new java.util.Date()</textFieldExpression>
      </textField>
    </band>
  </title>

  <!-- COLUMN HEADER -->
  <columnHeader height="25">
    <band>
      <staticText>
        <reportElement x="0" y="0" width="70" height="20" backcolor="#E0E0E0"/>
        <box>
          <pen lineWidth="0.5"/>
        </box>
        <textElement>
          <font fontName="DejaVu Sans" size="11" isBold="true"/>
        </textElement>
        <text>Data</text>
      </staticText>

      <staticText>
        <reportElement x="70" y="0" width="200" height="20" backcolor="#E0E0E0"/>
        <box>
          <pen lineWidth="0.5"/>
        </box>
        <textElement>
          <font fontName="DejaVu Sans" size="11" isBold="true"/>
        </textElement>
        <text>Item</text>
      </staticText>

      <staticText>
        <reportElement x="270" y="0" width="60" height="20" backcolor="#E0E0E0"/>
        <box>
          <pen lineWidth="0.5"/>
        </box>
        <textElement textAlignment="Center">
          <font fontName="DejaVu Sans" size="11" isBold="true"/>
        </textElement>
        <text>Qty</text>
      </staticText>

      <staticText>
        <reportElement x="330" y="0" width="100" height="20" backcolor="#E0E0E0"/>
        <box>
          <pen lineWidth="0.5"/>
        </box>
        <textElement textAlignment="Right">
          <font fontName="DejaVu Sans" size="11" isBold="true"/>
        </textElement>
        <text>Valor Total R$</text>
      </staticText>

      <staticText>
        <reportElement x="430" y="0" width="85" height="20" backcolor="#E0E0E0"/>
        <box>
          <pen lineWidth="0.5"/>
        </box>
        <textElement>
          <font fontName="DejaVu Sans" size="11" isBold="true"/>
        </textElement>
        <text>Vendedor</text>
      </staticText>
    </band>
  </columnHeader>

  <!-- DETAIL -->
  <detail height="20">
    <band splitType="Stretch">
      <textField pattern="dd/MM/yyyy">
        <reportElement x="0" y="0" width="70" height="20"/>
        <box>
          <pen lineWidth="0.5"/>
        </box>
        <textElement>
          <font fontName="DejaVu Sans" size="10"/>
        </textElement>
        <textFieldExpression>$F{data}</textFieldExpression>
      </textField>

      <textField>
        <reportElement x="70" y="0" width="200" height="20"/>
        <box>
          <pen lineWidth="0.5"/>
        </box>
        <textElement>
          <font fontName="DejaVu Sans" size="10"/>
        </textElement>
        <textFieldExpression>$F{item_nome}</textFieldExpression>
      </textField>

      <textField>
        <reportElement x="270" y="0" width="60" height="20"/>
        <box>
          <pen lineWidth="0.5"/>
        </box>
        <textElement textAlignment="Center">
          <font fontName="DejaVu Sans" size="10"/>
        </textElement>
        <textFieldExpression>$F{quantidade}</textFieldExpression>
      </textField>

      <textField pattern="#,##0.00">
        <reportElement x="330" y="0" width="100" height="20"/>
        <box>
          <pen lineWidth="0.5"/>
        </box>
        <textElement textAlignment="Right">
          <font fontName="DejaVu Sans" size="10"/>
        </textElement>
        <textFieldExpression>$F{valor_total}</textFieldExpression>
      </textField>

      <textField>
        <reportElement x="430" y="0" width="85" height="20"/>
        <box>
          <pen lineWidth="0.5"/>
        </box>
        <textElement>
          <font fontName="DejaVu Sans" size="10"/>
        </textElement>
        <textFieldExpression>$F{vendedor_nome}</textFieldExpression>
      </textField>
    </band>
  </detail>

  <!-- PAGE FOOTER -->
  <pageFooter height="30">
    <band>
      <line>
        <reportElement x="0" y="0" width="515" height="1"/>
        <pen lineWidth="0.5"/>
      </line>

      <textField>
        <reportElement x="10" y="10" width="350" height="15"/>
        <textElement>
          <font fontName="DejaVu Sans" size="9"/>
        </textElement>
        <textFieldExpression>"Total de Registros: " + $V{REPORT_COUNT}</textFieldExpression>
      </textField>

      <textField>
        <reportElement x="400" y="10" width="100" height="15"/>
        <textElement textAlignment="Right">
          <font fontName="DejaVu Sans" size="9"/>
        </textElement>
        <textFieldExpression>"Página " + $V{PAGE_NUMBER}</textFieldExpression>
      </textField>
    </band>
  </pageFooter>

</jasperReport>
```

### 1.3 Executar Setup

```bash
# Validar
node scripts/validate.js output/VENDAS_DIARIAS_20260330_143022/vendas_diarias.jrxml

# Compilar
node scripts/compile.js output/VENDAS_DIARIAS_20260330_143022/vendas_diarias.jrxml --pdf

# Verificar output
ls -la output/VENDAS_DIARIAS_20260330_143022/
```

### 1.4 Output Esperado

```
output/VENDAS_DIARIAS_20260330_143022/
├── vendas_diarias.jrxml     ✅ XML bem-formado
├── vendas_diarias.jasper    ✅ Compilado
├── vendas_diarias.pdf       ✅ Preview (abre em navegador)
├── vendas_diarias.log       ✅ Logs (sem erros)
└── metadata.json            ✅ Versioning
```

---

## ✅ Exemplo 2: Com Agregação

**Nome:** VENDAS_POR_VENDEDOR  
**Complexidade:** ⭐⭐ Intermediário  
**Tempo:** 10 minutos  
**Novo Conceito:** SUM (agregação)

### 2.1 Input

```yaml
Nome: VENDAS_POR_VENDEDOR
View: view_vendas_diarias
Descrição: Vendas totalizadas por vendedor em um período

Campos:
  - vendedor_nome (Vendedor)
  - valor_total (SUM) → Total Vendido R$
  - quantidade (COUNT) → Total Itens

Filtros:
  - dataInicio (DATE)
  - dataFim (DATE)

Layout: Tabela com totalizador em rodapé
```

### 2.2 Query com GROUP BY

```sql
SELECT 
  vendedor_nome,
  SUM(valor_total) as valor_total,
  COUNT(*) as quantidade
FROM view_vendas_diarias
WHERE 1=1
  AND data >= $P{dataInicio}
  AND data <= $P{dataFim}
GROUP BY vendedor_nome
ORDER BY valor_total DESC
```

### 2.3 Additions ao JRXML

```xml
<!-- VARIABLE para totalizador -->
<variable name="totalVendas" class="java.math.BigDecimal" 
  resetType="Report" calculation="Sum">
  <variableExpression>$F{valor_total}</variableExpression>
</variable>

<!-- SUMMARY BAND (Total no final) -->
<summary height="40">
  <band>
    <staticText>
      <reportElement x="70" y="10" width="200" height="20"/>
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

## ✅ Exemplo 3: Com Múltiplos Filtros

**Nome:** PACIENTES_ATENDIDOS_FILTRADO  
**Complexidade:** ⭐⭐⭐ Avançado  
**Tempo:** 15 minutos  
**Novo Conceito:** Múltiplos filtros + tipos mistos

### 3.1 Input

```yaml
Nome: PACIENTES_ATENDIDOS
View: view_pacientes_atendidos
Descrição: Pacientes atendidos por profissional em período

Campos:
  - data_atendimento (Data)
  - paciente_nome (Paciente)
  - procedimento_descricao (Procedimento)
  - valor_procedimento (Valor R$)
  - profissional_nome (Profissional)

Filtros:
  - dataInicio (DATE)
  - dataFim (DATE)
  - profissionalId (INT, opcional)
  - categoriaProc (STRING, opcional)

Layout: Tabela com detalhes de atendimento
```

### 3.2 Query Complexa

```sql
SELECT 
  data_atendimento,
  paciente_nome,
  procedimento_descricao,
  valor_procedimento,
  profissional_nome
FROM view_pacientes_atendidos
WHERE 1=1
  AND data_atendimento >= $P{dataInicio}
  AND data_atendimento <= $P{dataFim}
  AND (profissional_id = $P{profissionalId} OR $P{profissionalId} IS NULL)
  AND (procedimento_categoria = $P{categoriaProc} OR $P{categoriaProc} IS NULL)
ORDER BY data_atendimento DESC, profissional_nome ASC
```

### 3.3 Parâmetros no JRXML

```xml
<parameter name="dataInicio" class="java.util.Date">
  <defaultValueExpression><![CDATA[TODAY()-30]]></defaultValueExpression>
</parameter>

<parameter name="dataFim" class="java.util.Date">
  <defaultValueExpression><![CDATA[TODAY()]]></defaultValueExpression>
</parameter>

<!-- Opcional se NULL -->
<parameter name="profissionalId" class="java.lang.Integer" isForPrompting="false">
  <defaultValueExpression><![CDATA[null]]></defaultValueExpression>
</parameter>

<parameter name="categoriaProc" class="java.lang.String" isForPrompting="false">
  <defaultValueExpression><![CDATA[null]]></defaultValueExpression>
</parameter>
```

---

## 📊 Comparativo dos 3 Exemplos

| Aspecto | Ex 1 (Simples) | Ex 2 (Agregação) | Ex 3 (Filtros) |
|---------|----------------|------------------|----------------|
| Campos | 5 | 3 | 5 |
| Filtros | 2 | 2 | 4 |
| GROUP BY | Não | Sim | Não |
| Variables | Não | Sim (totalVendas) | Não |
| Summary Band | Não | Sim | Não |
| Conditional WHERE | Não | Não | Sim (OR ... NULL) |
| Complexity | ⭐ | ⭐⭐ | ⭐⭐⭐ |
| Tempo Geração | 5 min | 10 min | 15 min |

---

## 🚀 Como Usar Estes Exemplos

### Opção 1: Copiar Código
1. Copie XML do exemplo
2. Adapte nomes/campos para seu caso
3. Salve como `.jrxml`
4. Execute `compile.js`

### Opção 2: Usar como Referência
1. Leia o exemplo
2. Foque na parte desejada (aggregation, complex WHERE, etc)
3. Aplique ao seu JRXML no Copilot

### Opção 3: Criar Novos
1. Use template `prompts/relatorio-simples.prompt.md`
2. Copie esse documento como referência
3. Peça ao Copilot (cite "veja exemplo 2 para padrão de aggregation")

---

## 📝 Criando Seu Próprio Exemplo

1. Preencha input do seu caso
2. Gere via Copilot
3. Valide + compile
4. Copie para `examples/` como referência futura:
   ```bash
   cp output/SEU_RELATORIO_*/seu_relatorio.jrxml examples/seu-relatorio-exemplo.jrxml
   ```

5. Documente aqui (adicione seção)

---

**Última atualização:** 30 de Março de 2026
