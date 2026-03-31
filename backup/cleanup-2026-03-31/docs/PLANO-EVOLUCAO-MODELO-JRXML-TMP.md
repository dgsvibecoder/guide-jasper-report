# Plano Faseado de Evolucao do Setup para Uso de JRXML-Modelo em /tmp

## Status

- Estado: proposta para avaliacao
- Data: 2026-03-31
- Tipo: plano arquitetural, sem execucao
- Restricao atual: nenhuma mudanca de codigo, prompt, contrato ou pipeline deve ser aplicada antes de autorizacao explicita

## Objetivo

Evoluir o setup atual de construcao de relatorios Jasper para aceitar arquivos `.jrxml` colocados em `/tmp` como referencia opcional de estilo e design no momento da geracao de um novo relatorio.

Premissa central desta evolucao:

- o `.jrxml` de `/tmp` sera usado apenas como fonte visual e estrutural de layout
- nenhum dado do modelo podera ser herdado ou considerado na geracao do novo relatorio
- a query SQL, os fields, os parameters, os grupos de dados e qualquer semantica de negocio continuarao vindo exclusivamente do pedido atual e das regras em `rules/views.json`

## Problema Arquitetural Atual

O workspace ja possui uma linha de evolucao para separar estilo de conteudo por meio de `style blueprint`, mas ela esta orientada principalmente a PDF legado. Hoje o setup:

- valida view, campos e tipos a partir do JRXML final em `scripts/validate.js`
- compila e gera PDF com dados reais a partir do JRXML final em `scripts/compile.js`
- extrai estilo a partir de PDF legado e reaplica esse estilo em um JRXML fonte por meio das fases 1, 2 e 3

O gap atual e este:

- nao ha contrato formal para receber um `.jrxml` de modelo em `/tmp` como insumo de estilo
- nao ha isolamento explicito entre metadados visuais do modelo e artefatos de dados do modelo
- nao ha regra operacional clara para impedir que query, field, parameter, variable, group, sortField ou expressions do modelo contaminem o novo relatorio

## Principios Arquiteturais da Evolucao

1. Separacao estrita entre semantica e apresentacao.
2. O modelo em `/tmp` e insumo visual, nunca insumo de dados.
3. O JRXML final continua sendo compilavel e validavel pelas regras atuais.
4. O fluxo fail-safe atual deve ser mantido.
5. A introducao do novo modo deve ser incremental, com fallback claro para o fluxo existente.
6. O time de deploy deve operar por prompts simples, sem precisar entender Jasper internamente.

## Escopo da Evolucao

### Dentro do escopo

- Formalizar a pasta raiz `/tmp` como area de entrada de modelos JRXML de estilo (repositorio git, nao ignorado).
- Definir contrato para referenciar um modelo no pedido de geracao (insercao manual em `/tmp`).
- Criar mecanismo de extracao de `style blueprint` a partir de `.jrxml` em vez de PDF, ou mecanismo equivalente com o mesmo efeito.
- Garantir sanitizacao total do modelo para uso exclusivamente visual e de design.
- Suporte a qualquer modelo de relatorio: tabulares simples, agregacoes, subreports, charts, crosstabs e componentes visuais complexos.
- Ajustar prompts, documentacao, validacoes e metadata do pipeline.
- Adicionar rastreabilidade de origem do estilo em metadata.json quando tecnicamente necessario e seguro.

### Fora do escopo

- Reaproveitamento de SQL do modelo.
- Reaproveitamento automatico de bandas dinamicas orientadas a dados sem curadoria.
- Reaproveitamento de textos estaticos do cabecalho ou corpo do modelo (foco absoluto: estilo e design, nao conteudo).
- Alteracao da regra de uso de dados reais na validacao final do PDF.

## Visao de Solucao

Introduzir um novo modo de entrada no pipeline:

- modo atual: gerar relatorio a partir do pedido textual e regras da view
- novo modo: gerar relatorio a partir do pedido textual e regras da view, com um `modeloVisualJrxml` em `/tmp` usado apenas para derivar tokens de estilo, geometria de pagina, margens, hierarquia tipografica, cores, posicionamento de elementos visuais, banda e estrutura de layout, incluindo subreports, charts e crosstabs como placeholders visuais (nao como datasets herdados)

