# 📚 EXEMPLOS PRONTOS - Fase 1: Prompts Evoluídos

Data: 1º de Abril de 2026  
Status: Exemplos validados com Cenário + Agrupado Por

---

## ✨ Exemplo 1: Relatório Simples (MODO SIMPLES)

**Contexto:** Equipe comercial precisa acompanhar vendas diárias.

```markdown
# PREENCHIMENTO DO TEMPLATE: relatorio-simples.prompt.md

## PASSO 1: Informações Básicas
Nome do Relatório: VENDAS_DIARIAS_SIMPLES
Descrição: Relatório diário de vendas com detalhe por item e vendedor

## PASSO 2: Cenário (Contexto do Negócio)
Cenário: 
Acompanhamento diário de vendas para equipe comercial validar  
performance em tempo real. 

OBJETIVO: Vendedor verifica seu volume de vendas do dia.
PÚBLICO: Equipe de vendedores + Gerente comercial
FREQUÊNCIA: Diariamente, gerado às 18h
USO: Identificar produtos mais vendidos, validar meta diária

## PASSO 3: Fonte de Dados (View SQL)
View Selecionada: view_vendas_diarias

## PASSO 4: Agrupado Por (Dimensão/Agrupamento Principal)
Agrupado Por: data
Justificativa: Relatório mostra 1 linha por dia, permitindo comparação 
entre dias de desempenho

## PASSO 5: Campos Desejados
- data (Data da Venda)
- item_nome (Nome do Item)
- quantidade (Quantidade Vendida)
- valor_unitario (Preço Unitário R$)
- valor_total (Valor Total R$)
- vendedor_nome (Vendedor)
- categoria (Categoria do Item)

## PASSO 6: Filtros (Parâmetros)

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

Filtro 3:
  Nome: vendedor
  Tipo: STRING
  Obrigatório: Não
  Default: null
  Label: "Nome Vendedor"

## PASSO 7: Layout e Estilo

Orientação: Portrait

Cabeçalho (Title Band):
┌─────────────────────────────────────────────────────────┐
│  VENDAS DIÁRIAS - RELATÓRIO OPERACIONAL                 │
│  Período: 01/04/2026 a 30/04/2026                      │
│  Filtros: Vendedor: João Silva                          │
└─────────────────────────────────────────────────────────┘

Tabela de Dados (Detail Band):
┌─────────────┬───────────────┬────────┬──────────┬─────────────┬──────────────┬ ──────────┐
│ Data        │ Item          │ Qtd    │ Valor Un │ Valor Total │ Vendedor     │ Categoria│
├─────────────┼───────────────┼────────┼──────────┼─────────────┼──────────────┼──────────┤
│ 01/04/2026  │ Produto XYZ   │ 5      │ R$ 50   │ R$ 250,00   │ João Silva   │ Eletrôn  │
│ 01/04/2026  │ Serviço ABC   │ 1      │ R$ 100  │ R$ 100,00   │ João Silva   │ Serviços │
│ 02/04/2026  │ Produto XYZ   │ 3      │ R$ 50   │ R$ 150,00   │ João Silva   │ Eletrôn  │
└─────────────┴───────────────┴────────┴──────────┴─────────────┴──────────────┴──────────┘

Total de Linhas: 3 | Valor Total: R$ 500,00

Espaçamento: Normal
Rodapé: Página X de Y, Gerado em DD/MM/YYYY HH:MM

## PASSO 7.1: Modelo Visual JRXML (Opcional)
Usar Modelo Visual? Não

## PASSO 8: Arquivo Modelo Legado (Opcional)
Arquivo Modelo: (vazio)

## PASSO 9: Validação Antes de Submeter
✅ View existe (view_vendas_diarias)
✅ Campos existem em validFields
✅ Filtros têm tipos válidos (DATE, DATE, STRING ← todos válidos)
✅ Tipo filtro STRING confere com campo STRING (vendedor_nome)
✅ Layout realista
✅ Sem modelo JRXML envolvido (campo vazio)
```

### PROMPT FINAL PARA COPILOT:

