# Plano de Parser e Análise de PDF Legado para Reuso de Layout e Estilo em JasperReports

## Objetivo
- Permitir que o processo de geração de novo relatório Jasper reutilize apenas layout e estilo de um PDF legado, sem reaproveitar conteúdo de dados, SQL ou regras de negócio.
- Suportar duas entradas:
1. PDF enviado no contexto do prompt.
2. PDF salvo em /tmp e referenciado no prompt.
- Produzir um artefato intermediário de estilo reutilizável pelo gerador de JRXML.

## Escopo
- Inclui:
1. Extração de características visuais e estruturais de página.
2. Interpretação de grid, alinhamentos, tipografia, bordas, cores, espaçamentos e padrões de seção.
3. Conversão para um Style Blueprint neutro.
4. Aplicação do Style Blueprint ao template JRXML novo.
- Não inclui:
1. OCR sem texto embutido como requisito inicial.
2. Extração de SQL, campos de banco ou lógica de filtros.
3. Clonagem pixel-perfect absoluta de todos os elementos gráficos complexos.

## Princípios Arquiteturais
- Separação forte entre conteúdo e apresentação.
- Pipeline determinístico com níveis de confiança.
- Fail-safe: se confiança baixa, cair para template padrão aprovado.
- Auditoria completa: logs, score por elemento e justificativa de mapeamento.
- Compatibilidade explícita com JasperReports 6.2.0.

## Entradas e Contrato de Prompt
- Entradas obrigatórias:
1. Nome do novo relatório.
2. Fonte do PDF legado (anexo ou caminho em /tmp).
3. View/campos/filtros do novo relatório.
- Parâmetros opcionais:
1. Nível de fidelidade visual: baixo, médio, alto.
2. Seções obrigatórias a preservar: título, cabeçalho de tabela, detalhe, rodapé.
3. Restrições de branding: cores permitidas, fonte preferida.
- Regras de segurança:
1. Validar path em /tmp contra allowlist e canonical path.
2. Tamanho máximo de arquivo.
3. Tipo MIME e assinatura de arquivo PDF.

## Arquitetura de Componentes
- Componente 1: Input Resolver
1. Resolve origem do PDF.
2. Normaliza caminho e metadados.
3. Gera hash SHA-256 para rastreabilidade.
- Componente 2: PDF Layout Extractor
1. Lê blocos de texto, fontes, coordenadas, linhas, retângulos, imagens e páginas.
2. Produz representação geométrica por página.
- Componente 3: Document Segmenter
1. Segmenta regiões: header global, header de coluna, detail row, footer, possíveis grupos.
2. Identifica repetição entre páginas.
- Componente 4: Style Inference Engine
1. Infere tipografia dominante.
2. Infere paleta de cores e hierarquia visual.
3. Infere grid de colunas e espaçamento.
4. Infere bordas, preenchimentos e padrões zebra.
- Componente 5: Jasper Style Mapper
1. Converte Style Blueprint para elementos JRXML compatíveis.
2. Aplica em bandas title, columnHeader, detail, pageFooter.
3. Garante fonte segura em PDF: DejaVu Sans ou DejaVu Serif por política.
- Componente 6: Report Composer
1. Encaixa SQL/campos/filtros do novo relatório.
2. Mantém layout herdado.
3. Gera JRXML final.
- Componente 7: Validator and Compiler
1. Executa validação estrutural e regras de views.
2. Compila para jasper.
3. Gera PDF com dados reais.
4. Faz checagem anti-PDF vazio.

## Formato do Artefato Intermediário (Style Blueprint)
- Metadados:
1. source_pdf_hash
2. page_size
3. orientation
4. extraction_confidence_global
- Tokens de estilo:
1. font_family_primary
2. font_sizes por nível hierárquico
3. color_tokens: texto, fundo, borda, destaque
4. border_tokens: espessura e cor
5. spacing_tokens: margens, paddings, alturas de banda
- Layout:
1. grid_columns com largura relativa e alinhamento
2. regions por banda
3. row_height e regras de overflow
- Regras:
1. prioridade de alinhamento por tipo de dado
2. regras de truncamento e quebra
3. fallback tokens quando item não mapeável

## Pipeline de Processamento
- Etapa 1: Ingestão
1. Receber PDF e validar integridade.
2. Capturar metadados de origem.
- Etapa 2: Parsing
1. Extrair objetos gráficos e textuais.
2. Unificar coordenadas em sistema comum.
- Etapa 3: Segmentação
1. Detectar áreas repetitivas por página.
2. Isolar cabeçalho, tabela, rodapé.
- Etapa 4: Inferência de estilo
1. Detectar famílias tipográficas e pesos.
2. Detectar paleta dominante.
3. Detectar grid e alinhamentos.
- Etapa 5: Mapeamento Jasper
1. Converter regiões para bandas Jasper.
2. Converter tokens para elementos style/font/textElement/reportElement.
- Etapa 6: Composição com conteúdo novo
1. Aplicar SQL parametrizado e campos novos.
2. Manter somente visual herdado.
- Etapa 7: Verificação
1. Validação XML.
2. Validação rules/views.
3. Compilação e PDF com dados reais.
4. Métricas de qualidade visual e técnica.

