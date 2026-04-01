# 🔄 FASE 1: TRANSIÇÃO - Prompts Simples → Simples + Master/Detail

**Data**: 1º de Abril de 2026  
**Status**: Transição Backward-Compatible ✅

---

## 📌 O Que Mudou (Resumo)

### ANTES (Versão 1.0 - Pré Fase 1)
- 1 template: `relatorio-simples.prompt.md`
- Contrato: Nome, Descrição, View, Campos, Filtros, Layout
- Default: Modo simples (tabela com 4 bandas básicas)
- Público: Time de deploy (relatórios operacionais)

### DEPOIS (Versão 1.1 Fase 1 - Atual)
- 2 templates: `relatorio-simples.prompt.md` + `relatorio-master-detail.prompt.md`
- Contrato expandido: **+ Cenário** (contexto negócio) **+ Agrupado por** (dimensão)
- Novos formatos:
  - **Modo Simples**: Tabela com 1 nível (padrão, backward compatible)
  - **Modo Master/Detail**: Tabela pai com detalhe aninhado (novo)
- Público: Mesmo (time de deploy), mas com opções avançadas

---

## 🎯 Quando Usar Cada Template

### Escolha: Modo SIMPLES

**Descrição**: Relatório com 1 tabela, sem aninhamento.

**Use quando**:
- ✅ Quer apenas 1 view, 1 tabela linear
- ✅ Dados são simples (não precisa de relacionamento pai/filho)
- ✅ Quer agilidade máxima
- ✅ Exemplos: Vendas diárias, Pacientes atendidos, Uso de recursos

**Como**: `relatorio-simples.prompt.md`

```
Exemplo preenchimento:
Nome: VENDAS_DIARIAS_SIMPLES
Cenário: Equipe comercial acompanha vendas do dia
Agrupado por: data
View: view_vendas_diarias
Campos: data, item_nome, quantidade, valor_total, vendedor_nome
```

---

### Escolha: Modo MASTER/DETAIL

**Descrição**: Relatório com tabela pai (master) + tabela filha (detail) aninhada.

**Use quando**:
- ✅ Quer 2 views relacionadas (chave pai = chave filha)
- ✅ Dados têm relação 1:N clara (1 vendedor : N vendas)
- ✅ Quer drilldown visual (expandir/retrair detalhe)
- ✅ Exemplos: Vendedor → Vendas, Paciente → Atendimentos, Categoria → Produtos

**Como**: `relatorio-master-detail.prompt.md`

```
Exemplo preenchimento:
Nome: VENDEDOR_VENDAS_MASTERDETAIL
Cenário: Gerente valida performance de vendedor com detalhe de vendas
Agrupado por Master: vendedor_id, vendedor_nome
Agrupado por Detail: data, item_nome
View Master: view_vendas_diarias
View Detail: view_vendas_diarias
Jointura: Master.vendedor_id = Detail.vendedor_id
```

---

## 📚 Fluxo de Decisão (Árvore)

```
┌─ Você quer um relatório JasperReports?
│
├─ "Preciso de 1 tabela simples com dados lineares?"
│  │
│  ├─ SIM → USE: relatorio-simples.prompt.md ✅
│  │         (ex: Vendas Diárias, Pacientes Atendidos)
│  │
│  └─ NÃO
│     │
│     └─ "Tenho 2 views relacionadas? (pai:filho = 1:N)?"
│        │
│        ├─ SIM → USE: relatorio-master-detail.prompt.md ✅
│        │        (ex: Vendedor→Vendas, Paciente→Atendimentos)
│        │
│        └─ NÃO → Volte a PASSO 1: relatorio-simples.prompt.md (default)
│                  ou contate arquiteto para design customizado
```

---

## 🔀 Compatibilidade Retroativa (Backward Compatible)

### ✅ O QUE NÃO MUDOU

