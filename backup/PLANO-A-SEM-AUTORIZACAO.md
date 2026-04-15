# PLANO A — Melhorias sem alteração de arquivos protegidos

**Escopo permitido:** `prompts/` e `docs/GUIA-CREATE-JASPER-REPORTS.md`  
**Autorização necessária:** Nenhuma  
**Origem:** Análise de 4 relatórios gerados por usuário real (`analysis/*.md`)  
**Status:** Aguardando aprovação para implementação

---

## A1 — Problema 4: Adicionar PASSO 0 nos templates de prompt

**Diagnóstico:** Em todos os 4 testes o usuário enviou 2 mensagens separadas: primeiro
atualizar `views.json` com campos e tipos, depois gerar o relatório. Os templates atuais
não unificam essa etapa — o `PASSO 5: Campos Desejados` lista o que aparece no relatório,
mas não instrui o usuário a declarar campos novos com tipos para o `views.json`.

### Ação em `prompts/relatorio-simples.prompt.md`

Inserir antes do PASSO 1 existente:

```markdown
## PASSO 0: Declaração de Campos na View (obrigatório se view não existe em rules/views.json)

Se a view que você vai usar ainda não tem campos registrados em rules/views.json,
liste aqui cada campo com nome, descrição e tipo antes de preencher o restante.
A IA atualizará o rules/views.json como PRIMEIRA ação, antes de gerar o JRXML.

View: [nome_da_view]
Campo: [nome] | Descrição: [desc] | Tipo: [varchar(N) / int / float8 / timestamp / boolean]
Campo: ...

Se a view já existe com todos os campos necessários → deixe em branco.
```

E no bloco **PROMPT PARA O COPILOT** (seção final do template), adicionar logo no topo:

```
📌 PASSO 0 — Campos a adicionar na view (se necessário):
View: [nome]
Campo: [campo] | Descrição: [desc] | Tipo: [tipo]
(em branco se view já está completa em rules/views.json)
```

### Ação em `prompts/relatorio-master-detail.prompt.md`

Mesmo PASSO 0, mas com 2 blocos separados (view master + view detail):

```markdown
## PASSO 0: Declaração de Campos nas Views (obrigatório se views não existem em rules/views.json)

View Master: [nome]
Campo: [nome] | Descrição: [desc] | Tipo: [tipo]
...

View Detail: [nome]
Campo: [nome] | Descrição: [desc] | Tipo: [tipo]
...

Se as views já existem com todos os campos em rules/views.json → deixe em branco.
```

E no bloco **PROMPT PARA O COPILOT**, adicionar logo no topo:

```
📌 PASSO 0 — Campos a adicionar nas views (se necessário):
View Master: [nome]
  Campo: [campo] | Descrição: [desc] | Tipo: [tipo]
View Detail: [nome]
  Campo: [campo] | Descrição: [desc] | Tipo: [tipo]
(em branco se views já estão completas em rules/views.json)
```

---

## A2 — Problema 5: Especificação de bandas estruturada nos templates

**Diagnóstico:** O Teste 1 (REL_ACCOUNT) gerou 6 instruções de ajuste de layout após a
geração inicial. Problemas concretos: `textField` no `groupHeader` com largura/altura
incorretas (texto não visível), linha horizontal ausente no `pageFooter`, variável de total
de páginas invertida, título e cabeçalho não repetidos em cada página.

O template atual descreve layout em texto livre, o que é ambíguo para a IA gerar o JRXML
corretamente de primeira.

### Ação em `prompts/relatorio-simples.prompt.md` e `relatorio-master-detail.prompt.md`

No PASSO 7 (Layout e Estilo), adicionar campo estruturado de bandas após o campo de texto
livre existente:

```
Especificação de Bandas:
  pageHeader    : [Título + data/hora + <line> na parte inferior | Impresso em cada página: Sim/Não]
  columnHeader  : [Cabeçalho em negrito + <line> na parte inferior]
  groupHeader   : [Texto "Label: $F{campo}" | Altura do objeto textField: 16px]
  groupFooter   : [<line> no topo + contador de registros do grupo]
  pageFooter    : [<line> no topo + "Total de Registros: $V{REPORT_COUNT}" + "Página $V{PAGE_NUMBER} de $V{PAGE_COUNT}"]
```

---

## A3 — Problema 5 (cont.): Guia de layout por banda em `docs/GUIA-CREATE-JASPER-REPORTS.md`

**Diagnóstico:** Não existe documentação de referência sobre altura recomendada, objetos
obrigatórios e variáveis corretas por banda. O erro de `$V{PAGE_NUMBER}` no lugar de
`$V{PAGE_COUNT}` ocorreu em 2 dos 4 testes (Testes 1 e 3).