```
Sou do time de deploy. Preciso gerar um relatório JasperReports customizado (MODO SIMPLES).

📋 DETALHES DO RELATÓRIO:

**Nome:** VENDAS_DIARIAS_SIMPLES
**Descrição:** Relatório diário de vendas com detalhe por item e vendedor
**Cenário (Contexto):** Acompanhamento diário de vendas para equipe comercial validar performance em tempo real. Objetivo: vendedor verifica seu volume de vendas do dia. Público: Equipe + Gerente comercial.
**View:** view_vendas_diarias
**Agrupado Por:** data

**Campos desejados:**
- data (Data da Venda)
- item_nome (Nome do Item)
- quantidade (Quantidade Vendida)
- valor_unitario (Preço Unitário R$)
- valor_total (Valor Total R$)
- vendedor_nome (Vendedor)
- categoria (Categoria do Item)

**Filtros:**
- dataInicio (tipo: DATE, obrigatório: não, label: "Data Inicial")
- dataFim (tipo: DATE, obrigatório: não, label: "Data Final")
- vendedor (tipo: STRING, obrigatório: não, label: "Nome Vendedor")

**Layout:** Portrait, tabela com 7 colunas, cabeçalho com período, rodapé com totais

Seguindo as regras em `.github/copilot-instructions.md` e `rules/views.json`:
1. ✅ Validar: view_vendas_diarias existe, campos existem, filtros válidos
2. 🔨 Gerar JRXML compatível com JasperReports 6.2.0 (sem uuid/splitType)
3. 🔧 Compilar e gerar PDF preview
4. ✓ Confirmar artefatos em output/VENDAS_DIARIAS_SIMPLES_{timestamp}/
```

---

## ✨ Exemplo 2: Relatório Master/Detail (MODO MASTER/DETAIL)

**Contexto:** Gerente comercial quer acompanhar vendedor e suas vendas individuais.

```markdown
# PREENCHIMENTO DO TEMPLATE: relatorio-master-detail.prompt.md

## PASSO 1: Informações Básicas
Nome do Relatório: VENDEDOR_VENDAS_MASTERDETAIL
Descrição: Vendedor principal com detalhe de cada venda

## PASSO 2: Cenário (Contexto do Negócio)
Cenário (Master/Detail):

MASTER (Tabela Principal):
  Vendedor (nome, ID)
  Agregação: Total de vendas, Faturamento total por vendedor
  
DETAIL (Aninhado):
  Vendas do Vendedor (data, item, quantidade, valor)
  Granularidade: Cada venda individual do vendedor
  
USO: Gerente comercial acompanha vendedor e valida performance através 
de um relatório integrado. Permite drilldown: vê o vendedor, clica para 
expandir e vê todas as vendas dele.

PÚBLICO: Gerência comercial + Diretoria
FREQUÊNCIA: Semanal
MOTIVAÇÃO: Análise de desempenho por vendedor com visibilidade de todas 
as transações individuais

## PASSO 3: Fonte de Dados - MASTER (View Principal)
View Master: view_vendas_diarias

## PASSO 4: Agrupado Por MASTER (Dimensão Principal)
Agrupado Por: vendedor_id, vendedor_nome
Justificativa: Cada linha master é 1 vendedor único. A chave vendedor_id 
identifica unicamente um vendedor na view.

## PASSO 5: Campos MASTER (Cabeçalho Principal)
- vendedor_id
- vendedor_nome
- COUNT(*) as total_vendas (quantidade de vendas daquele vendedor)
- SUM(valor_total) as faturamento_total (faturamento total daquele vendedor)

## PASSO 6: Fonte de Dados - DETAIL (View Filha)
View Detail: view_vendas_diarias

## PASSO 7: Agrupado Por DETAIL (Granularidade Filha)
Agrupado Por: data, item_nome
Justificativa: Cada linha no detail é uma combinação data+item, representando 
uma transação de venda específica daquele vendedor.

## PASSO 8: Campos DETAIL (Grade Filha)
- data (Data da Venda)
- item_nome (Nome do Item)
- quantidade (Qtd Vendida)
- valor_unitario (Valor Unit.)
- valor_total (Valor Total)

## PASSO 9: Relacionamento Master → Detail
Chave Master: vendedor_id
Chave Detail: vendedor_id
Jointura: Master.vendedor_id = Detail.vendedor_id
Cardinalidade: 1:N (1 vendedor : N vendas)

## PASSO 10: Filtros MASTER (Parâmetros do Cabeçalho)

Filtro Master 1:
  Nome: dataInicio
  Tipo: DATE
  Obrigatório: Não
  Label: "Data Inicial"

Filtro Master 2:
  Nome: dataFim
  Tipo: DATE
  Obrigatório: Não
  Label: "Data Final"

## PASSO 11: Filtros DETAIL (Parâmetros da Grade)

Filtro Detail 1:
  Nome: valorMinimoVenda
  Tipo: DECIMAL
  Obrigatório: Não
  Default: null
  Label: "Valor Mínimo (R$)"

## PASSO 12: Layout e Estilo

Orientação: Portrait

Tabela Master (Cabeçalho Principal):
┌────────────────┬──────────────┬─────────────┬──────────────────┐
│ ID Vendedor    │ Nome         │ Total Vnd.  │ Faturamento (R$) │
├────────────────┼──────────────┼─────────────┼──────────────────┤
│ 1              │ João Silva   │ 12          │ R$ 5.999,50      │
│ 2              │ Maria Santos │ 8           │ R$ 3.200,00      │
└────────────────┴──────────────┴─────────────┴──────────────────┘

Detalhe Expandível (dentro de cada vendedor):
│ Data       │ Item            │ Qtd │ Valor Unit │ Valor Total  │
├────────────┼─────────────────┼─────┼────────────┼──────────────┤
│ 01/04/2026 │ Produto XYZ     │ 5   │ R$ 50     │ R$ 250,00    │
│ 01/04/2026 │ Serviço ABC     │ 1   │ R$ 100    │ R$ 100,00    │
│ 02/04/2026 │ Produto XYZ     │ 2   │ R$ 50     │ R$ 100,00    │

Espaçamento: Master band 30pt height, detail band 20pt height
Bordas: Master com linha dupla, detail com linha simples
Cores: Master fundo cinza, detail branco alternado

## PASSO 13: Validação Antes de Submeter
✅ View master existe (view_vendas_diarias)
✅ View detail existe (view_vendas_diarias - mesma)
✅ Campos em rules/views.json
✅ Jointura válida: vendedor_id existe em ambas
✅ Tipos coincidem: vendedor_id = INT em ambos
✅ Agrupado por master: vendedor_id (chave única) ✅
✅ Agrupado por detail: data, item_nome (registros filhos) ✅
✅ Cardinalidade: 1:N confirmada
✅ Layout realista ✅
```

