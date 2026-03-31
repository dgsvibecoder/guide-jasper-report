# FASE 0 - STATUS: CONCLUÍDA ✅

**Data de Conclusão**: 2026-03-31  
**Responsável**: Implementação Onda 1  
**Escopo**: Definição de Contrato e Guardrails  

---

## ✅ Entregas Completadas

### 1. Formalização da Pasta `/tmp` no Repositório Git

- ✅ Pasta `/tmp` criada na raiz do workspace
- ✅ Arquivo `.gitkeep` com documentação mínima adicionado
- ✅ Pasta será versionada no git (estrutura presente)
- ✅ Conteúdo de modelos JRXML não será versionado (conforme decisão)

**Localização**: `c:\Area-de-Trabalho\General-Workspace\guide-jasper-report\tmp\.gitkeep`

---

### 2. Contrato Formal de Uso

- ✅ Documento `CONTRATO-MODELO-JRXML-TMP.md` criado em `docs`
- ✅ Definição inequívoca: "JRXML-Modelo em `/tmp` nunca participa da semântica de dados"
- ✅ Convenção de nomenclatura formalizada
- ✅ Operação no pedido de geração documentada

**Localização**: `docs/CONTRATO-MODELO-JRXML-TMP.md`

**Seções**:
- Definição Formal: O que é JRXML-Modelo
- Convenção de Nomenclatura e Resolução
- Matriz de Herança: Permitido vs. Proibido
- Regra Inequívoca (Ouro)
- Compatibilidade com JasperReports 6.2.0
- Critérios de Aceitação

---

### 3. Matriz de Herança: Permitido vs. Proibido

Documentada em `CONTRATO-MODELO-JRXML-TMP.md`, seção 3:

#### ❌ PROIBIDO (Nunca Herdado)

| Elemento | Razão |
|----------|-------|
| `<queryString>` | SQL específica do novo relatório |
| `<field>` | Vêm do pedido + validação rules/views.json |
| `<parameter>` | Vêm do pedido de geração |
| `<variable>` | Acopladas a lógica de dados |
| `<group>` | Agrupamentos específicos de cada query |
| `<sortField>` | Ordenação = semântica de dados |
| `<subDataset>` | Datasets secundários para subreports |
| `<datasetRun>` | Binding de dados em subreports |
| Expressões `$F{}`, `$P{}`, `$V{}` | Referências dinâmicas |
| Texto dinâmico em staticText | Labels que refletem dados |
| Lógica condicional acoplada | Visibilidade por `$F{}`, `$P{}` |

#### ✅ PERMITIDO (Sempre Herdado)

| Elemento | Descrição |
|----------|-----------|
| Dimensões da página | Width, height |
| Orientação | Portrait, Landscape |
| Margens | Left, right, top, bottom |
| Largura de coluna | Cálculo visual |
| Alturas de bandas | Title, header, detail, footer |
| Tipografia | Família, tamanho, bold, italic, cor |
| Cores | Texto, fundo, bordas, acentos |
| Bordas e linhas | Largura, estilo |
| Estrutura de bandas (visual) | Presença canonical |
| Posicionamento de elementos estáticos | Coordenadas X, Y |
| Elementos decorativos | Rectangles, lines, ellipses |

#### ⚠️ Componentes Complexos (Placeholders Visuais)

| Componente | Regra |
|------------|-------|
| `<subreport>` | Placeholder visual (posição, tamanho). **NÃO** herdará dataset |
| `<chart>` | Placeholder visual (posição, tamanho, tipo). **NÃO** herdará `chartDataset` |
| `<crosstab>` | Placeholder visual (posição, tamanho, estrutura). **NÃO** herdará `crosstabDataset` |
| `<frame>` | Container visual (posição, tamanho, bordas) |
| `<image>` | Logotipo/decorativo (não dinâmico) |

---

### 4. Decisão sobre Formato do Artefato Intermediário

**Escolha: Opção A - Evoluir `STYLE-BLUEPRINT.schema.json`**

- ✅ Schema não será duplicado
- ✅ Compatibilidade com pipeline existente mantida
- ✅ Novo `inputMode` adicionado: `jrxml-template-path`

**Atualização em `docs/STYLE-BLUEPRINT.schema.json`**:

```json
"inputMode": {
  "type": "string",
  "enum": [
    "attachment",
    "tmp-path",
    "jrxml-template-path"  // NOVO
  ]
}
```

Novos campos opcionais:
- `jrxmlModelPath`: Caminho do arquivo JRXML-modelo
- `jrxmlModelSha256`: Hash para auditoria
- `mimeType`: Pode ser `"application/pdf"`, `"text/xml"`, `"application/xml"`

---

### 5. Compatibilidade com JasperReports 6.2.0

- ✅ Regra técnica formalizada
- ✅ Atributos/elementos da versão 6.2.0 serão usados
- ✅ Atributos 6.17+ serão stripados durante extração (Fase 1)
- ✅ Validação será integrada no script extrator

**Restrições**:
- ❌ Não usar `uuid`, `kind`, `splitType` (6.17+)
- ✅ Apenas atributos conhecidos em 6.2.0

---

### 6. Documentação para o Time de Deploy

Ambos documentos contêm:

**CONTRATO**:
- Seção 8: O que Fazer (✅) e O que NÃO Fazer (❌)
- Seção 9: Critérios de Aceitação

---

## ✅ Critérios de Aceite (Fase 0) - TODOS ATENDIDOS

- ✅ Existe uma tabela objetiva de herança permitida e proibida (Matriz na seção 3 do Contrato)
- ✅ Existe uma regra textual inequívoca: "modelo JRXML em `/tmp` não participa da semântica de dados e conteúdo" (Regra de Ouro, seção 4)
- ✅ Formalização da pasta `/tmp` no repositório git com `.gitkeep` (presente)
- ✅ O time consegue entender quando usar/não usar modelo (Seção 8 do Contrato)
- ✅ Documentação clara sobre o que não pode ser reaproveitado (Matriz ❌ Proibido)
- ✅ Documentação clara sobre o que pode ser reaproveitado (Matriz ✅ Permitido)

---

## 🚀 Próxima Fase

**Fase 1**: Sanitização e Extração Visual do JRXML-Modelo

Próximas entregas:
1. Script de extração `extract-style-blueprint-from-jrxml.js`
2. Lógica de sanitização que remove toda semântica de dados
3. Geração de artefato intermediário compatível com `STYLE-BLUEPRINT.schema.json`
4. Validação de compatibilidade com JasperReports 6.2.0

---

**FIM DO RELATÓRIO DE FASE 0**
