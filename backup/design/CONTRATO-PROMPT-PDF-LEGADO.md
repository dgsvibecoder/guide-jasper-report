# Contrato de Entrada de Prompt - PDF Legado para Reuso de Layout/Estilo

## Finalidade
Definir o contrato oficial para prompts que solicitam reaplicacao de layout e estilo a partir de um PDF legado no fluxo JasperReports 6.2.0.

## Regras de Escopo
- O processo deve interpretar somente layout e estilo.
- O processo nao deve reutilizar SQL, dados sensiveis, regras de negocio ou conteudo textual do legado para o novo relatorio.
- O processo deve manter as regras do projeto para SQL parametrizado e validacao da view/campos.

## Modos de Entrada do PDF Legado
- Modo 1: arquivo anexado no prompt.
- Modo 2: caminho absoluto em /tmp informado no prompt.

## Campos Obrigatorios
1. nome_relatorio
2. descricao_relatorio
3. pdf_legado
4. view
5. campos
6. filtros
7. agrupamento
8. ordenacao
9. bandas_obrigatorias

## Campos Opcionais
1. fidelidade_visual: baixo | medio | alto
2. secoes_prioritarias: title | columnHeader | detail | pageFooter
3. restricoes_branding: paleta/fontes aprovadas
4. observacoes_layout

## Contrato Estrutural (YAML)
```yaml
nome_relatorio: "INDICADORES_TRIAGEM"
descricao_relatorio: "Reaplicar estilo de PDF legado para novo relatorio operacional"

pdf_legado:
  modo: "attachment" # valores: attachment | tmp-path
  referencia: "anexo:triagem-legado.pdf" # ou "/tmp/triagem-legado.pdf"

view: "accessops"

campos:
  - nomeurgenzaaccettazione
  - codmurgenzaaccettazione
  - prioritaurgenzaaccettazione
  - "COUNT(*) AS qtde_acessos"

filtros:
  - nome: data_inizio
    tipo: DATE
    obrigatorio: false
    default: null
  - nome: data_fim
    tipo: DATE
    obrigatorio: false
    default: null
  - nome: idps
    tipo: STRING
    obrigatorio: false
    default: null

agrupamento:
  - nomeurgenzaaccettazione
  - codmurgenzaaccettazione
  - prioritaurgenzaaccettazione

ordenacao:
  - prioritaurgenzaaccettazione

bandas_obrigatorias:
  - title
  - columnHeader
  - detail
  - pageFooter

fidelidade_visual: "medio"
secoes_prioritarias:
  - title
  - columnHeader
  - detail
  - pageFooter

restricoes_branding:
  fontes_permitidas:
    - "DejaVu Sans"
    - "DejaVu Serif"
  cores_permitidas: []

observacoes_layout: "Manter hierarquia visual e grid da tabela do legado"
```

## Validacoes Obrigatorias do Contrato
- pdf_legado.modo deve ser attachment ou tmp-path.
- Se modo for tmp-path, pdf_legado.referencia deve iniciar com /tmp/.
- view deve existir em rules/views.json.
- campos devem existir na view ou ser alias agregado explicitamente autorizado.
- filtros devem usar tipos permitidos: DATE, INT, STRING, DECIMAL.
- filtros opcionais devem ter default null.
- bandas_obrigatorias deve conter exatamente title, columnHeader, detail, pageFooter.
- fontes de saida devem ser compativeis com PDF em Jasper (DejaVu Sans/Serif).

## Guardrails de Prompt
- Proibido hardcode de valores de filtro na query.
- Proibido SELECT *.
- Proibido inferir ou transportar texto sensivel do PDF legado para o novo conteudo.
- Obrigatorio registrar score de confianca por secao ao aplicar estilo.
- Obrigatorio fallback para template padrao quando confianca global estiver abaixo do threshold definido.

## Saida Esperada da Fase de Contrato
- Prompt de entrada validado contra este contrato.
- Erros de contrato retornados com mensagem objetiva quando houver violacao.
- Prompt apto para gerar Style Blueprint (schema em docs/STYLE-BLUEPRINT.schema.json).

## Checklist Rapido de Conformidade
- [ ] Entradas obrigatorias preenchidas
- [ ] Origem do PDF valida (anexo ou /tmp)
- [ ] View e campos validados
- [ ] Filtros parametrizaveis e opcionais com null
- [ ] Bandas obrigatorias declaradas
- [ ] Restricao de fonte Jasper respeitada
- [ ] Guardrails de seguranca declarados
