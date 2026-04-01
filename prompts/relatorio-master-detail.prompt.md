# 📋 TEMPLATE: Gerador de Relatório Master/Detail

## ℹ️ Instruções de Uso

Preencha este template para gerar relatório em **FORMATO MASTER/DETAIL** 
(tabela pai com detalhes aninhados).

**Quando usar:**
- Você quer uma tabela principal (master) com linhas expandíveis (detail)
- Exemplo: Vendedor (master) → Lista de vendas do vendedor (detail)
- Exemplo: Paciente (master) → Histórico de atendimentos (detail)

**Quando NÃO usar:**
- Se você quer apenas um relatório simples com uma tabela
- Use `relatorio-simples.prompt.md` nesse caso

---

## ✅ CHECKLIST PRÉ-PREENCHIMENTO (Validação Obrigatória)

**Antes de submeter, verifique:**

- [ ] View master existe em `rules/views.json`? (copiar nome exatamente como definido)
- [ ] View detail existe em `rules/views.json`? (copiar nome exatamente como definido)
- [ ] Relacionamento (masterView, detailView) existe em `rules/views.json.relationships`? (verificar campo obrigatório `"validationRequired": true`)
- [ ] Cardinalidade do relacionamento é **1:N**? (nunca N:N ou 1:1 em MASTER_DETAIL)
- [ ] Chave master (ex: vendedor_id) existe em AMBAS as views (master e detail)?
- [ ] Tipos das chaves coincidem? (INT=INT, VARCHAR=VARCHAR, não misturar tipos diferentes)
- [ ] Nome relatório único, sem espaços, **UPPERCASE_WITH_UNDERSCORES**

**❌ Se algum check falhar:** Corrija o input antes de enviar ao Copilot. Não prossiga.

---

## 📝 PASSO 1: Informações Básicas

```
Nome do Relatório: [Exemplo: VENDEDOR_VENDAS_DETAIL]
Descrição: [Exemplo: Relatório de vendedores com detalhe de vendas por item]
```

---

## 📖 PASSO 2: Cenário (Contexto do Negócio) ⭐ NOVO

Descreva o contexto, motivação e públicos para AMBOS master e detail.

**Exemplos de Cenário:**
- "Gerente comercial acompanha vendedor e suas vendas diárias. Master = vendedor (nome, ID). Detail = vendas do vendedor (data, item, valor). Permite analisar desempenho por vendedor."
- "Diretor clínica monitora pacientes e seus atendimentos. Master = paciente (nome, data registro). Detail = histórico de atendimentos (data, motivo, profissional). Permite rastrear todo histórico de um paciente."

```
Cenário Master/Detail:
[Exemplo: 
MASTER (Principal): Vendedor - agregação por elemento da equipe comercial
DETAIL (Aninhado): Vendas do Vendedor - lista de transações de cada vendedor
USO: Gerente valida performance por vendedor + detalhe de cada venda
PÚBLICO: Gerência + Equipe Comercial
]
```

---

## 🔗 PASSO 3: Fonte de Dados - MASTER (View Principal)

Escolha a view que será a tabela PAI (master).

**Views disponíveis em rules/views.json:**
- `view_vendas_diarias` - Campos: data, item_nome, item_codigo, quantidade, valor_unitario, valor_total, vendedor_nome, vendedor_id, categoria
- `view_pacientes_atendidos` - Campos: paciente_id, paciente_nome, data_registro, tipo_atendimento
- `accessops` - Campos: usuario, data_acesso, tipo_operacao, resultado
- `view_receita_por_mes` - Campos: mes, categoria, receita, lucro

```
View Master (Principal): [Exemplo: view_vendas_diarias]
```

---

## 📊 PASSO 4: Agrupado Por MASTER (Dimensão Principal) ⭐ NOVO

Defina qual campo na view master será o agrupamento (esse será a chave que une master → detail).

