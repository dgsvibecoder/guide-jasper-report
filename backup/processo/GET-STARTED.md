# 🚀 GET STARTED EM 5 MINUTOS

> **Não precisa ler tudo. Siga só isto para seu primeiro relatório em < 20 minutos.**

---

## 🎯 TL;DR: Seu Projeto já Tem

```
✅ 5000+ linhas de documentação
✅ 2 scripts Node.js definidos no plano para implementar
✅ 3 exemplos JRXML copy-paste
✅ Regras Copilot pré-configuradas
✅ Template prompt para novo relatório
✅ Troubleshooting completo para erros
```

## ⚠️ Estado Atual dos Artefatos

- Os comandos com `node scripts/validate.js` e `node scripts/compile.js` exigem que esses arquivos existam em `scripts/`.
- No estado atual, os scripts podem ainda não estar materializados e estar apenas descritos no plano técnico.
- Se faltar arquivo, consulte `PLANO-DESENVOLVIMENTO.md` (seções de `scripts/validate.js` e `scripts/compile.js`) antes de seguir os passos de execução.

---

## 🧭 Matriz de Comandos por Diretório

### Se você está na raiz do projeto (`guide-jasper-report/`)

```bash
npm --prefix scripts install
node scripts/validate.js output/relatorio-vendas-2026.jrxml rules/views.json
node scripts/compile.js output/relatorio-vendas-2026.jrxml --pdf
```

### Se você está dentro de `scripts/`

```bash
npm install
node validate.js ../output/relatorio-vendas-2026.jrxml ../rules/views.json
node compile.js ../output/relatorio-vendas-2026.jrxml --pdf
```

---

## ⏱️ PRÓXIMOS 15-20 MINUTOS

### Passo 1: Abra este Projeto (2 min)

```bash
# PowerShell / CMD (Windows)
cd C:\Area-de-Trabalho\General-Workspace\guide-jasper-report
code .

# WSL / Linux / Git Bash
cd /mnt/c/Area-de-Trabalho/General-Workspace/guide-jasper-report
code .
```

### Passo 2: Instale Dependências (3 min)

```bash
cd scripts
npm install
cd ..
```

**Esperado:** `node_modules/` criada, sem errors.

### Passo 3: Copie seu Primeiro Relatório (5 min)

Abra **[docs/EXAMPLES.md](docs/EXAMPLES.md)** e:

1. Procure por **"Example 1: VENDAS_DIARIAS (Simple)"**
2. Copie todo XML (está dentro do bloco `\`\`\`xml`)
3. Crie novo arquivo: `output/relatorio-vendas-2026.jrxml`
4. Cole o XML

### Passo 4: Valide o XML (2 min)

```bash
node scripts/validate.js output/relatorio-vendas-2026.jrxml rules/views.json
```

Se você estiver dentro de `scripts/`, use:

```bash
node validate.js ../output/relatorio-vendas-2026.jrxml ../rules/views.json
```

**Esperado:** ✅ No errors, 5 fields validated, SQL OK

### Passo 5: Compile para JASPER + PDF (3 min)

```bash
node scripts/compile.js output/relatorio-vendas-2026.jrxml --pdf
```

Se você estiver dentro de `scripts/`, use:

```bash
node compile.js ../output/relatorio-vendas-2026.jrxml --pdf
```

**Esperado:**
- `relatorio-vendas-2026.jasper` criado
- `relatorio-vendas-2026.pdf` criado (preview)
- Arquivo `metadata.json` com logs

---

## 📖 Agora Escolha Seu Caminho

<table>
  <tr>
    <th>Seu Rol</th>
    <th>Próxima Leitura</th>
    <th>Tempo</th>
  </tr>
  <tr>
    <td><strong>Deploy Team</strong><br>(sem SQL, sem código)</td>
    <td>1. <a href="README.md">README.md</a> (3 min)<br>2. <a href="SETUP.md">SETUP.md</a> (5 min)<br>3. <a href="prompts/relatorio-simples.prompt.md">prompts/relatorio-simples.prompt.md</a> (5 min)<br>4. <a href="docs/QUICKSTART.md">docs/QUICKSTART.md</a> (5 min)</td>
    <td>20 min</td>
  </tr>
  <tr>
    <td><strong>Arquiteto</strong><br>(precisa entender arquitetura)</td>
    <td>1. <a href="RESUMO-VISUAL.md">RESUMO-VISUAL.md</a> (5 min)<br>2. <a href="PLANO-DESENVOLVIMENTO.md">PLANO-DESENVOLVIMENTO.md</a> seções 1-5 (30 min)<br>3. <a href="scripts/compile.js">compile.js code</a> em PLANO (15 min)</td>
    <td>50 min</td>
  </tr>
  <tr>
    <td><strong>Dev Maintenance</strong><br>(vai manter scripts)</td>
    <td>1. <a href="PLANO-DESENVOLVIMENTO.md">PLANO-DESENVOLVIMENTO.md</a> (1 hora)<br>2. <a href="docs/EXAMPLES.md">docs/EXAMPLES.md</a> (20 min)<br>3. <a href="docs/TROUBLESHOOTING.md">docs/TROUBLESHOOTING.md</a> (30 min)</td>
    <td>2 horas</td>
  </tr>
  <tr>
    <td><strong>Troubleshooting</strong><br>(algo deu errado)</td>
    <td><a href="docs/TROUBLESHOOTING.md">docs/TROUBLESHOOTING.md</a> → procure seu erro</td>
    <td>5 min</td>
  </tr>