### PROMPT FINAL PARA COPILOT:

```
Sou do time de deploy. Preciso gerar um relatório JasperReports customizado (MODO MASTER/DETAIL).

📋 DETALHES DO RELATÓRIO:

**Nome:** VENDEDOR_VENDAS_MASTERDETAIL
**Descrição:** Vendedor principal com detalhe de cada venda
**Formato:** MASTER_DETAIL (tabela pai com detalhe expandível)

**Cenário (Contexto):** Gerente comercial acompanha vendedor e suas vendas individuais. Master = vendedor (ID, nome, totalizações). Detail = vendas do vendedor (data, item, valores). Permite drilldown por vendedor com visibilidade completa de transações.

---

## MASTER (Tabela Principal)
**View Master:** view_vendas_diarias
**Agrupado Por (chave única):** vendedor_id, vendedor_nome
**Campos Master:**
- vendedor_id (ID)
- vendedor_nome (Nome)
- COUNT(*) as total_vendas (Total Vendas)
- SUM(valor_total) as faturamento_total (Faturamento)

**Filtros Master:**
- dataInicio (tipo: DATE, label: "Data Inicial")
- dataFim (tipo: DATE, label: "Data Final")

---

## DETAIL (Tabela Aninhada)
**View Detail:** view_vendas_diarias
**Agrupado Por (granularidade filha):** data, item_nome
**Campos Detail:**
- data (Data)
- item_nome (Item)
- quantidade (Qtd)
- valor_unitario (Valor Unit.)
- valor_total (Valor Total)

**Filtros Detail:**
- valorMinimoVenda (tipo: DECIMAL, label: "Valor Mínimo")

---

## JOINTURA Master → Detail
**Chave Master:** vendedor_id
**Chave Detail:** vendedor_id
**Jointura:** Master.vendedor_id = Detail.vendedor_id
**Cardinalidade:** 1:N

---

**Layout:** Portrait, master com background cinza, detail branco alternado, 
subreport iniciando logo após cada linha master

Seguindo as regras em `.github/copilot-instructions.md` e `rules/views.json`:

1. ✅ Validar: view_vendas_diarias existe, jointura válida (vendedor_id = INT em ambos)
2. 🔨 Gerar master.jrxml e detail.jrxml (ambos compatíveis com 6.2.0)
3. 🔧 Compilar detail.jasper ANTES de master.jasper
4. 🔧 Injetar parâmetro SUBREPORT_DETAIL_PATH em master
5. ✓ Gerar PDF master/detail com dados reais
6. 📦 Confirmar artefatos em output/VENDEDOR_VENDAS_MASTERDETAIL_{timestamp}/
```