**Exemplos:**
- `vendedor_id` + `vendedor_nome` → Agrupa por vendedor (1 linha master por vendedor)
- `paciente_id` + `paciente_nome` → Agrupa por paciente (1 linha master por paciente)
- `categoria` → Agrupa por categoria de produto

**Regra CRÍTICA:**
- Campo DEVE existir em rules/views.json
- Campo DEVE ser a chave de união para o detail (ver PASSO 7)
- Use campos que IDENTIFICAM UNICAMENTE o master

```
Agrupado Por MASTER (chave identidade):
[Exemplo: vendedor_id, vendedor_nome]

Justificativa:
[Exemplo: Cada linha master é um vendedor único, identificado por vendedor_id]
```

---

## 📊 PASSO 5: Campos MASTER (Cabeçalho Principal)

Liste os campos que devem aparecer **no cabeçalho master** (tabela pai).

**Dica:** Geralmente incluir chave + nome + agregações (totais, contagens).

```
Campos Master (separe por vírgula):
[Exemplo: vendedor_id, vendedor_nome, COUNT(*) as total_vendas, SUM(valor_total) as faturamento]
```

---

## 🔗 PASSO 6: Fonte de Dados - DETAIL (View Filha)

Escolha a view que será **aninhada** dentro de cada linha master (detail).

```
View Detail (Filha): [Exemplo: view_vendas_diarias]
```

---

## 📊 PASSO 7: Agrupado Por DETAIL (Granularidade Filha) ⭐ NOVO

Defina a granularidade do detail (cada linha dentro do detalhe).

**Exemplos:**
- `data` → Cada linha detail é uma venda por data
- `data, item_nome` → Cada linha é data + item específico
- `id_venda` → Cada linha é uma venda única

**Regra CRÍTICA:**
- Campo DEVE existir na view detail
- Campo DEVE estar em vista_detail E no contrato de relacionamento

```
Agrupado Por DETAIL (linhas dentro do detail):
[Exemplo: data, item_nome]

Justificativa:
[Exemplo: Cada linha detail mostra uma venda específica (data + item) do vendedor]
```

---

## 📊 PASSO 8: Campos DETAIL (Grade Filha)

Liste os campos que devem aparecer **na tabela detail** (linhas expandidas).

**Dica:** Geralmente usar todos os campos transacionais relevantes.

```
Campos Detail (separe por vírgula):
[Exemplo: data, item_nome, quantidade, valor_unitario, valor_total]
```

---

## 🔗 PASSO 9: Relacionamento Master → Detail

Defina como master e detail se conectam (CHAVE DE JOINTURA).

**Regra:**
- Campo master DEVE coincidir em nome/tipo com campo detail
- Ambos devem existir no contrato (rules/views.json)

**Exemplos:**
- Master: `vendedor_id` = Detail: `vendedor_id` → Filtra vendas do vendedor
- Master: `paciente_id` = Detail: `paciente_id` → Filtra atendimentos do paciente

```
Chave Master: [Exemplo: vendedor_id]
Chave Detail: [Exemplo: vendedor_id]

SQL de Jointura (confirme a relação):
Master.vendedor_id = Detail.vendedor_id

Cardinalidade Esperada:
[Exemplo: 1 vendedor : N venda (1:N)]
```

---

## 🔍 PASSO 10: Filtros MASTER (Parâmetros do Cabeçalho)

Defina filtros que serão aplicados apenas à tabela master.

**Tipos de filtro disponíveis:**
- `DATE` - Data (ex: 2026-03-30)
- `INT` - Número inteiro (ex: 1001)
- `STRING` - Texto (ex: "João")
- `DECIMAL` - Número com casa decimal (ex: 99.99)

```
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

[Adicione mais se necessário]
```

---

## 🔍 PASSO 11: Filtros DETAIL (Parâmetros da Grade)

Defina filtros opcionais para a tabela detail (aplicados ao subreport).

