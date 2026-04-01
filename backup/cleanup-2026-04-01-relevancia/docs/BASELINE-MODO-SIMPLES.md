# Baseline de Modo Simples - Congelamento Fase 0

Data de Congelamento: April 1, 2026

## 1. Comando Crítico de Validação (Modo Simples)

Este é o comando autorizado para validar relatórios simples. QUALQUER mudança de interface ou comportamento requer aprovação explícita.

```bash
node scripts/validate.js output/[RELATORIO_TIMESTAMP]/[relatorio].jrxml
```

Saída esperada em sucesso:

```
OK XML well-formed (report: [RELATORIO_NAME])
OK [N] parameters found
OK [4]/4 key bands found
[WARN messages if any]
OK VALIDATION SUCCESS
```

Código de saída esperado: 0

## 2. Comando Crítico de Compilação (Modo Simples)

```bash
node scripts/compile.js output/[RELATORIO_TIMESTAMP]/[relatorio].jrxml --pdf
```

Saída esperada em sucesso:

```
OK Generated [path]/[relatorio].jasper
OK Generated [path]/[relatorio].pdf
OK Generated [path]/[relatorio].log
OK Generated [path]/metadata.json
OK Style tracking: nativa
```

Artefatos gerados (obrigatórios):

- {relatorio}.jrxml
- {relatorio}.jasper
- {relatorio}.pdf
- {relatorio}.log
- metadata.json

Código de saída esperado: 0

## 3. Estrutura de Output Congelada

```
output/
  [RELATORIO_TIMESTAMP]/
    ├── [relatorio].jrxml         ← Arquivo entrada
    ├── [relatorio].jasper        ← Compilado, obrigatório
    ├── [relatorio].pdf           ← Preview, obrigatório
    ├── [relatorio].log           ← Log de validação/compilação
    └── metadata.json             ← Versioning e rastreabilidade
```

Estrutura de metadata.json esperada em modo simples:

- reportName
- generatedAt
- compiledAt
- source
- outputs (jrxml, jasper, pdf, log)
- checksums (jrxml, jasper, pdf)
- jrxml (file, hash)
- jasper (file, hash, size, version="JasperReports 6.2.0")
- pdf (file, size, hasData)
- styleSource (type="nativa" para relatórios simples sem modelo)
- dataSource (view, fields, filters)
- validation (xmlValid, sqlValid, contaminationCheck, typeConsistency)

## 4. Contrato de Prompt Simples (Baseline)

Campos estruturados esperados no prompt relatorio-simples.prompt.md:

- Nome do Relatório
- Descrição (ou NOVO: Cenário - a evoluir em Fase 1)
- View Selecionada
- (NOVO em Fase 1: Agrupado por)
- Campos Desejados
- Filtros (Parâmetros)
- Layout e Estilo
- Modelo Visual JRXML (Opcional)

Validações esperadas no prompt:

- Sem SELECT *
- Query com WHERE 1=1 + filtros parametrizados ($P{...})
- 4 bandas: title, columnHeader, detail, pageFooter
- Fonts: DejaVu Sans
- Parâmetros com tipos válidos (DATE, INT, STRING, DECIMAL)

## 5. Regras de Validação Congeladas (rules/views.json)

- View existe e está estruturada em rules/views.json
- Todos campos solicitados estão em validFields
- Tipos SQL/JRXML são consistentes (não há mismatch INT/VARCHAR)
- Atributos esperados por campo: name, type, label, isKey, filterable, aggregatable, example

## 6. Artefatos Críticos do Contrato

Arquivos que definem o modo simples (versão congelada):

- `.github/copilot-instructions.md` (seções de relatorio simples)
- `prompts/relatorio-simples.prompt.md`
- `rules/views.json`
- `scripts/validate.js` (validação de modo simples)
- `scripts/compile.js` (compilação de modo simples)
- `scripts/jasper-runner/pom.xml` (JasperReports 6.2.0)
- `scripts/jasper-runner/src/main/java/com/guide/jasper/JasperRunner.java` (pdf-with-data e pdf-from-jasper)
- `docs/QUICKSTART.md` (trilha de modo simples)

## 7. Documentação Congelada (Não Quebrar)

- README.md (referências ao modo simples)
- docs/QUICKSTART.md (entrada para novo usuário em modo simples)
- docs/EXAMPLES.md (se tiver exemplos simples)
- docs/TROUBLESHOOTING.md (se tiver troubleshooting de modo simples)

## 8. Plano de Rollback por Alteração Futura

Qualquer mudança nas fases seguintes que impacte modo simples requer:

1. Validação em ambiente de teste isolado
2. Execução de bateria de testes de regressão (ver docs/TESTE-REGRESSAO-SIMPLES.md)
3. Aprovação explícita antes de merge

Se regressão detectada:

- Reverter alteração imediatamente
- Reabrir Fase 0
- Revisar estratégia
- Remarcar Fase 1

## 9. Checksum de Baseline

Arquivos críticos congelados (SHA256):

[A ser preenchido com valores reais após execução de audit]

Exemplo:
```
scripts/validate.js: [SHA256]
scripts/compile.js: [SHA256]
prompts/relatorio-simples.prompt.md: [SHA256]
rules/views.json: [SHA256]
.github/copilot-instructions.md: [SHA256]
```

## 10. Validação de Congelamento

Checklist de aceite para Fase 0:

- [ ] Todos comandos críticos documentados
- [ ] Estrutura de output definida
- [ ] Contrato de prompt congelado
- [ ] Regras de validação listadas
- [ ] Artefatos críticos inventariados
- [ ] Documentação congelada identificada
- [ ] Plano de rollback definido
- [ ] Checksums de baseline coletados (próximo passo)
- [ ] Matriz de compatibilidade criada
- [ ] Casos de teste de regressão definidos

Aprovação: [A ser preenchida]

---

**Próximo passo Fase 0:**

1. Criar docs/MATRIZ-COMPATIBILIDADE-SIMPLES.md
2. Criar docs/TESTE-REGRESSAO-SIMPLES.md
3. Coletar checksums de baseline dos arquivos críticos