---

## 📋 Checklist de Qualidade Fase 1: Prompts Evoluídos

### Exemplo 1 (Simples):
- [x] Nome claro e descritivo
- [x] Cenário documentado (contexto + público + frequência)
- [x] View válida (view_vendas_diarias)
- [x] Agrupado por declarado (data)
- [x] Campos existem em rules/views.json
- [x] Filtros com tipos válidos (DATE, DATE, STRING)
- [x] Tipo filtro STRING = campo VARCHAR ✅
- [x] Layout realista (tabela 7 colunas)
- [x] Prompt transcreve fielmente template
- [x] Chat pode gerar JRXML sem ambiguidade

### Exemplo 2 (Master/Detail):
- [x] Nome claro e sufixo "MASTERDETAIL"
- [x] Cenário documenta MASTER E DETAIL
- [x] View master válida (view_vendas_diarias)
- [x] View detail válida (view_vendas_diarias)
- [x] Agrupado por master é chave (vendedor_id)
- [x] Agrupado por detail é granularidade filha (data, item_nome)
- [x] Jointura 1:N clara (vendedor_id = vendedor_id)
- [x] Chave existe em ambas views ✅
- [x] Tipos coincidem (INT = INT) ✅
- [x] Campos master e detail existem em rules/views.json
- [x] Filtros master e detail com tipos válidos
- [x] Layout mostra master + detail expandível
- [x] Prompt transcreve fielmente template
- [x] Chat pode gerar master.jrxml + detail.jrxml sem ambiguidade

---

## 🎯 Critérios de Aceite Fase 1: APROVADOS ✅

**Entrega 1: Prompt Simples Evoluído**
- [x] Campo "Cenário" adicionado (PASSO 2)
- [x] Campo "Agrupado por" adicionado (PASSO 4)
- [x] Exemplo pronto documentado (EXEMPLO 1)
- [x] Prompt para Copilot inclui ambos campos
- [x] Version bumped: 1.0 → 1.1 (Fase 1)

**Entrega 2: Prompt Master/Detail**
- [x] Novo template criado (relatorio-master-detail.prompt.md)
- [x] Estrutura 13 passos (Info básicas através validação)
- [x] Contratomaster/detail documentado (10 passos)
- [x] Exemplo pronto documentado (EXEMPLO 2)
- [x] Prompt para Copilot inclui instrucoes master/detail
- [x] Claramente distinto de modo simples

**Entrega 3: Exemplos Prontos**
- [x] 1 exemplo simples completo (VENDAS_DIARIAS_SIMPLES)
- [x] 1 exemplo master/detail completo (VENDEDOR_VENDAS_MASTERDETAIL)
- [x] Ambos preenchimentos + prompts finais
- [x] Ambos validam contra rules/views.json
- [x] Ambos explicam Cenário e Agrupado por
- [x] Arquivo docs/EXEMPLOS-FASE-1.md criado

**Entrega 4: Transição**
- [x] Templates atual e novo coexistem (backward compat)
- [x] Escolha de formato explícita (relatorio-simples vs relatorio-master-detail)
- [x] Nenhuma quebra de fluxo atual (modo simples é default)
- [x] Documentação de escolha clara

---

**Fase 1 Status:** ✅ **COMPLETA & APROVADA**

Próximo: Fase 2 (Evolução de rules/views.json com bloco de relacionamentos)