## Heurísticas de Segmentação e Inferência
- Repetição vertical em todas as páginas indica header/footer.
- Primeira linha repetida com fundo e negrito indica columnHeader.
- Blocos tabulares com espaçamento regular indicam detail row template.
- Fonte e cor mais destacada no topo indicam título.
- Linhas horizontais contínuas indicam separadores de banda.
- Densidade de texto e bounding boxes orientam agrupamento.

## Mapeamento de Elementos PDF para JRXML
- Texto fixo recorrente no topo vira staticText em title.
- Labels de colunas viram staticText em columnHeader.
- Células variáveis viram textField em detail.
- Numéricos alinhados à direita no legado mantêm textAlignment right.
- Datas com padrão recorrente recebem pattern correspondente.
- Rodapé com paginação vira expressão com PAGE_NUMBER.
- Cores e bordas viram propriedades de reportElement e box.

## Política de Compatibilidade Jasper 6.2.0
- Evitar atributos modernos não suportados.
- Priorizar estrutura clássica das quatro bandas obrigatórias.
- Fontes de saída PDF restritas a DejaVu para robustez.
- Preservar SQL parametrizado e validações de campo.

## Estratégia de Prompt Engineering
- Prompt principal deve conter:
1. Intenção: reaplicar estilo, não conteúdo.
2. Entradas de dados do novo relatório.
3. Fonte do PDF legado.
4. Restrições técnicas Jasper 6.2.0.
- Prompt interno por estágio:
1. Stage A: descrever layout em linguagem estrutural.
2. Stage B: converter descrição para Style Blueprint.
3. Stage C: aplicar Style Blueprint ao JRXML base.
- Guardrails de prompt:
1. Proibir extração de texto sensível do PDF para dados finais.
2. Proibir hardcode de filtros em SQL.
3. Exigir relatório de confiança por seção.

## Observabilidade e Qualidade
- Métricas:
1. Confidence score global e por seção.
2. Taxa de mapeamento de elementos detectados.
3. Divergência de dimensões por banda.
4. Taxa de sucesso de compilação.
5. Tamanho mínimo de PDF e presença de dados.
- Logs:
1. Decisões de inferência.
2. Fallbacks acionados.
3. Campos não mapeáveis.

## Riscos e Mitigações
- PDF sem texto selecionável:
1. Mitigação: modo OCR opcional em fase 2.
- Layout muito livre ou com arte vetorial complexa:
1. Mitigação: converter para tema aproximado e sinalizar baixa confiança.
- Fontes legadas não disponíveis:
1. Mitigação: fallback para DejaVu com tabela de equivalência.
- Ambiguidade entre cabeçalho de página e cabeçalho de tabela:
1. Mitigação: heurística de repetição e posição relativa.

## Plano de Entrega por Fases
- Fase 0: Especificação e contratos
1. Definir schema do Style Blueprint.
2. Definir contrato de entrada no prompt.
- Fase 1: MVP funcional
1. Parsing de texto e geometria básica.
2. Segmentação de title, columnHeader, detail, pageFooter.
3. Aplicação em JRXML tabular simples.
- Fase 2: Robustez
1. Suporte a múltiplas páginas e grupos.
2. Melhorias de inferência de cores e tipografia.
3. Score de confiança e fallback automático.
- Fase 3: Expansão
1. OCR opcional.
2. Suporte parcial a gráficos e blocos ricos.
3. Benchmark visual automatizado.

## Critérios de Aceite
- Técnicos:
1. Gera JRXML válido e compilável.
2. Mantém regras de view/campos/filtros.
3. Gera PDF com dados reais sem erro.
- Visuais:
1. Hierarquia tipográfica equivalente ao legado.
2. Estrutura de tabela e espaçamentos coerentes.
3. Cores e bordas principais preservadas.
- Operacionais:
1. Tempo de processamento dentro de limite acordado.
2. Logs e metadata auditáveis por execução.

## Checklist de Aprovação para Implementação
- Aprovado schema de Style Blueprint.
- Aprovado fallback de baixa confiança.
- Aprovada política de fontes para PDF.
- Aprovado contrato de prompt com entrada por anexo e por /tmp.
- Aprovados critérios de aceite e métricas.

## Próximo passo recomendado
1. Com aprovação deste plano, detalhar documento técnico de stack e bibliotecas por fase.
2. Em seguida, produzir especificação de APIs internas e contrato de saída Style Blueprint em JSON.