Em termos de arquitetura, a mudanca ideal nao e "copiar um JRXML e trocar a query". Isso seria fraco e perigoso. A mudanca correta e:

1. extrair do modelo um artefato intermediario seguro de estilo, isolando completamente semantica de dados
2. validar que esse artefato intermediario nao carrega semantica de dados, expressoes dinamicas vinculadas a fields/parameters ou logica de agrupamento
3. aplicar esse artefato a um JRXML novo, gerado a partir do pedido atual, respeitando a estrutura e dados do novo relatorio

O modelo pode conter qualquer tipo de componente (subreports, charts, crosstabs), mas sua presenca sera traduzida apenas como referencia visual de layout e posicionamento, nunca como heranca de dataset ou semantica.

## Contrato Proposto

### Entrada operacional

O prompt de geracao passa a aceitar algo conceitualmente equivalente a:

```md
Nome do Relatorio: ...
View Selecionada: ...
Campos Desejados: ...
Filtros: ...
Modelo Visual JRXML: /tmp/arquivo-modelo.jrxml
Regra de Uso do Modelo: usar apenas estilo e design; ignorar dados, query, fields e expressions do modelo
```

### Regra de ouro

Ao detectar `Modelo Visual JRXML`, o agente deve assumir obrigatoriamente:

- query do modelo: ignorar
- parameters do modelo: ignorar, salvo se convertidos explicitamente em metadados visuais neutros
- fields do modelo: ignorar
- variables do modelo: ignorar
- groups do modelo: ignorar por padrao
- sortFields do modelo: ignorar
- dataset/subDataset do modelo: ignorar
- expressions do modelo: ignorar, exceto expressoes estaticas puramente textuais reutilizaveis apos sanitizacao
- estilos visuais, coordenadas, margens, tamanhos de banda, tipografia, cores, bordas e elementos decorativos compativeis: considerar

## Respostas as Perguntas de Decisao

1. **A pasta `/tmp` deve ser versionada, ignorada por Git ou parcialmente ignorada?**
   - Decisao: Nao precisa versionar conteudo, mas a pasta deve estar presente no repositorio git (incluida em `.gitkeep` ou similar para estrutura).

2. **O modelo JRXML sera sempre inserido manualmente em `/tmp` ou tambem podera vir por automacao futura?**
   - Decisao: Manualmente, na primeira entrega. Automacao futura pode ser considerada em iteracoes posteriores.

3. **A primeira entrega deve suportar apenas relatorios tabulares simples?**
   - Decisao: Nao. A primeira entrega deve suportar qualquer modelo de relatorio inserido na pasta: tabulares, com agregacoes, subreports, charts, crosstabs e componentes proprietarios.

4. **Queremos permitir reaproveitamento de textos estaticos do cabecalho do modelo, desde que sanitizados?**
   - Decisao: Nao. Foco absoluto apenas em estilo e design, sem reaproveitamento de textos ou conteudo semantico do modelo.

5. **A origem do estilo deve aparecer no metadata.json final e tambem em log textual dedicado?**
   - Decisao: Deve ser avaliacao tecnica. Incluir em metadata.json quando necessario para auditoria e seguranca; logs textuais quando apropriado para rastreabilidade operacional.

## Fases Propostas

## Fase 0 - Definicao de Contrato e Guardrails

### Objetivo

Fechar o contrato funcional antes de qualquer implementacao.

### Entregas

- Definicao formal da pasta `/tmp` como area de entrada temporaria para modelos.
- Convencao de nomenclatura e resolucao de caminho para modelos JRXML.
- Matriz do que pode e do que nao pode ser herdado do modelo.
- Decisao sobre o formato do artefato intermediario:
  - opcao A: evoluir `STYLE-BLUEPRINT.schema.json`
  - opcao B: criar um schema complementar, por exemplo `JRXML-STYLE-BLUEPRINT.schema.json`
