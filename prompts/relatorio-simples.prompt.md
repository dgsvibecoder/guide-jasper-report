# 📋 TEMPLATE: Gerador de Relatório Simples

## ℹ️ Instruções de Uso

Preencha este template com os detalhes do seu relatório. Após preenchimento, 
cole a seção **PROMPT PARA COPILOT** na Copilot chat.

---

## 📝 PASSO 1: Informações Básicas

```
Nome do Relatório: [Exemplo: VENDAS_DIARIAS]
Descrição: [Exemplo: Relatório de vendas do período, agrupado por item e vendedor]
```

---

## � PASSO 2: Cenário (Contexto do Negócio) ⭐ NOVO

Descreva o contexto e motivação do relatório para ambito, destinatário e uso esperado.

**Exemplos de Cenário:**
- "Acompanhamento diário de vendas para equipe comercial validar performance"
- "Relatório executivo de pacientes atendidos em clínica para diretoria"
- "Análise semanal de receita agregada por mês para controller financeiro"

```
Cenário (Contexto + Por Quê):
[Exemplo: Acompanhamento diário de vendas para equipe comercial, com foco em item mais vendido por vendedor. 
Uso: Gerente acompanha performance em tempo real. Público: Vendedores + Gerência.]
```

---

## 🔗 PASSO 3: Fonte de Dados (View SQL)

Escolha a view do banco de dados onde os dados serão buscados.

**Views disponíveis em rules/views.json:**
- `view_vendas_diarias` - Vendas agregadas por item, quantidade e valor
- `view_pacientes_atendidos` - Pacientes atendidos em clínica
- `accessops` - Registro de Acesso PS
- `view_receita_por_mes` - Receita agregada por mês

```
View Selecionada: [Exemplo: view_vendas_diarias]
```

---

## 📊 PASSO 4: Agrupado Por (Dimensão/Agrupamento Principal) ⭐ NOVO

Defina o campo ou combinação de campos que servirá como dimensão/agrupamento principal do relatório.
Isso ajuda a definir a estrutura e ordem dos dados.

**Exemplos:**
- `data` → Relatório agrupado por dia
- `vendedor_nome` → Relatório agrupado por vendedor
- `categoria` → Relatório agrupado por categoria
- `data, vendedor_nome` → Agrupado primeiro por data, depois por vendedor

**Regra:**
- Campo DEVE existir na view escolhida
- Use para definir granularidade do relatório (que é a linha principal?)
- Se não fizer sentido agrupar, use campo de identidade ou deixe vazio (todos os registros)

```
Agrupado Por (campo(s) dimensão):
[Exemplo: data]

Justificativa (por quê este agrupamento?):
[Exemplo: Equipe quer ver uma linha por dia de vendas, para identificar dias com mais volume]
```

---

## 📊 PASSO 5: Campos Desejados

Liste os campos que devem aparecer no relatório.

**Para view_vendas_diarias, campos disponíveis:**
- data (Data da Venda)
- item_nome (Nome do Item)
- item_codigo (Código)
- quantidade (Quantidade)
- valor_unitario (Valor Unitário R$)
- valor_total (Valor Total R$)
- vendedor_nome (Vendedor)
- vendedor_id (ID Vendedor)
- categoria (Categoria)

```
Campos Desejados (separe por vírgula):
[Exemplo: data, item_nome, quantidade, valor_total, vendedor_nome]
```

---

## 🔍 PASSO 6: Filtros (Parâmetros)

Defina quais filtros o usuário pode aplicar ao gerar o relatório.

**Tipos de filtro disponíveis:**
- `DATE` - Data (ex: 2026-03-30)
- `INT` - Número inteiro (ex: 1001)
- `STRING` - Texto (ex: "João")
- `DECIMAL` - Número com casa decimal (ex: 99.99)

**Regra anti-erro importante (obrigatória):**
- Se o campo da view for `VARCHAR`, o filtro deve ser `STRING` (nunca `INT`)
- Para filtros opcionais, use default `null`

```
Filtro 1:
  Nome: dataInicio
  Tipo: DATE
   Obrigatório: Não
   Default: null
  Label: "Data Inicial"

Filtro 2:
  Nome: dataFim
  Tipo: DATE
   Obrigatório: Não
   Default: null
  Label: "Data Final"

[Adicione mais filtros se necessário]
```

---

## 🎨 PASSO 7: Layout e Estilo

Descreva como o relatório deve ser exibido.

