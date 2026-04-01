# Evidencias de Solicitacao e Geracao MASTER_DETAIL

Data da evidencia: 2026-04-01

## 1. Evidencia de solicitacao (prompt)

Template oficial de solicitacao MASTER_DETAIL disponivel em:

- prompts/relatorio-master-detail.prompt.md

Exemplo minimo de solicitacao:

```text
Nome do relatorio: EVIDENCIA_MASTER_DETAIL
Formato: MASTER_DETAIL
View master: accessops
View detail: view_pacientes_atendidos
Chave de relacao: idpaziente = paciente_id
Agrupado por (master): idpaziente
Agrupado por (detail): data_atendimento
Campos master: idaccesso, idpaziente, nomeazienda, datainserimento
Campos detail: paciente_id, data_atendimento, procedimento_descricao, valor_procedimento
```

## 2. Evidencia de geracao (execucao real)

Comando executado:

```bash
node scripts/compile.js output/EVIDENCIA_MASTER_DETAIL_20260401-143854/master.jrxml \
  --detail output/EVIDENCIA_MASTER_DETAIL_20260401-143854/detail.jrxml \
  --relationship accessops_medicalEvents \
  --pdf
```

Resultado do pipeline:

- Stage 1/5 validacao master: OK
- Stage 2/5 validacao detail: OK
- Stage 2.5 validacao semantica M/D: OK
- Stage 3/5 compilacao detail.jasper: OK
- Stage 4/5 compilacao master.jasper: OK
- Stage 5/5 geracao master.pdf: OK

## 3. Artefatos gerados (prova)

Pasta da execucao:

- output/EVIDENCIA_MASTER_DETAIL_20260401-143854

Arquivos encontrados:

- output/EVIDENCIA_MASTER_DETAIL_20260401-143854/master.jrxml
- output/EVIDENCIA_MASTER_DETAIL_20260401-143854/detail.jrxml
- output/EVIDENCIA_MASTER_DETAIL_20260401-143854/master.jasper
- output/EVIDENCIA_MASTER_DETAIL_20260401-143854/detail.jasper
- output/EVIDENCIA_MASTER_DETAIL_20260401-143854/master.pdf
- output/EVIDENCIA_MASTER_DETAIL_20260401-143854/master.log
- output/EVIDENCIA_MASTER_DETAIL_20260401-143854/metadata.json

## 4. Evidencia tecnica no metadata

Arquivo:

- output/EVIDENCIA_MASTER_DETAIL_20260401-143854/metadata.json

Campos criticos:

- format = MASTER_DETAIL
- reportTopology.type = MASTER_DETAIL
- reportTopology.masterFile = master.jrxml
- reportTopology.detailFiles = [detail.jrxml]
- outputs.pdf = master.pdf
- validation.semanticValidation = passed

## 5. Observacao importante

O PDF MASTER_DETAIL existe e esta sendo gerado com nome padrao master.pdf (na pasta da execucao). Caso a busca tenha sido por nome contendo detail, o arquivo nao sera encontrado, pois o PDF final no modo master/detail e o PDF do master.

## 6. Correcao de PDF vazio (2026-04-01)

Causa identificada no master.jrxml de smoke:

- Filtro de data obrigatorio no SQL:
  - `AND datainserimento >= $P{dataInicio}`
  - `AND datainserimento <= $P{dataFim}`
- Sem parametros informados no `pdf-with-data`, o resultado podia ficar vazio.

Correcao aplicada:

- Filtro de data tornou-se opcional:
  - `AND ($P{dataInicio} IS NULL OR datainserimento >= $P{dataInicio})`
  - `AND ($P{dataFim} IS NULL OR datainserimento <= $P{dataFim})`

Nova execucao de evidencia (com PDF nao vazio):

- Pasta: `output/EVIDENCIA_MASTER_DETAIL_NONEMPTY_20260401-144101`
- Arquivos:
  - `output/EVIDENCIA_MASTER_DETAIL_NONEMPTY_20260401-144101/master.pdf`
  - `output/EVIDENCIA_MASTER_DETAIL_NONEMPTY_20260401-144101/master.log`
  - `output/EVIDENCIA_MASTER_DETAIL_NONEMPTY_20260401-144101/metadata.json`

Comprovacao tecnica no metadata:

- `diagnostics.emptyDataRisk.pdfSizeBytes = 1514`
- `diagnostics.emptyDataRisk.possibleEmptyData = false`