- Definicao de compatibilidade minima com JasperReports 6.2.0.

### Criterios de aceite

- Existe uma tabela objetiva de heranca permitida e heranca proibida.
- Existe uma regra textual inequívoca: "modelo JRXML em `/tmp` nao participa da semantica de dados e conteudo".
- Formalizacao da pasta `/tmp` no repositorio git com `.gitkeep` ou estrutura minima.
- O time de deploy consegue entender quando usar e quando nao usar o modelo.
- Documentacao clara sobre o que nao pode ser reaproveitado: textos, query, fields, parameters, dataset logic, group logic.
- Documentacao clara sobre o que pode ser reaproveitado: dimensoes, margens, cores, fontes, posicionamento, estrutura de bandas (visual), placeholders de subreports, charts, crosstabs.

### Risco mitigado

- Evita uma implementacao ambigua que misture layout e dado.
- Evita reaproveitamento indevido de conteudo textual ou semantico.

## Fase 1 - Sanitizacao e Extracao Visual do JRXML-Modelo

### Objetivo

Criar um mecanismo confiavel para ler um `.jrxml` modelo e derivar apenas informacao visual segura.

### Entregas

- Script ou modulo de extracao de estilo a partir de JRXML.
- Normalizacao dos seguintes elementos do modelo:
  - dimensao da pagina
  - orientacao
  - margens
  - largura de coluna
  - fontes e tamanhos por papel visual
  - cores e bordas
  - alturas de bandas
  - coordenadas de elementos estaticos
  - padrao visual de `title`, `columnHeader`, `detail`, `pageFooter` e opcionalmente `summary`
- Exclusao explicita dos seguintes elementos durante a extracao:
  - `queryString`
  - `field`
  - `parameter`
  - `variable`
  - `group` (logica de agrupamento, nao visual)
  - `sortField`
  - `subDataset`
  - `datasetRun`
  - expressoes dependentes de `$F{}`, `$P{}`, `$V{}`
  - textos dinamicos ou estaticos com semantica de dados (labels de colunas, cabecalhos que refletem dados do modelo)

- Preservacao, como referencias visuais puras, de:
  - `subreport` (como placeholder de layout e posicionamento)
  - `chart` (como placeholder de layout e posicionamento)
  - `crosstab` (como placeholder de layout e posicionamento)
  - `staticText` (apenas estrutura e geometria, nao conteudo textual)
  - `rectangle`, `line`, `ellipse` (elementos decorativos)

### Decisao tecnica recomendada

Usar abordagem de extracao para artefato intermediario, nao abordagem de clonagem direta do JRXML. Isso preserva a arquitetura que ja existe para `style blueprint` e reduz risco de vazamento semantico.

### Criterios de aceite

- Dado um JRXML-modelo, o sistema produz um artefato de estilo sem SQL nem referencias a campos/parametros/variaveis.
- O artefato resultante e suficiente para reproduzir a assinatura visual principal do modelo.

### Riscos

- Modelos com layout excessivamente acoplado a expressoes dinamicas podem perder fidelidade visual.

## Fase 2 - Aplicacao do Estilo ao JRXML Novo

### Objetivo

Permitir que o JRXML gerado para um novo relatorio receba o estilo do modelo, mantendo seus dados totalmente independentes.

### Entregas

- Evolucao do pipeline de aplicacao de blueprint para aceitar blueprint originado de JRXML-modelo.
- Regras de mapeamento entre estrutura visual do modelo e estrutura do novo relatorio.
- Fallback deterministico quando o modelo nao puder ser reaplicado com seguranca.

### Estrategia recomendada

- Reaproveitar ao maximo a camada atual de `apply-style-blueprint-phase*`.
- Tratar o blueprint vindo de JRXML como mesma classe de artefato, desde que o schema comporte essa origem.
- Introduzir score de compatibilidade entre o layout do modelo e a estrutura do relatorio alvo.

### Criterios de aceite

- O JRXML final continua obedecendo `rules/views.json` e as regras correntes de validacao.
- O layout final herda estilo do modelo sem carregar query ou metadados de dados do modelo.
- Em caso de baixa compatibilidade, o sistema cai para template padrao seguro e registra esse fallback.