```
Orientação: Portrait (padrão) ou Landscape
Estilo: Tabela simples com linhas alternadas
Cabeçalho: Simulação textual:

┌─────────────────────────────────────────┐
│  RELATÓRIO DE VENDAS DIÁRIAS           │
│  Período: 01/03/2026 a 30/03/2026      │
└─────────────────────────────────────────┘

Detalhes:
┌─────────────┬──────────────┬────────────┐
│ Data        │ Item         │ Valor      │
├─────────────┼──────────────┼────────────┤
│ 30/03/2026  │ Produto XYZ  │ R$ 99,99   │
│ ...         │ ...          │ ...        │
└─────────────┴──────────────┴────────────┘

Rodapé: Página X de Y, Total de registros, Data/Hora
```

---

## 🎨 PASSO 7.1: NOVO - Modelo Visual JRXML (Opcional)

Se você tem um arquivo modelo `.jrxml` em `/tmp` para reutilizar design visual:

```
Usar Modelo Visual JRXML? Sim / Não

Se SIM, indique:
Caminho do Modelo: [Exemplo: /tmp/modelo-vendas.jrxml]
Descrição: [Exemplo: Modelo com logo empresa, header/footer padronizado]

⚠️ IMPORTANTE:
- Modelo FORNECE APENAS: fonts, cores, tamanho de banda, margens
- Modelo NÃO FORNECE: query, campos, filtros, lógica de agregação
- Seus dados virão de: VIEW + CAMPOS + FILTROS que você escolher
- Verificação Pré-Uso: Se modelo foi auditado/validado com sucesso (confidence >= 0.65)
```

**Características de um Modelo Seguro:**
- Tem 0 `<parameter>` declarations
- Tem 0 `<field>` declarations
- Tem query dummy: `<queryString><![CDATA[SELECT 1]]></queryString>`
- Tem 0 expressões `$F{}`, `$P{}`, `$V{}`
- Tem < 200 linhas (puro estilo)

**Se não tiver certeza**, deixe em branco (campo obrigatório: Não).

---

## 📄 PASSO 8: Arquivo Modelo Legado (Opcional - Deprecated)

Se você tem um PDF ou JRXML de referência de layout legado, 
coloque em `examples/` e mencione aqui:

```
Arquivo Modelo: examples/VENDAS_DIARIAS_2025.pdf
Descrição: "Usar como referência visual de layout"
```

---

## ✅ PASSO 9: Validação Antes de Submeter

Checklist:
- [ ] Preencheu todos os campos (passos 1-5)?
- [ ] View escolhida existe em rules/views.json?
- [ ] Todos os campos existem na view?
- [ ] Filtros têm tipos válidos?
- [ ] Tipo do filtro confere com tipo do campo da view (STRING vs INT)?
- [ ] Layout é realista (não muito complexo)?
- [ ] **NOVO:** Se usa modelo JRXML, arquivo existe em /tmp?
- [ ] **NOVO:** Modelo foi validado (confidence >= 0.65)?
- [ ] **NOVO:** Modelo **NÃO tem** parâmetros, fields, ou query real (confira anti-padrões)?

---

---

## 🎯 PROMPT PARA O COPILOT

**Cole este prompt na Copilot Chat (Ctrl+I) após preencher acima:**

