# 📖 GUIA DE LEITURA: Por Onde Começar

**Bem-vindo ao Projeto JasperReports + GitHub Copilot!**

Use este guia para escolher o melhor caminho baseado no seu rol e tempo disponível.

---

## 🤔 Escolha seu caminho:

### 👥 SOU DEPLOY TEAM (Vou usar, não customizar)

**Tempo disponível?**

#### ⏱️ Tenho 20 minutos
```
1. Abra README.md (5 min overview)
2. Abra SETUP.md (15 min instalação)
3. Pronto!

Próximo: QUICKSTART.md quando precisar do 1º relatório
```

#### ⏱️ Tenho 1 hora
```
1. README.md (5 min)
2. SETUP.md (15 min)
3. docs/QUICKSTART.md (10 min - primeiro relatório)
4. Preencha prompts/relatorio-simples.prompt.md (20 min)
5. Use Copilot e valide

Próximo: docs/EXAMPLES.md para mais ideias
```

#### ⏱️ Tenho 2+ horas
```
1. README.md
2. SETUP.md
3. docs/QUICKSTART.md
4. Crie 3-4 relatórios próprios (use template)
5. docs/TROUBLESHOOTING.md (referência)
6. docs/EXAMPLES.md (inspiração)

Pronto para setup em produção!
```

---

### 🏗️ SOU ARQUITETO (Vou customizar e estender)

**Tempo disponível?**

#### ⏱️ Tenho 2 horas
```
1. README.md (5 min overview)
2. PLANO-DESENVOLVIMENTO.md - seções 1-3 (45 min)
   - Arquitetura
   - Estrutura de pastas
   - Arquivos chave
3. SETUP.md (15 min instalação)
4. skills/generate-jrxml.md (seção 1-4, 30 min)
5. Crie primeiro relatório com Copilot (15 min)

Próximo: Fases 2-5 em PLANO (quando pronto)
```

#### ⏱️ Tenho 4-6 horas (Estudo Completo)
```
1. README.md
2. PLANO-DESENVOLVIMENTO.md (leia TUDO - 2 horas)
   - Arquitetura, estrutura, código, exemplos
3. skills/generate-jrxml.md (detalhado - 30 min)
4. docs/EXAMPLES.md (3 exemplos - 60 min)
5. SETUP.md + primeiro relatório (30 min)
6. docs/TROUBLESHOOTING.md (referência - 30 min)
7. .github/copilot-instructions.md (regras - 15 min)

Pronto para implementação avançada!
```

#### ⏱️ Tenho 1 dia inteiro (Domínio Total)
```
Leia TUDO em ordem:
1. README.md
2. SETUP.md (execute)
3. PLANO-DESENVOLVIMENTO.md
4. skills/generate-jrxml.md
5. docs/QUICKSTART.md (execute)
6. docs/EXAMPLES.md (estude)
7. docs/TROUBLESHOOTING.md
8. .github/copilot-instructions.md
9. Copie código (compile.js, validate.js)
10. Implemente fases 2-5
11. Setup BD real (.env)
12. Customize rules/views.json

Você dominará completamente o projeto!
```

---

### 🆘 TENHO PROBLEMA (Troubleshooting)

