# 🚀 QUICKSTART: Primeiro Relatório em 5 Minutos

## ℹ️ Pré-requisitos Verificados?

```bash
node --version  # Deve ser 16+
npm --version   # Deve estar instalado
```

Se não tiver, instale Node.js em: https://nodejs.org/

Antes de executar os comandos abaixo, confirme se existem `scripts/validate.js` e `scripts/compile.js`.
Se não existirem, eles ainda estão apenas descritos em `PLANO-DESENVOLVIMENTO.md`.

---

## 1️⃣ Instalar Dependências (1 min)

```bash
cd scripts
npm install
cd ..
```

**Output esperado:**
```
npm notice created a lockfile as package-lock.json
added 2 packages in 1.23s
```

---

## 2️⃣ Preencher Template (2 min)

Abra `prompts/relatorio-simples.prompt.md`:

```markdown
Nome do Relatório: VENDAS_DIARIAS
View Selecionada: view_vendas_diarias
Campos Desejados: data, item_nome, quantidade, valor_total, vendedor_nome

Filtro 1:
  Nome: dataInicio
  Tipo: DATE
  ...

[Complete conforme template]
```

---

## 3️⃣ Chamar Copilot (1-2 min)

1. Abra **Copilot Chat** (Ctrl+I ou Cmd+I no Mac)
2. Cole a seção **PROMPT PARA O COPILOT** de `prompts/relatorio-simples.prompt.md`
3. Aguarde resposta

---

**Esperado receber:**

```
✅ Criando arquivo: output/VENDAS_DIARIAS_20260330_143022/vendas_diarias.jrxml
✅ XML bem-formado (UTF-8)
✅ Compilando: node scripts/compile.js ...
✅ COMPILAÇÃO SUCESSO
✅ PDF preview gerado
```

---

## 4️⃣ Validar & Verificar Output (1 min)

```bash
# Lista arquivos gerados
ls -la output/VENDAS_DIARIAS_*/

# Deve mostrar:
# vendas_diarios.jrxml       ← XML (abra para conferir)
# vendas_diarios.jasper      ← Compilado
# vendas_diarios.pdf         ← Preview (abra em navegador/PDF reader)
# vendas_diarios.log         ← Validação
# metadata.json              ← Versioning
```

---

## 5️⃣ Validar Manualmente (Segurança)

```bash
node scripts/validate.js output/VENDAS_DIARIAS_20260330_143022/vendas_diarias.jrxml
```

Se estiver dentro de `scripts/`, use o caminho relativo correto:

```bash
node validate.js ../output/VENDAS_DIARIAS_20260330_143022/vendas_diarias.jrxml
```

**Output esperado:**
```
✓ XML bem-formado (raiz: VENDAS_DIARIAS)
✓ View 'view_vendas_diarias' validada
✓ 2 parâmetros encontrados
✓ 4/4 bandas recomendadas encontradas
✅ VALIDAÇÃO SUCESSO
```

---

## ✅ Pronto!

Arquivos em `output/VENDAS_DIARIAS_20260330_143022/`:
- ✅ `vendas_diarios.jrxml` - Pronto para BD
- ✅ `vendas_diarios.jasper` - Compilado para app
- ✅ `vendas_diarios.pdf` - Preview visual
- ✅ `vendas_diarios.log` - Sem erros (só warnings)

**Deploy**: Copie `.jrxml` + `.jasper` para sua app!

---

## 🆘 Se Deu Erro

1. **Check arquivo `.log`:**
   ```bash
   cat output/VENDAS_DIARIAS_20260330_143022/vendas_diarios.log
   ```

2. **Se XML error:** Verifique `<![CDATA[...]]>` no JRXML
3. **Se view not found:** Confira `rules/views.json`
4. **Se validation fail:** Rode `validate.js` individualmente

Consulte [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

Erro comum de caminho:

- Se você estiver em `scripts/`, não use `node scripts/validate.js`.
- Nesse caso, use `node validate.js ...`.

---

## 📚 Próximos Passos

1. **Criar segundo relatório:** Repita processo 2-5
2. **Explorar exemplos:** Veja `docs/EXAMPLES.md`
3. **Ler guia completo:** [PLANO-DESENVOLVIMENTO.md](../PLANO-DESENVOLVIMENTO.md)
4. **Integrar BD:** Configure `.env` com credenciais (fase 2)

---

**Tempo total esperado:** 5-10 minutos para primeiro relatório!