```
Sou do time de deploy. Preciso gerar um relatório JasperReports customizado (MODO SIMPLES).

📋 DETALHES DO RELATÓRIO:

**Nome:** [NOME_RELATÓRIO]
**Descrição:** [DESCRIÇÃO]
**Cenário (Contexto):** [CENÁRIO_DO_NEGÓCIO]
**View (fonte de dados):** [VIEW]
**Agrupado Por (dimensão principal):** [CAMPO_AGRUPAMENTO]

**Campos desejados:**
[CAMPO1] (label: "[Label1]")
[CAMPO2] (label: "[Label2]")
[CAMPO3] (label: "[Label3]")
...

**Filtros:**
- [FILTRO1] (tipo: [TIPO], obrigatório: sim, label: "[Label]")
- [FILTRO2] (tipo: [TIPO], obrigatório: sim, label: "[Label]")

**Layout:**
[DESCRIÇÃO LAYOUT DO PASSO 7]

---

📋 INSTRUÇÕES PARA COPILOT:

Seguindo as regras em `.github/copilot-instructions.md` e info em `rules/views.json`:

1. ✅ **Validar Input:**
   - View existe?
   - Campos existem em validFields?
   - Filtros têm tipos válidos?

1.5. 🎨 **NOVO - Processar Modelo JRXML (se fornecido):**
   - Se modelo NOT vazio:
     - Validar arquivo existe em /tmp
     - Executar: `node scripts/extract-style-blueprint-from-jrxml.js /tmp/[modelo] output/style-blueprint.json`
     - Verificar confidence >= 0.65 (se < 0.65, usar fallback - JRXML sem estilo)
     - Guardar output JSON para uso posterior
   - Se modelo vazio OU confiança baixa: prosseguir sem modelo (normal styling)

2. 🔨 **Gerar JRXML:**
   - Arquivo: `output/[NOME_RELATÓRIO]_{timestamp}/[nome_relatorio].jrxml`
   - XML bem-formado (encoding UTF-8)
   - QueryString parametrizada com $P{filterName}
   - Compatível com JasperReports 6.2.0 (não usar atributos modernos como uuid/kind/splitType)
   - Filtros opcionais devem usar padrão: `($P{param} IS NULL OR campo = $P{param})`
   - 4 bandas: title, columnHeader, detail, pageFooter
   - Fonts: DejaVu Sans
   - Styles: Linhas alternadas, bordas simples

2.5. 🎨 **NOVO - Aplicar Estilo do Modelo (se existente e confiança OK):**
   - Se blueprint JSON foi gerado no passo 1.5:
     - Executar: `node scripts/apply-style-blueprint-from-jrxml.js output/style-blueprint.json output/[nome_relatorio].jrxml output/[nome_relatorio]-styled.jrxml`
     - Output: [nome_relatorio]-styled.jrxml + [nome_relatorio]-styled.jrxml-style.json (auditoria)
     - IMPORTANTE: Dados NUNCA são copiados do modelo - apenas estilo visual (fonts, dimensões, cores)
   - Se sem modelo: usar [nome_relatorio].jrxml direct no próximo passo

3. 🔧 **Compilar:**
   - Executar: `node scripts/compile.js output/[NOME_RELATÓRIO]_{timestamp}/[nome_relatorio]-styled.jrxml --pdf` (ou sem -styled se sem modelo)
   - Verificar: .jasper criado sem ERROs
   - Gerar: PDF de preview
   - Se PDF ficar em branco, diagnosticar automaticamente: tipos dos fields, filtros muito restritivos, cast inválido

4. ✓ **Validar:**
   - XML válido
   - SQL válido (sem SELECT *, WHERE 1=1 com filtros)
   - Tipos JRXML x tipos da view consistentes (evitar `Bad value for type int`)
   - Campos mapeados
   - metadata.json com timestamp
   - **NOVO:** Se usou modelo, verificar arquivo .jrxml-style.json (fallbackApplied: false = OK)

5. 📦 **Entregar:**
   - Listar arquivos: .jrxml, .jasper, .pdf, .log, metadata.json
   - Confirmar: Tudo pronto para deploy!

---

Se tiver dúvidas, execute e mostre o output de `node scripts/validate.js`.
```

---

## 💾 Salvando o Relatório

Após colar o prompt no Copilot:

1. ✅ Aguarde Copilot gerar os arquivos
2. 📁 Verifique em: `output/{NOME_RELATÓRIO}_{data_hora}/`
3. 🔍 Valide:
   - `.jrxml` → abra em editor, confira XML
   - `.jasper` → compilado (se não houver .log com ERROs)
   - `.pdf` → visualize layout
   - `.log` → confira se tudo OK (WARNING é ok, ERROR não)
4. 🚀 Pronto para deploy: copie `.jrxml` + `.jasper` para sua app

---

## 🆘 Se Algo Deu Errado

1. Verifique `.log` em `output/{NOME_RELATÓRIO}_{timestamp}/`
2. Leia `docs/TROUBLESHOOTING.md`
3. Revalide com: `node scripts/validate.js output/.../{nome_relatorio}.jrxml`
4. Abra issue com `.log` anexado

---

## 📚 Exemplos Completos

Veja em `docs/EXAMPLES.md`:
- Exemplo 1: Relatório Simples (Vendas Diárias)
- Exemplo 2: Com Agregação (Vendas por Vendedor)
- Exemplo 3: Com Filtros Múltiplos (Pacientes Atendidos)

---

**Versão do Template:** 1.1 (Fase 1) | **Data:** 1º de Abril de 2026 | **Mudanças:** +Cenário, +Agrupado Por