1. Procure em [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
   - Busque categoria de erro (XML, SQL, Compilation)
   - Siga solução passo-a-passo

2. Se não encontrar:
   - Rode: `node scripts/validate.js seu_relatorio.jrxml`
   - Confira arquivo `.log` em `output/`
   - Abra issue com `.log` anexado

---

### 📚 SOU ESTUDANTE (Aprender JasperReports)

**Sugerida ordem de aprendizado:**

```
1. README.md (context)
2. docs/EXAMPLES.md → Exemplo 1 (simples)
3. PLANO-DESENVOLVIMENTO.md → Seções 3-4 (JRXML structure)
4. docs/EXAMPLES.md → Exemplo 2 (agregação)
5. docs/EXAMPLES.md → Exemplo 3 (filtros)
6. skills/generate-jrxml.md (detalhe técnico)
7. TROUBLESHOOTING.md (anti-padrões)

Você aprenderá estrutura JRXML deep!
```

---

## 🗺️ MAPA DO PROJETO

```
guide-jasper-report/
│
├─ 📖 COMECE AQUI:
│  │
│  ├─ README.md ........................... Overview (5 min)
│  ├─ SETUP.md ............................ Setup (15 min)
│  ├─ docs/QUICKSTART.md .................. 1º relatório (5 min)
│  └─ INDEX-EXECUTIVO.md .................. Índice completo
│
├─ 📚 ESTUDE:
│  │
│  ├─ PLANO-DESENVOLVIMENTO.md ............ Tudo (80 pgs)
│  ├─ skills/generate-jrxml.md ........... Skill detalhada
│  ├─ docs/EXAMPLES.md ................... 3 exemplos práticos
│  └─ .github/copilot-instructions.md ...  Regras Copilot
│
├─ 🆘 QUANDO ERRO:
│  │
│  └─ docs/TROUBLESHOOTING.md ............ 25+ soluções
│
├─ 🔧 USE:
│  │
│  ├─ prompts/relatorio-simples.prompt.md  Template novo relatório
│  ├─ rules/views.json ................... Definição views
│  └─ scripts/ (validate.js, compile.js)  Scripts validation
│
└─ 📁 OUTPUT:
   └─ output/ ............................ Relatórios gerados
```

---

## 📋 LISTA DE LEITURA (Em Ordem)

### Nível 1: Quick Start (30 min)
- [ ] README.md
- [ ] SETUP.md
- [ ] docs/QUICKSTART.md

### Nível 2: Intermediate (2 horas)
- [ ] PLANO-DESENVOLVIMENTO.md (seções 1-4)
- [ ] docs/EXAMPLES.md
- [ ] prompts/relatorio-simples.prompt.md

### Nível 3: Advanced (4-6 horas)
- [ ] PLANO-DESENVOLVIMENTO.md (tudo)
- [ ] skills/generate-jrxml.md
- [ ] .github/copilot-instructions.md
- [ ] docs/TROUBLESHOOTING.md
- [ ] Código: compile.js, validate.js

### Nível 4: Expert (1+ dia)
- [ ] Tudo acima
- [ ] Customize rules/views.json
- [ ] Configure BD real (.env)
- [ ] Implemente fases 2-5
- [ ] Estenda para seu caso

---

## ⚡ CAMINHO MAIS RÁPIDO

**Objetivo: Gerar relatório em < 30 min**

```
TEMPO  AÇÃO
──────────────────────────────────────────
 5min  → Abra README.md
 5min  → Abra SETUP.md, execute npm install
 5min  → Abra QUICKSTART.md e siga passos
10min  → Preencha prompts/relatorio-simples.prompt.md
 5min  → Cole prompt em Copilot (Ctrl+I)
─────  ─────────────────────────
30min  ✅ Relatório pronto em output/!
```

---

## 🎓 ESTILO DE APRENDIZADO?

### Visual (Diagramas + Exemplos)
→ Leia: PLANO (seções com diagrama), EXAMPLES.md

### Hands-On (Fazer Primeiro)
→ QUICKSTART.md → crie relatório → TROUBLESHOOTING quando erro

### Conceitual (Entender Tudo)
→ PLANO-DESENVOLVIMENTO.md (completo) → skills/generate-jrxml.md

### Referência (Buscar Info)
→ TROUBLESHOOTING.md, INDEX-EXECUTIVO.md (bookmarks)

---

## 🚀 AFTER ACTION REPORT

Após ler:

1. **Crie seu primeiro relatório**: 
   - Preencha `prompts/relatorio-simples.prompt.md`
   - Cole em Copilot
   - Rode `validate.js + compile.js`

2. **Documente aprendizado**:
   - Se erro → busque em TROUBLESHOOTING.md
   - Se bug → anote em issue GitHub
   - Se sucesso → celebre! 🎉

3. **Próximo passo**:
   - Mais relatórios: repita processo
   - Customizar: customize `rules/views.json`
   - Estender: leia PLANO fases 2-5

---

## ✋ PERGUNTAS FREQUENTES

**P: Por onde começo se não tenho tempo?**  
R: README (5 min) → SETUP (15 min) = 20 min pronto

**P: Preciso entender tudo antes de usar?**  
R: Não! Use QUICKSTART primeiro, aprenda depois

**P: Tenho error, o que fazer?**  
R: TROUBLESHOOTING.md → procure categoria → siga solução

**P: Posso customizar para meu caso?**  
R: Sim! `rules/views.json` (adicione views), `prompts/` (templates)

**P: Quando vou às fases 2-5?**  
R: Depois de 10+ relatórios rodando, leia PLANO seções finais

---

## 📞 LINKS RÁPIDOS

| Situação | Link |
|----------|------|
| **Sou novo** | [README.md](README.md) |
| **Vou instalar** | [SETUP.md](SETUP.md) |
| **Vou criar relatório** | [docs/QUICKSTART.md](docs/QUICKSTART.md) |
| **Tenho problema** | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |
| **Quero exemplos** | [docs/EXAMPLES.md](docs/EXAMPLES.md) |
| **Quero tudo** | [PLANO-DESENVOLVIMENTO.md](PLANO-DESENVOLVIMENTO.md) |
| **Quero índice** | [INDEX-EXECUTIVO.md](INDEX-EXECUTIVO.md) |
| **Quero visual** | [RESUMO-VISUAL.md](RESUMO-VISUAL.md) |

---

## 🎯 SUCCESS CRITERIA

Você conseguiu quando:

- ✅ npm install executado sem erros
- ✅ Copilot funcionando (Ctrl+I abre chat)
- ✅ Primeiro relatório gerado (`output/` tem `.jrxml`)
- ✅ `.jasper` compilado sem ERROs
- ✅ `.pdf` visualizado com sucesso
- ✅ Segundo relatório criado em < 10 min

---

**Pronto para começar?**

👉 **Abra [README.md](README.md) agora!**

---

**Guia criado:** 30 de Março de 2026  
**Versão:** 1.0  
**Última atualização:** [hoje]