```
Filtro Detail 1:
  Nome: valorMinimoVenda
  Tipo: DECIMAL
  Obrigatório: Não
  Default: null
  Label: "Valor Mínimo (R$)"

[Adicione mais se necessário]
```

---

## 🎨 PASSO 12: Layout e Estilo

Descreva como o relatório master/detail deve ser exibido.

```
Orientação: Portrait (padrão) ou Landscape

Tabela Master (Cabeçalho):
Semelhante a:

┌──────────────────────────────────┐
│ ID Vendedor | Nome   | Faturamento│
├──────────────────────────────────┤
│ 1           │ João   │ R$ 99.999  │
│ 2           │ Maria  │ R$ 88.888  │
└──────────────────────────────────┘

Tabela Detail (Aninhada/Expandível):
Dentro de cada linha master, mostrar:

│ Data       │ Item     │ Qtd │ Valor    │
├────────────┼──────────┼─────┼──────────┤
│ 01/04/2026 │ Produto1 │ 5   │ R$ 50,00 │
│ 02/04/2026 │ Produto2 │ 3   │ R$ 45,00 │

Espaçamento: Detalhe começa logo abaixo do master
Bordas: Simples (linha)
Cores: Alternadas (master), sem cor (detail)
```

---

## ✅ PASSO 13: Validação Antes de Submeter

Checklist:
- [ ] Cenário está claro (master E detail)?
- [ ] View master existe em rules/views.json?
- [ ] View detail existe em rules/views.json?
- [ ] Todos campos master existem na view master?
- [ ] Todos campos detail existem na view detail?
- [ ] Chaves de jointura existem em AMBAS as views?
- [ ] Tipos das chaves coincidem (INT = INT, STRING = STRING)?
- [ ] Filtros têm tipos válidos?
- [ ] Agrupado por master é único/não-agregado?
- [ ] Agrupado por detail representa registros filhos?
- [ ] Layout é realista?

---

## 🎯 PROMPT PARA O COPILOT

**Cole este prompt na Copilot Chat (Ctrl+I) após preencher acima:**

