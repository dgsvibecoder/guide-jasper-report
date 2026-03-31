# Placeholder: Exemplos e Arquivos Legados

Esta pasta contém:

## 📄 Arquivos de Referência (para Copilot aprender estilo)

- `sample-report-vendas.jrxml` - Exemplo legado (estrutura padrão)
- `sample-report-vendas.pdf` - PDF de saída esperada (visual)
- `sample-pacientes.jrxml` - Exemplo 2 (maior complexidade)

## 🎯 Uso

Quando Copilot gera novo relatório, referencia esses para:
1. Aprender estrutura JRXML padrão
2. Validar estilo e layout
3. Estimar dimensões (width, height, borders)

## 📝 Criar Novo Exemplo

Após gerar relatório com sucesso:

```bash
cd output/NOVO_RELATORIO_*/
cp novo_relatorio.jrxml ../../examples/novo-relatorio.jrxml
cp novo_relatorio.pdf ../../examples/novo-relatorio.pdf
```

Depois, adicione seção em `docs/EXAMPLES.md`.

---

**Total de exemplos:** 2+ (templates adicionados com uso)