### Riscos

- Mapeamento incorreto de largura de colunas quando o novo relatorio tiver cardinalidade visual muito diferente do modelo.

## Fase 3 - Evolucao de Prompt, UX Operacional e Documentacao

### Objetivo

Expor a capacidade nova de forma segura para o time de deploy.

### Entregas

- Atualizacao do prompt base em `prompts/relatorio-simples.prompt.md` para incluir referencia opcional a modelo JRXML em `/tmp`.
- Atualizacao das instrucoes em `.github/copilot-instructions.md` com nova ordem fail-safe.
- Guia rapido em `docs` com exemplos de uso correto e anti-padroes.
- Mensagens de erro orientadas a acao quando o modelo:
  - nao existir
  - estiver fora de `/tmp`
  - tiver sintaxe invalida
  - contiver recursos nao suportados para heranca visual

### Criterios de aceite

- O operador consegue pedir “gere usando o estilo do modelo X” sem ambiguidade.
- O prompt reforca que o modelo nao serve como fonte de dados.
- Os anti-padroes ficam documentados de modo operacional.

### Riscos

- Sem uma UX textual muito explicita, o operador pode presumir que o modelo define tambem campos e filtros.

## Fase 4 - Validacao, Auditoria e Metadata

### Objetivo

Tornar a nova capacidade auditavel e segura em ambiente de producao.

### Entregas

- Evolucao de validacoes para checar origem visual do relatorio.
- Novos campos em `metadata.json`, por exemplo:
  - `styleSource.type = jrxml-template`
  - `styleSource.path`
  - `styleSource.sha256`
  - `styleSource.extractionMode`
  - `styleSource.compatibilityScore`
  - `styleSource.fallbackApplied`
- Regra de validacao que falha se o JRXML final preservar indevidamente sinais semanticos do modelo.
- Checklist de auditoria para confirmar que o modelo foi usado apenas visualmente.

### Validacoes recomendadas

- O JRXML final nao pode repetir a `queryString` do modelo.
- O JRXML final nao pode conter campos do modelo que nao pertençam ao novo relatorio.
- O JRXML final nao pode conter parameters herdados do modelo sem uso no pedido atual.
- O log deve declarar de forma objetiva se houve:
  - extracao visual com sucesso
  - aplicacao parcial
  - fallback para template seguro

### Criterios de aceite

- A origem do estilo fica rastreavel.
- A ausencia de contaminacao semantica fica verificavel.

## Fase 5 - Suporte a Layouts Complexos com Subreports, Charts e Crosstabs

### Objetivo

Garantir que modelos contendo subreports, charts e crosstabs possam ser utilizados como referencia visual sem que sua logica de dados seja herdada.

### Entregas

- Mecanismo de deteccao e isolamento de subreports no modelo como placeholders visuais (posicao, tamanho, altura estimada).
- Mecanismo de deteccao e isolamento de charts no modelo como placeholders visuais.
- Mecanismo de deteccao e isolamento de crosstabs no modelo como placeholders visuais (estrutura de colunas, linhas, tamanho).
- Validacao que impede heranca automatica de `subreportDatasetRun`, `chartDataset` ou logica de definicao de crosstab.
- Regra que traduz subreports/charts/crosstabs do modelo como "estrutura de layout esperada" no JRXML novo, sem copiar conteudo de dataset.

### Criterios de aceite

- Um modelo contendo subreports, charts ou crosstabs pode ser analisado sem erro.
- A extracao visual preserva posicao, tamanho e ordem desses componentes.
- O JRXML novo que herde esse layout visual pode compilar e executar com seus proprios datasets, sem herdar datasets do modelo.
- Logs indicam claramente quando subreports/charts/crosstabs foram detectados e tratados como placeholders visuais.

### Riscos

- Incompatibilidade entre tipos de dataset esperados pelo placeholder (ex: chart que espera um tipo de dados especifico) e dados reais do novo relatorio.
- Necessidade de ajuste manual do novo relatorio para "preencher" os placeholders com logica correta.

