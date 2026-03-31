# 📊 JasperReports Generator via GitHub Copilot

Workspace VSCode para geração automatizada de relatórios JasperReports (.jrxml e .jasper) 
via **GitHub Copilot**, otimizado para time de deploy **sem knowledge em Jasper/SQL**.

---

## 🎯 O que é isso?

```
Input: Nome, campos, view, filtros
       ↓
  [GitHub Copilot with custom instructions]
       ↓
Output: .jrxml + .jasper compilados + PDF preview
```

**Exemplo Real:**
```
"Crie relatório VENDAS_DIARIAS com campos: data, item_nome, 
valor_total da view view_vendas_diarias, filtrado por data_inicio e data_fim"

↓ (Copilot gera)

✅ vendas_diarias.jrxml (XML)
✅ vendas_diarias.jasper (compilado)
✅ vendas_diarias.pdf (preview)
✅ vendas_diarias.log (validação)
✅ metadata.json (versioning)
```

---

## 🚀 Quickstart (5 minutos)

### 1. Abrir Workspace

```bash
# Clone este repositório
git clone <repo-url> guide-jasper-report
cd guide-jasper-report

# Abrir no VSCode
code .

# Instalar dependências
cd scripts
npm install
cd ..
```

### 2. Preencher Formulário

Copie `prompts/relatorio-simples.prompt.md` e preencha seus detalhes.

### 3. Chamar Copilot

Abra Copilot (Ctrl+I) e cole o prompt com seus detalhes.

### 4. Validate & Deploy

```bash
# Validar gerado
node scripts/validate.js output/SEU_RELATORIO_*/seu_relatorio.jrxml

# Verificar logs
cat output/SEU_RELATORIO_*/seu_relatorio.log
```

Pronto! ✅ Arquivos em `output/` prontos para deploy.

### Nota importante sobre scripts

Os comandos de validação/compilação pressupõem arquivos em `scripts/`:

- `scripts/validate.js`
- `scripts/compile.js`

Se eles ainda não existirem no workspace, consulte `PLANO-DESENVOLVIMENTO.md` (seções dos scripts) para implementação antes da execução.

Se você executar comandos dentro de `scripts/`, remova o prefixo `scripts/` do comando:

```bash
# na raiz
node scripts/validate.js output/RELATORIO_*/relatorio.jrxml

# dentro de scripts/
node validate.js ../output/RELATORIO_*/relatorio.jrxml
```

---

## 📁 Estrutura do Workspace

```
guide-jasper-report/
├── README.md                          ← Você está aqui
├── PLANO-DESENVOLVIMENTO.md            ← Plano técnico completo
│
├── .github/
│   └── copilot-instructions.md        ← Regras globais Copilot ⭐
│
├── .vscode/
│   ├── settings.json
│   └── extensions.json
│
├── examples/
│   └── [PDFs/JRXMLs de referência]
│
├── prompts/
│   ├── relatorio-simples.prompt.md    ← Template para novo relatório ⭐
│   └── templates/
│       └── [templates XML/SQL]
│
├── rules/
│   └── views.json                     ← Definição de views + campos ⭐
│
├── scripts/
│   ├── validate.js                    ← (quando implementado) Validar JRXML
│   ├── compile.js                     ← (quando implementado) Compilar .jasper
│   ├── test.js                        ← (quando implementado) Testar com dados
│   ├── package.json
│   └── lib/
│       ├── jasper-helper.js
│       ├── sql-parser.js
│       └── xml-builder.js
│
├── output/                            ← Relatórios gerados versionados
│   └── [relatório_timestamp]/
│       ├── *.jrxml
│       ├── *.jasper
│       ├── *.pdf
│       ├── *.log
│       └── metadata.json
│
├── skills/
│   └── generate-jrxml.md              ← Skill Copilot (detalhada)
│
└── docs/
    ├── QUICKSTART.md
    ├── TROUBLESHOOTING.md
    ├── JASPER-REFERENCE.md
    └── EXAMPLES.md
```

**⭐ Principais:**
1. `.github/copilot-instructions.md` - Regras que Copilot segue
2. `rules/views.json` - Verdade sobre campos/views disponíveis
3. `prompts/relatorio-simples.prompt.md` - Template para novo relatório

---

## 📖 Como Usar

### Para Gerar Novo Relatório