### Ação: Adicionar seção `10. Especificação de layout por banda`

| Banda          | Altura recomendada | Objetos obrigatórios                                                                              | Observação                                                         |
| -------------- | ------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `pageHeader`   | 60px               | `staticText` (título), `textField` (data/hora), `<line>` no fundo                                 | Usar `printWhenDetailOverflows="true"` para repetir em cada página |
| `columnHeader` | 25px               | Labels em negrito, `<line>` no fundo                                                              | —                                                                  |
| `groupHeader`  | 20px               | `textField` com expressão `"Label: " + $F{campo}`, largura = pageWidth - leftMargin - rightMargin | Altura mínima do objeto: 16px                                      |
| `groupFooter`  | 25px               | `<line>` no topo, `textField` com `$V{<NomeGrupo>_COUNT}`                                         | —                                                                  |
| `pageFooter`   | 30px               | `<line>` no topo, total de registros, paginação                                                   | Ver aviso abaixo                                                   |

**⚠️ ATENÇÃO — Variáveis de paginação:**

```
$V{PAGE_NUMBER}  →  página atual  (ex.: 1, 2, 3...)
$V{PAGE_COUNT}   →  total de páginas do relatório

Formato correto no rodapé:
  "Página " + $V{PAGE_NUMBER} + " de " + $V{PAGE_COUNT}

Erro comum: usar PAGE_NUMBER nos dois lugares → rodapé exibe "Página 2 de 2" em vez de "Página 2 de 5"
```

---

## A4 — Problema 3 (temporário): Documentar limitação de 1 nível de detail

**Diagnóstico:** O Teste 3 (REL_FAT_PACIENTE) tentou criar topologia master → detail1 →
detail2. Sem suporte declarado, a IA gerou JRXML por tentativa e erro durante 12
instruções. Enquanto o Plano B (suporte a 2 níveis) não for implementado, a limitação deve
ser documentada explicitamente para evitar que a IA tente gerar algo não suportado.

### Ação: Adicionar aviso nas seções 1 e 5 de `docs/GUIA-CREATE-JASPER-REPORTS.md`

```
⚠️ LIMITAÇÃO ATUAL: MASTER_DETAIL suporta apenas 1 nível de detail (master → detail).
Topologia master → detail1 → detail2 NÃO é suportada pelo pipeline atual.
Se o seu relatório exige 2 níveis aninhados, aguarde liberação do Plano B
ou reestruture como 2 relatórios MASTER_DETAIL independentes.
```

---

## Resumo dos arquivos modificados

| Arquivo                                     | Tipo de mudança                                                     | Item |
| ------------------------------------------- | ------------------------------------------------------------------- | ---- |
| `prompts/relatorio-simples.prompt.md`       | Adicionar PASSO 0 antes do PASSO 1                                  | A1   |
| `prompts/relatorio-simples.prompt.md`       | Adicionar campo de PASSO 0 no PROMPT COPILOT                        | A1   |
| `prompts/relatorio-simples.prompt.md`       | Adicionar especificação de bandas no PASSO 7                        | A2   |
| `prompts/relatorio-master-detail.prompt.md` | Adicionar PASSO 0 com 2 views antes do PASSO 1                      | A1   |
| `prompts/relatorio-master-detail.prompt.md` | Adicionar campo de PASSO 0 no PROMPT COPILOT                        | A1   |
| `prompts/relatorio-master-detail.prompt.md` | Adicionar especificação de bandas no PASSO 7                        | A2   |
| `docs/GUIA-CREATE-JASPER-REPORTS.md`        | Adicionar seção 10 (guia de bandas com tabela e aviso de paginação) | A3   |
| `docs/GUIA-CREATE-JASPER-REPORTS.md`        | Adicionar aviso de limitação 1-level nas seções 1 e 5               | A4   |

## Arquivos protegidos — confirmação de não modificação

❌ Não modifica: `scripts/`, `setup/`, `package.json`, `pom.xml`,
`.github/copilot-instructions.md`, `rules/views.json`

## Verificação pós-implementação

1. Criar um relatório SIMPLE usando o template atualizado — PASSO 0 deve aparecer antes do PASSO 1.
2. Verificar que o PROMPT PARA COPILOT instrui a IA a atualizar `views.json` como primeiro passo.
3. Gerar um relatório com `groupHeader` e `pageFooter` usando especificação de bandas estruturada — confirmar que sai correto de primeira sem instruções extras.
4. Tentar descrever 2 levels de detail — aviso de limitação deve ser visível antes de qualquer geração.
