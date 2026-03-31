# 📊 SETUP: Instruções de Configuração Inicial

## ✅ Pré-requisitos

Verificar se tem instalado:

```bash
# Node.js 16+
node --version
# Esperado: v16.14.0 ou superior

# npm
npm --version
# Esperado: 7.0.0 ou superior

# Git (opcional, para versionamento)
git --version
# Esperado: 2.30.0 ou superior
```

Se não tiver, instalar em: https://nodejs.org/

---

## 1️⃣ Clonar/Preparar Workspace

```bash
# Se ainda não tem clone:
git clone <repo-url> guide-jasper-report
cd guide-jasper-report

# Ou se já tem pasta local:
cd /path/to/guide-jasper-report
```

---

## 2️⃣ Instalar Dependências Node.js

```bash
cd scripts
npm install
cd ..
```

**Esperado:** Instala `xml2js` e `chalk`

```
npm notice created a lockfile as package-lock.json
npm WARN ... 
added 2 packages, and audited ...
```

Observação: `npm install` valida apenas o `package.json`. Isso não cria automaticamente `validate.js`/`compile.js`.
Se esses arquivos não existirem em `scripts/`, consulte `PLANO-DESENVOLVIMENTO.md` para materializar os scripts antes dos testes.

---

## 3️⃣ Abrir no VSCode

```bash
code .
```

Ou:
- Abra VSCode
- File → Open Folder
- Selecione `guide-jasper-report`

---

## 4️⃣ Instalar Extensões Recomendadas (Automático)

VSCode detectará `.vscode/extensions.json` e sugerirá:

- ✅ **GitHub Copilot** (GitHub.copilot)
- ✅ **GitHub Copilot Chat** (GitHub.copilot-chat)
- ✅ **XML Tools** (redhat.vscode-xml)
- ✅ **Material Icon Theme** (PKief.material-icon-theme)
- ✅ **Prettier** (esbenp.prettier-vscode)

**Manual (opcional):**
```bash
code --install-extension GitHub.copilot
code --install-extension redhat.vscode-xml
```

---

## 5️⃣ Ativar GitHub Copilot

1. Abra VSCode
2. Copilot icon (canto inferior direito)
3. **Sign in with GitHub** (ou use git credentials existentes)
4. Autorize acesso
5. Teste: Ctrl+I (abre Copilot Chat)

---

## 6️⃣ (Optional) Configurar Banco de Dados

Se quer testar com BD **REAL** (não mock data):

### 6.1 Criar arquivo `.env`

Na raiz do workspace:

```bash
# Para MySQL
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASS=sua_senha
DB_NAME=seu_database
DB_PORT=3306
DB_DIALECT=mysql

# Ou para PostgreSQL
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASS=sua_senha
DB_NAME=seu_database
DB_PORT=5432
DB_DIALECT=postgresql
```

### 6.2 Testar Conexão

```bash
node scripts/test.js output/RELATORIO_*/relatorio.jasper --live
```

Se tudo ok:
```
✅ Conexão BD OK
✅ Query executada com sucesso
📊 10 registros retornados
```

---

## 7️⃣ Estrutura Pronta - Verificar

Após setup, deve ter:

```
guide-jasper-report/
├── .github/copilot-instructions.md         ✅
├── .vscode/settings.json                   ✅
├── examples/                               ✅ (vazio após setup)
├── prompts/relatorio-simples.prompt.md     ✅
├── rules/views.json                        ✅
├── scripts/
│   ├── validate.js                         🟡 (se implementado)
│   ├── compile.js                          🟡 (se implementado)
│   ├── package.json                        ✅
│   └── node_modules/                       ✅ (após npm install)
├── output/                                 ✅ (vazio, será preenchido)
├── skills/generate-jrxml.md                ✅
├── docs/
│   ├── QUICKSTART.md                       ✅
│   ├── TROUBLESHOOTING.md                  ✅
│   ├── EXAMPLES.md                         ✅
│   └── JASPER-REFERENCE.md                 ✅
├── README.md                               ✅
└── PLANO-DESENVOLVIMENTO.md                ✅
```