## Impactos Tecnicos Esperados

### Scripts

- Novo extrator de estilo a partir de JRXML, ou extensao dos extratores atuais.
- Possivel evolucao do `compile.js` apenas para metadata e rastreabilidade, nao para mudar a natureza da compilacao.
- Evolucao do `validate.js` para detectar contaminacao semantica do modelo.

### Contratos e schemas

- Evolucao do schema de blueprint para suportar `source.inputMode = jrxml-template-path` ou equivalente.
- Inclusao de campos de proveniencia e sanitizacao.

### Prompts e instrucoes

- Novo campo opcional para `Modelo Visual JRXML`.
- Regras reforcadas de “estilo apenas”.

### Documentacao

- Quickstart complementar para uso com modelo.
- Troubleshooting especifico para incompatibilidades entre modelo e relatorio alvo.

## Riscos Arquiteturais Principais

1. Clonagem indevida do modelo em vez de extracao visual.
2. Vazamento de semantica via expressions embutidas em elementos visuais.
3. Falsa sensacao de compatibilidade quando o modelo usa componentes nao suportados.
4. Aumento de complexidade operacional para o time de deploy se o prompt nao for minimalista.
5. Fragilidade em layouts muito dependentes de coordenadas absolutas.

## Mitigacoes Recomendadas

1. Tornar a sanitizacao uma etapa obrigatoria, nunca opcional.
2. Registrar no metadata o hash do modelo e o resultado da sanitizacao.
3. Introduzir score de compatibilidade e fallback seguro.
4. Limitar o escopo inicial a elementos estaticos e bandas canonicas.
5. Exigir validacao positiva antes de compilar com `--pdf`.

## Ordem de Implementacao Recomendada

1. Fechar contrato e guardrails.
2. Implementar extracao segura de estilo de JRXML-modelo.
3. Reaplicar esse artefato a JRXML novo.
4. Endurecer validacao e metadata.
5. So depois expor no prompt operacional geral.

Essa ordem reduz risco porque evita liberar UX antes de haver isolamento tecnico suficiente.

## Criterios de Pronto para Autorizacao de Implementacao

- O time concorda com a formalizacao da pasta `/tmp` na raiz.
- Existe concordancia sobre a estrategia de artefato intermediario, e nao clonagem direta.
- Existe concordancia sobre o recorte inicial de suporte visual.
- Existe concordancia sobre fallback obrigatorio em caso de baixa compatibilidade.
- Existe concordancia sobre os novos campos de auditoria em metadata.

## Recomendacao Executiva

Recomendo aprovar a evolucao em duas ondas alinhado com as decisoes do time:

### Onda 1 (Primeira Entrega)

- Fases 0, 1, 2, 3, 4 e 5
- Suporte completo a qualquer modelo de relatorio: tabulares, agregacoes, subreports, charts, crosstabs
- Foco absoluto em estilo e design visual, zero reaproveitamento de conteudo textual ou semantico
- Pasta `/tmp` formalizada no repositorio git
- Insercao manual de modelos
- Rastreabilidade em metadata.json conforme necessario tecnico
- Compilacao, validacao e fall-safe integrados

### Onda 2 (Melhorias Futuras)

- Automacao de insercao de modelos (se necessario)
- Ampliacao de regras de compatibilidade e validacao
- Otimizacoes de performance em extracao de estilo
- Suporte a componentes proprietarios adicionais conforme surjam demandas

Essa abordagem reduz risco ao manter separacao absoluta entre estilo e dado desde a primeira entrega, e aproveita a base ja existente de `style blueprint` sem reescrever o pipeline inteiro.



## Conclusao

A evolucao e viavel e consistente com a arquitetura atual, desde que seja tratada como extensao da estrategia de `style blueprint`, e nao como reutilizacao direta do JRXML-modelo. O ponto tecnico decisivo e manter separacao absoluta entre semantica de dados e heranca visual. Se essa fronteira for respeitada no contrato, nos scripts e na auditoria, o novo modo tem boa chance de entregar ganho operacional real sem comprometer a confiabilidade do setup.