1. **Copie o template:**
   ```bash
   cp prompts/relatorio-simples.prompt.md prompts/meu-relatorio.prompt.md
   ```

2. **Preencha seus detalhes** em `prompts/meu-relatorio.prompt.md`

3. **Abra Copilot** (Ctrl+I) e cole o PROMPT PARA COPILOT da seção final

4. **Aguarde geração** - Copilot criará:
   - `output/MEU_RELATORIO_{timestamp}/meu_relatorio.jrxml`
   - `output/MEU_RELATORIO_{timestamp}/meu_relatorio.jasper`
   - `output/MEU_RELATORIO_{timestamp}/meu_relatorio.pdf`
   - etc.

5. **Valide** com:
   ```bash
   node scripts/validate.js output/MEU_RELATORIO_{timestamp}/meu_relatorio.jrxml
   ```

6. **Deploy** - Copie `.jrxml` e `.jasper` para sua app de produção

---

## 🎓 Exemplos

Ver `docs/EXAMPLES.md` para:
- ✅ Exemplo 1: Relatório Simples (Vendas Diárias)
- ✅ Exemplo 2: Com Agregação (SUM de Valores)
- ✅ Exemplo 3: Com Múltiplos Filtros (Pacientes)

---

## 🔧 Validações Automáticas

Após Copilot gerar, execute:

```bash
# Validar XML + SQL + campos
node scripts/validate.js output/RELATORIO_*/relatorio.jrxml

# Compilar JRXML → JASPER
node scripts/compile.js output/RELATORIO_*/relatorio.jrxml

# Testar com mock data
node scripts/test.js output/RELATORIO_*/relatorio.jasper --mock
```

---

## 📋 Pré-requisitos

- **Node.js** 16+ (para scripts)
- **VSCode** com **GitHub Copilot** ativado
- **Git** (para versionamento)
- **Navegador** (para visualizar PDFs)

---

## ⚙️ Configuração (Opcional)

Se quiser testar com banco de dados REAL:

1. Crie `.env`:
   ```bash
   DB_HOST=localhost
   DB_USER=app_user
   DB_PASS=secret
   DB_NAME=reports_db
   DB_PORT=3306
   ```

2. Execute scripts com `--live`:
   ```bash
   node scripts/test.js output/RELATORIO_*/relatorio.jasper --live
   ```

---

## 📚 Documentação

- **[PLANO-DESENVOLVIMENTO.md](PLANO-DESENVOLVIMENTO.md)** - Plano técnico completo
- **[docs/QUICKSTART.md](docs/QUICKSTART.md)** - Início rápido
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Resolução de problemas
- **[docs/EXAMPLES.md](docs/EXAMPLES.md)** - Exemplos práticos
- **[docs/JASPER-REFERENCE.md](docs/JASPER-REFERENCE.md)** - Referência JasperReports
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Instruções Copilot
- **[skills/generate-jrxml.md](skills/generate-jrxml.md)** - Skill Copilot (detalhada)

---

## 🐛 Troubleshooting

### Problema: "XML Parse Error"
**Solução:** Confira CDATA em `<queryString>`: `<![CDATA[...]]>`

### Problema: "View not found in rules/views.json"
**Solução:** Adicione view em `rules/views.json` com campos válidos

### Problema: "PDF não renderiza"
**Solução:** Trocar font para DejaVu Sans (Arial pode não funcionar)

Mais em: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## 📞 Suporte

- **Issues:** Abra no GitHub com prefix `[REPORT]`
- **Docs:** Consulte pasta `docs/`
- **Exemplos:** Veja `examples/` e `docs/EXAMPLES.md`

---

## 🚀 Próximas Fases

- [ ] **Fase 2:** Validação com BD Real
- [ ] **Fase 3:** UI Webview com formulário gráfico
- [ ] **Fase 4:** CI/CD Pipeline (GitHub Actions)
- [ ] **Fase 5:** Advanced (subreports, crosstabs)

Ver [PLANO-DESENVOLVIMENTO.md#próximos-passos](PLANO-DESENVOLVIMENTO.md#próximos-passos)

---

## 📄 License

MIT © 2026 - JasperReports Generator via GitHub Copilot

---

**Última Atualização:** 30 de Março de 2026  
**Versão:** 1.0  
**Responsável:** Deploy Team