</table>

---

## 🤖 Criando Seu 1º Relatório com Copilot

Depois que validar o exemplo:

1. **Abra [prompts/relatorio-simples.prompt.md](prompts/relatorio-simples.prompt.md)**
2. **Preencha os 7 campos:**
   ```
   Relatório: VENDAS_ONTEM
   View: view_vendas_diarias
   Campos: data, item_nome, quantidade, valor_total
   Filtros: data_inicio (DATE), data_fim (DATE)
   ... (etc)
   ```

3. **Copie tudo (até a seção "PROMPT PARA O COPILOT")**
4. **No VSCode, abra Copilot Chat (Ctrl+I)**
5. **Cole + Execute**

**Tempo esperado:** 3-5 minutos para novo JRXML

---

## ⚠️ Se Algo der Errado

1. **Um arquivo não existe?** → Abra [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. **Erro no XML?** → Procure "XML Parse Error"
3. **npm install falhou?** → Procure "npm install fails"
4. **Copilot não gera JRXML?** → Leia **.github/copilot-instructions.md**

**Todas soluções estão documentadas.**

---

## 📚 ESTRUTURA DO ARQUIVO

```
guide-jasper-report/
├─ .github/
│  └─ copilot-instructions.md  ← Regras para Copilot
├─ docs/
│  ├─ QUICKSTART.md            ← Leia isto primeiro
│  ├─ EXAMPLES.md              ← 3 exemplos copy-paste
│  └─ TROUBLESHOOTING.md       ← Se algo falhar
├─ scripts/
│  ├─ package.json             ← npm install
│  ├─ compile.js               ← (quando implementado) Compila JRXML → JASPER
│  └─ validate.js              ← (quando implementado) Valida XML + SQL
├─ rules/
│  └─ views.json               ← Definição de views
├─ prompts/
│  └─ relatorio-simples.prompt.md ← Template novo relatório
├─ output/                     ← Seus relatórios aqui
├─ PLANO-DESENVOLVIMENTO.md    ← Tudo técnico (2000 linhas)
├─ README.md                   ← Overview
└─ SETUP.md                    ← Instalação
```

---

## ✅ VERIFICAÇÃO: Tem TUDO?

Abra terminal e rode:

```bash
ls -la
```

Deve ver (mínimo):

- [x] `.github/` (pasta)
- [x] `docs/` (pasta)
- [x] `scripts/` (pasta)
- [x] `rules/` (pasta)
- [x] `prompts/` (pasta)
- [x] `output/` (pasta)
- [x] `PLANO-DESENVOLVIMENTO.md` (arquivo grande)
- [x] `README.md`
- [x] `SETUP.md`
- [x] `.github/copilot-instructions.md`
- [x] `rules/views.json`

Se faltou algo → **Avise now!** Projeto não está 100% entregue.

---

## 🎓 LEARN BY DOING

**Não tente entender tudo no início.** Siga isto:

1. ✅ Copie exemplo VENDAS_DIARIAS
2. ✅ Valide
3. ✅ Compile
4. ✅ Abra PDF resultado (veja em `output/`)
5. ✅ Crie seu próprio mudando só os nomes
6. ✅ Se errar, consulte TROUBLESHOOTING
7. ✅ Depois estude PLANO para entender WHY

---

## 🎯 OBJETIVO FINAL

Após 20 minutos você deve ter:

```
✅ Entendido como projeto funciona
✅ Instalado dependências (npm)
✅ Compilado um JRXML → JASPER com sucesso
✅ Gerado um PDF preview
✅ Arquivo metadata.json c/ histórico
✅ Confiança para criar novo relatório
```

---

## 📞 PERGUNTAS COMUNS

**P: Onde fica o PDF gerado?**  
R: Em `output/seu-relatorio.pdf`

**P: Posso usar Copilot sem GitHub Copilot pago?**  
R: Não, precisa de licença paga (ou GitHub Copilot Free). Mas scripts funcionam 100% standalone.

**P: Preciso conhecer SQL?**  
R: Não! Template já vem pronto. Copilot gera tudo.

**P: Qual versão JasperReports?**  
R: 6.2.0 (confira em [PLANO-DESENVOLVIMENTO.md](PLANO-DESENVOLVIMENTO.md#jasperreports-620))

**P: Posso customizar as views?**  
R: Sim! Edite `rules/views.json` com suas views. Siga padrão definido.

**P: Scripts funcionam em Windows?**  
R: Sim. Comandos aqui são Windows + Unix compatível.

---

## 🚀 AGORA VOCÊ ESTÁ READY

**Next step:**

👉 **[Clique aqui e abra docs/QUICKSTART.md](docs/QUICKSTART.md)**

Ou se preferir:

👉 **[Leia README.md primeiro](README.md)**

Ou se é arquiteto:

👉 **[Vá direto para PLANO-DESENVOLVIMENTO.md](PLANO-DESENVOLVIMENTO.md)**

---

**Tempo gasto lendo isto:** 5 minutos  
**Próximo:** Primeiro relatório em 15 minutos  
**Total:** 20 minutos até ter JASPER + PDF em mãos ✅

**VAMO?** 🚀