1. **Comando de geração** (continua igual):
   ```bash
   node scripts/validate.js output/[nome].jrxml rules/views.json
   node scripts/compile.js output/[nome].jrxml --pdf
   java -jar jasper-runner.jar pdf-with-data ...
   ```

2. **Saída dos artefatos** (continua igual):
   - `.jrxml` (JRXML source)
   - `.jasper` (compiled binary)
   - `.pdf` (preview)
   - `metadata.json`

3. **Rules/Views** (continua igual):
   - `rules/views.json` mantém estrutura de validação
   - Campos e tipos não mudaram
   - Views válidas continuam as mesmas

4. **Modo simples é DEFAULT**:
   - Se você não especificar formato, assume SIMPLES
   - Time de deploy confortável continua usando modo antigo
   - Nenhuma quebra de fluxo existente

### ✨ O QUE EVOLUIU

1. **Contrato de entrada**:
   - +Campo: `Cenário` (contexto do negócio, reduz ambiguidade SQL)
   - +Campo: `Agrupado por` (define dimensão/granularidade principal)
   - Ambos são RECOMENDADOS (não obrigatórios) para modo simples
   - Ambos são OBRIGATÓRIOS para modo master/detail

2. **Novo formato disponível**:
   - Relatório master/detail (opcional, não quebra nada)
   - Requer template separado `relatorio-master-detail.prompt.md`
   - Gera 2 JRXML: `master.jrxml` + `detail.jrxml`
   - Gera 2 Jasper: `master.jasper` + `detail.jasper`

3. **Documentação stackeada**:
   - Exemplos simples: `docs/EXEMPLOS-FASE-1.md` (Exemplo 1)
   - Exemplos master/detail: `docs/EXEMPLOS-FASE-1.md` (Exemplo 2)
   - Prompts coexistem: `prompts/relatorio-simples.prompt.md` + `relatorio-master-detail.prompt.md`

---

## ✅ CHECKLIST: Transição Seg

ura

- [x] **Modo simples backward compatible?** SIM (0 breaking changes)
- [x] **Comandos continuam iguais?** SIM
- [x] **Saída de artefatos igual?** SIM
- [x] **Rules/views.json intacto?** SIM
- [x] **Novo template NÃO quebra antigo?** SIM (coexistem)
- [x] **Exemplos documentados (simples + master/detail)?** SIM
- [x] **Time deployment pode ignorar Cenário/Agrupado por?** SIM (recomendados, não obrigatórios para simples)
- [x] **Time deployment consegue escolher formato?** SIM (template explícito)

---

## 🚀 Como Time de Deploy Procede

### Cenário 1: "Quero fazer como sempre, modo simples"
```
1. Abrir: prompts/relatorio-simples.prompt.md
2. Preencher campos (Nome, View, Campos, Filtros, Layout)
3. Novidade: PREENCHER "Cenário" e "Agrupado por" (recomendado)
4. Copiar PROMPT PARA COPILOT
5. Paste em Copilot chat (Ctrl+I)
6. Aguardar artefatos em output/
7. Deploy conforme sempre
```

**Impacto**: ✅ ZERO (compatível total, Cenário/Agrupado por é opcional)

### Cenário 2: "Quero novo formato master/detail"
```
1. Abrir: prompts/relatorio-master-detail.prompt.md
2. Decidir View Master e View Detail
3. Preencher Agrupado por MASTER (chave identidade)
4. Preencher Agrupado por DETAIL (granularidade filha)
5. Preencher Jointura
6. Copiar PROMPT PARA COPILOT
7. Paste em Copilot (Ctrl+I)
8. Aguardar artefatos: master.jrxml + detail.jrxml em output/
9. Deploy com ambos .jasper files
```

**Impacto**: ✅ NEW (novo fluxo, sem quebra do antigo)

---

## 🎓 Adoção Gradual (Recomendado)