**Verificar:**
```bash
ls -la
# Deve listar todas pastas acima
```

---

## 8️⃣ Testar Setup

Executar validação básica:

```bash
# Valide a existência dos scripts primeiro
ls -la scripts

# Se validate.js existir:
node scripts/validate.js examples/sample-report-vendas.jrxml

# Se compile.js existir:
node scripts/compile.js examples/sample-report-vendas.jrxml --pdf
```

Esperado:
```
✓ XML bem-formado
✓ View 'view_vendas_diarias' validada
✓ 2 parâmetros encontrados
✓ 4/4 bandas recomendadas encontradas
✅ VALIDAÇÃO SUCESSO
```

---

## 9️⃣ Primeiro Relatório (Teste)

1. **Copie template:**
   ```bash
   cp prompts/relatorio-simples.prompt.md prompts/meu-teste.prompt.md
   ```

2. **Abra e preencha:** `prompts/meu-teste.prompt.md`

3. **Cole prompt no Copilot** (Ctrl+I):
   - Copie seção "PROMPT PARA O COPILOT" de seu arquivo
   - Cola na Copilot Chat
   - Aguarde geração

4. **Valide output:**
   ```bash
   node scripts/validate.js output/MEU_TESTE_*/meu_teste.jrxml
   ```

5. **Verifique pasta `/output`:**
   ```bash
   ls -la output/MEU_TESTE_*/
   ```

---

## 🔟 Git Setup (Opcional)

Para versionamento:

```bash
# Init (se repo ainda não é git)
git init

# Adicionar remote (se tiver repo)
git remote add origin <seu-repo-url>

# Staging & Commit iniciais
git add .
git commit -m "Setup inicial: workspace JasperReports + Copilot"

# Branch para desenvolvimento
git checkout -b feature/relatorios
```

**Push para GitHub:**
```bash
git push -u origin feature/relatorios
```

---

## 📋 Checklist de Setup Completo

- [ ] Node.js 16+ instalado
- [ ] Pasta `guide-jasper-report` no disco
- [ ] `npm install` executado em `scripts/`
- [ ] `scripts/validate.js` e `scripts/compile.js` existem (ou foram materializados a partir do PLANO)
- [ ] VSCode aberto no workspace
- [ ] Extensões instaladas (GitHub Copilot + XML Tools)
- [ ] GitHub Copilot ativado e logado
- [ ] Arquivo `.env` criado (se BD real)
- [ ] Estrutura de pastas verificada
- [ ] Teste com `examples/` passou
- [ ] Primeiro relatório gerado e validado
- [ ] Git init (opcional)

---

## 🆘 Problemas Comuns de Setup

### Problema: "npm command not found"
**Solução:** Instalar Node.js de https://nodejs.org/

### Problema: "Copilot não aparece em VSCode"
**Solução:**
1. Install extensão `GitHub.copilot`
2. Reload VSCode (Ctrl+R)
3. Sign in com GitHub account

### Problema: "XML Tools não valida arquivo"
**Solução:**
1. Install `redhat.vscode-xml`
2. Salve arquivo como `.jrxml` (não `.xml`)
3. Reload VSCode

### Problema: "npm install falha"
**Solução:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Problema: ".env não lê credenciais BD"
**Solução:**
- Instalar `dotenv`: `npm install dotenv`
- Em scripts, adicionar top: `require('dotenv').config()`

---

## 🚀 Próximo Passo

Após setup completo, leia:

1. **[QUICKSTART.md](docs/QUICKSTART.md)** - 5 minutos para primeiro relatório
2. **[README.md](README.md)** - Overview do projeto
3. **[prompts/relatorio-simples.prompt.md](prompts/relatorio-simples.prompt.md)** - Gerar novo relatório

---

## 📞 Suporte

- **Docs:** Pasta `docs/`
- **Scripts Issues:** Ver `.log` de execução
- **Copilot Issues:** Leia `.github/copilot-instructions.md`
- **General:** Abra issue no GitHub

---

**Data de Criação:** 30 de Março de 2026  
**Setup Version:** 1.0  
**Tempo Esperado:** 15-20 minutos