```
Sou do time de deploy. Preciso gerar um relatório JasperReports customizado (MODO MASTER/DETAIL).

📋 DETALHES DO RELATÓRIO:

**Nome:** [NOME_RELATÓRIO]
**Descrição:** [DESCRIÇÃO]
**Formato:** MASTER_DETAIL (tabela pai com detalhe expandível)

**Cenário (Contexto):** [CENÁRIO_MASTER_DETAIL]

---

## MASTER (Tabela Principal)

**View Master:** [VIEW_MASTER]
**Agrupado Por (chave única):** [CAMPO_AGRUPAMENTO_MASTER]
**Campos Master:**
[CAMPO1] (label: "[Label1]")
[CAMPO2] (label: "[Label2]")
...

**Filtros Master:**
- [FILTRO1] (tipo: [TIPO], label: "[Label]")

---

## DETAIL (Tabela Aninhada)

**View Detail:** [VIEW_DETAIL]
**Agrupado Por (granularidade filha):** [CAMPO_AGRUPAMENTO_DETAIL]
**Campos Detail:**
[CAMPO1] (label: "[Label1]")
[CAMPO2] (label: "[Label2]")
...

**Filtros Detail:**
- [FILTRO1] (tipo: [TIPO], label: "[Label]")

---

## JOINTURA Master → Detail

**Chave Master:** [CHAVE_MASTER]
**Chave Detail:** [CHAVE_DETAIL]
**Jointura:** Master.[CHAVE_MASTER] = Detail.[CHAVE_DETAIL]
**Cardinalidade:** 1:N

---

**Layout:**
[DESCRIÇÃO LAYOUT DO PASSO 12]

---

📋 INSTRUÇÕES PARA COPILOT:

Seguindo as regras em `.github/copilot-instructions.md` e info em `rules/views.json`:

1. ✅ **Validar Input Master/Detail:**
   - View master existe?
   - View detail existe?
   - Campos master existem em validFields?
   - Campos detail existem em validFields?
   - Jointura é válida (ambas views têm chaves iguais)?
   - Cardinalidade 1:N (verificar em rules/views.json.relations)?

2. 🔨 **Gerar Master JRXML:**
   - Arquivo: `output/[NOME_RELATÓRIO]_{timestamp}/master.jrxml`
   - XML bem-formado (encoding UTF-8)
   - QueryString parametrizada para master com $P{filterName}
   - Compatível com JasperReports 6.2.0 (NO uuid/kind/splitType)
   - 4 bandas: title, columnHeader, detail, pageFooter
   - Detail band contém subreport declaração
   - Fonts: DejaVu Sans

3. 🔨 **Gerar Detail JRXML:**
   - Arquivo: `output/[NOME_RELATÓRIO]_{timestamp}/detail.jrxml`
   - QueryString parametrizado com $P{MASTER_KEY} (chave de filtro do master)
   - Compatível com JasperReports 6.2.0
   - 4 bandas: title (vazio), columnHeader, detail, pageFooter
   - Recebe parametro: SUBREPORT_MASTER_KEY_VALUE (valor da chave master passado pelo master)

4. 🔧 **Compilar Detail ANTES do Master:**
   - Executar: `node scripts/compile.js output/[NOME]/detail.jrxml --pdf`
   - Gerar: detail.jasper
   - Verificar: Sem ERROs em .log

5. 🔧 **Injetar Parametro de Subreport no Master:**
   - Adicionar ao master.jrxml:
     - Parâmetro: SUBREPORT_DETAIL_PATH = "output/.../detail.jasper"
     - Subreport tag com datasetRun parametrizado: $P{MASTER_KEY_VALUE}

6. 🔧 **Compilar Master:**
   - Executar: `node scripts/compile.js output/[NOME]/master.jrxml --pdf`
   - Gerar: master.jasper
   - Verificar: master.jasper existe, sem ERROs

7. ✓ **Validar:**
   - PDF master/detail gerado com dados reais
   - Detail subrelatorio preenchido com registros filhos
   - Filtros funcionam em ambos master e detail
   - Sem SELECT *, sem hardcode (tudo parametrizado)
   - metadata.json com topology master/detail
   - **NOVO:** Se usou modelo visual, verificar .jrxml-style.json (fallbackApplied: false = OK)

8. 📦 **Entregar:**
   - Listar arquivos: master.jrxml, detail.jrxml, master.jasper, detail.jasper, master.pdf, logs, metadata.json
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
   - `master.jrxml` + `detail.jrxml` → abra em editor, confira XML
   - `master.jasper` + `detail.jasper` → compilados
   - `master.pdf` → visualize master/detail renderizado
   - `.log` → confira se tudo OK (WARNING ok, ERROR não)
4. 🚀 Pronto para deploy: copie `.jrxml` + `.jasper` (master e detail) para sua app

---

## 🆘 Se Algo Deu Errado

1. Verifique `.log` em `output/{NOME_RELATÓRIO}_{timestamp}/`
2. Leia `docs/TROUBLESHOOTING.md`
3. Problemas comuns master/detail:
   - **"Subreport path not found"** → Check detail.jasper path é absoluto/relativo correto
   - **"Detail vazio"** → Verificar jointura (chave master passa corretamente para detail)
   - **"Tipo mismatch em chave"** → Chave master (INT) vs detail (STRING)?
4. Revalide com: `node scripts/validate.js output/.../master.jrxml`

---

## 📚 Exemplos Completos

Veja em `docs/EXEMPLOS-FASE-1.md`:
- Exemplo 1: Relatório Simples (Vendas Diárias)
- Exemplo 2: Master/Detail (Vendedor → Vendas)
- Exemplo 3: Master/Detail (Paciente → Atendimentos)

---

**Versão do Template:** 1.0 (Fase 1) | **Data:** 1º de Abril de 2026 | **Status:** Ready for Fase 2