### Semana 1 (Agora):
- Time de deploy lê: `docs/EXEMPLOS-FASE-1.md` (5 min)
- Time escolhe: Continuar simples OU experimentar master/detail
- Feedback: "Cenário + Agrupado por ajudaram?" ou "Complexo?"

### Semana 2+:
- Consolidar padrão por tipo de relatório
- Se simples for suficiente: continuar (sem Cenário/Agrupado por)
- Se master/detail for valor: usar novo template
- Evolução é OPTIONAL

---

## 📖 Onde Encontrar Informações

| Recurso | Locação | Propósito |
|---------|---------|-----------|
| **Prompt Simples (Novo)** | `prompts/relatorio-simples.prompt.md` (v1.1) | Usar para modo simples |
| **Prompt Master/Detail** | `prompts/relatorio-master-detail.prompt.md` (NOVO) | Usar para master/detail |
| **Exemplos** | `docs/EXEMPLOS-FASE-1.md` | 2 exemplos prontos (simples + M/D) |
| **Regras/Views** | `rules/views.json` | (SEM MUDANÇA) |
| **Compatibilidade** | `docs/FASE_1_TRANSICAO.md` (este arquivo) | Você está aqui |
| **Próximas Fases** | `docs/PLANO-EVOLUCAO-MASTER-DETAIL.md` | Fases 2-8 |

---

## ❓ FAQ de Transição

### P: "Eu continuar gerando relatórios simples como antes?"
**R:** Sim. Abra `relatorio-simples.prompt.md`, preencha, envie para Copilot. 100% compatível.

### P: "Cenário e Agrupado por são OBRIGATÓRIOS?"
**R:** Para modo SIMPLES: recomendados, não obrigatórios. Para master/detail: sim, obrigatórios.

### P: "Como Copilot sabe se é simples ou master/detail?"
**R:** Você escolhe ao abrir o template (relatorio-simples.prompt.md OU relatorio-master-detail.prompt.md). Prompt final deixa claro: `**Formato:** SIMPLE` ou `**Formato:** MASTER_DETAIL`.

### P: "Minhas queries precisam mudar?"
**R:** Não. Modo simples continua QueryString parametrizada. Master/detail adiciona parametro de chave para o subreport.

### P: "Posso misturar master/detail?"
**R:** Não em v1 (Fase 1-2). Apenas 2 níveis: master + 1 detail. Múltiplos detailsem Fase 3+.

### P: "Minhas regras em rules/views.json mudam?"
**R:** Não em Fase 1. Fase 2 adiciona bloco opcional `relations` (sem quebrar validação simples).

### P: "Posso usar modelo visual (.jrxml) com master/detail?"
**R:** Sim. Modelo fornece estilo para AMBOS master.jrxml e detail.jrxml (Fase 2+).

---

## 🔗 Próximos Passos (Fases 2-8)

Confira `docs/PLANO-EVOLUCAO-MASTER-DETAIL.md` para roadmap:
- **Fase 2**: Evolução de rules/views.json (bloco `relations`)
- **Fase 3**: Validador semântico master/detail
- **Fase 4**: Pipeline compilação em 2 estágios
- **Fase 5**: Runner Java e parametros subreport
- **Fase 6**: Metadata e observabilidade
- **Fase 7**: Documentação operacional
- **Fase 8**: Testes de regressão + go-live

Cada fase com gate de aprovação e checklist.

---

## ✅ APROVAÇÃO: Fase 1 COMPLETA

- [x] Prompt simples evoluído (v1.0 → v1.1)
- [x] Prompt master/detail criado
- [x] 2 exemplos prontos documentados
- [x] Backward compatibility garantida
- [x] Documentação transição clara
- [x] Time deployment sabe próximos passos

**Status**: 🚀 **PRONTO PARA FASE 2**

---

**Documento**: FASE_1_TRANSICAO.md  
**Responsável**: GitHub Copilot (Arquiteto Sênior)  
**Data**: 1º de Abril de 2026  
**Versão**: 1.0
