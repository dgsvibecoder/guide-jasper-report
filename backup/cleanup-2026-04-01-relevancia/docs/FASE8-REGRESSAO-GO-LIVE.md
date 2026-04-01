# FASE 8 - REGRESSAO E GO-LIVE CONTROLADO

Este documento operacionaliza a Fase 8 do plano com evidencia objetiva de nao regressao.

## 1. Objetivo

Liberar o fluxo SIMPLE e MASTER_DETAIL com seguranca, garantindo:

- smoke tests positivos para os dois modos
- cenarios negativos com falha esperada
- matriz de compatibilidade operacional
- rollout por ondas com gate de aprovacao

## 2. Suite Oficial de Regressao

Script oficial:

```bash
node scripts/test-phase8-regression.js
```

Modo completo com PDF (quando conexao DB estiver disponivel):

```bash
node scripts/test-phase8-regression.js --with-pdf
```

Saida de evidencia:

- output/phase8-regression/latest-results.json

Cobertura da suite:

1. Smoke SIMPLE: validate + compile
2. Smoke MASTER_DETAIL: validate semantico + compile 2 estagios
3. Negativo SIMPLE: view invalida (falha esperada)
4. Negativo MASTER_DETAIL: relationship invalida (falha esperada)
5. Negativo MASTER_DETAIL: subreport path hardcoded (falha esperada)

Observacao operacional (with-pdf):

- O smoke SIMPLE em modo with-pdf usa fixture com view accessivel no ambiente atual:
	- output/SMOKE_TEST_SIMPLES_005/smoke_test_accessops.jrxml

## 3. Criterios de Aprovacao

A Fase 8 e aprovada quando:

- `latest-results.json.summary.failed = 0`
- nenhum smoke positivo falha
- todos negativos retornam exit code esperado
- no modo `--with-pdf`, os PDFs sao gerados sem erro

## 4. Matriz de Compatibilidade

| Ambiente | Runner Fase 8 | Status | Evidencia |
|---|---|---|---|
| Windows (PowerShell) | `node scripts/test-phase8-regression.js` | READY | Script cross-platform (Node.js) |
| WSL (Ubuntu) | `node scripts/test-phase8-regression.js` | VALIDATED | Execucao local com `latest-results.json` |
| Linux (CI/Server) | `node scripts/test-phase8-regression.js` | READY FOR VALIDATION | Mesmo comando, sem dependencia de shell bash |

Observacao:

- O modo `--with-pdf` depende de conectividade real com banco e credenciais DB.

## 5. Plano de Rollout por Ondas

### Onda 1 - Homologacao Interna

Escopo:

- Executar suite Fase 8 em ambiente interno
- Rodar pelo menos 1x em modo compile-only
- Rodar 1x em modo with-pdf

Gate:

- 100% de sucesso na suite
- Sem regressao em `SMOKE_TEST_SIMPLES_001`
- `SMOKE_TEST_MD_001` compilando em 2 estagios

Rollback:

- Suspender uso MASTER_DETAIL e manter SIMPLE como default

### Onda 2 - Piloto com 1 Relatorio Real

Escopo:

- Selecionar 1 relatorio MASTER_DETAIL real
- Executar fluxo completo com dados reais

Gate:

- Taxa de sucesso >= 95% no piloto
- Diagnostico de falha em <= 5 minutos via log + metadata

Rollback:

- Voltar para relatorio simples equivalente ou versao homologada anterior

### Onda 3 - Liberacao Geral

Escopo:

- Disponibilizar trilha SIMPLE e MASTER_DETAIL para time de deploy
- Executar regressao Fase 8 antes de cada release operacional

Gate:

- Nenhuma regressao em SIMPLE
- Operacao seguindo checklist sem suporte de engenharia

Rollback:

- Bloquear temporariamente requests MASTER_DETAIL
- Manter pipeline SIMPLE inalterado

## 6. Checklist Operacional de Go-Live

- [ ] `node scripts/test-phase8-regression.js` sem falhas
- [ ] `node scripts/test-phase8-regression.js --with-pdf` sem falhas
- [ ] output/phase8-regression/latest-results.json versionado na evidência da release
- [ ] Quickstart revisado pelo time de deploy
- [ ] 1 piloto real concluido com sucesso

## 7. Evidencia de Execucao Final (2026-04-01)

- Compile-only: output/phase8-regression/latest-results-compile-only.json
	- summary.status = SUCCESS
	- summary.passed = 8
	- summary.failed = 0
- With-pdf: output/phase8-regression/latest-results-with-pdf.json
	- summary.status = SUCCESS
	- summary.passed = 8
	- summary.failed = 0
- Logs de execucao:
	- output/phase8-regression/run-compile-only-final.log
	- output/phase8-regression/run-with-pdf-final.log
