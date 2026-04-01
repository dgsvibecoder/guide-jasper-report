# Matriz de Compatibilidade - Modo Simples

Objetivo: Documentar plataformas e ambientes onde modo simples deve funcionar após Fase 0.

## 1. Ambientes Suportados

### 1.1 Node.js

| Versão | Status | Testado | Notas |
|--------|--------|---------|-------|
| 16.x | ✅ SUPPORTED | Sim | LTS, suportado oficialmente |
| 18.x | ✅ SUPPORTED | A fazer | LTS, suportado oficialmente |
| 20.x | ✅ SUPPORTED | A fazer | LTS, suportado oficialmente |
| 21.x | ⚠️ COMPATIBLE | A fazer | Já testou mas é transitório |
| < 16 | ❌ NOT SUPPORTED | - | Fora de suporte |

Teste recomendado: `node --version` >= 16.0.0

### 1.2 Sistema Operacional

| OS | Versão | Status | Testado | Notas |
|----|--------|--------|---------|-------|
| Windows 10+ | 21H2+ | ✅ SUPPORTED | Sim | suporta WSL ou nativa |
| Windows 11 | todas | ✅ SUPPORTED | Sim | suporta WSL ou nativa |
| Ubuntu | 20.04+ | ✅ SUPPORTED | Sim | LTS recomendada |
| Ubuntu | 22.04+ | ✅ SUPPORTED | Sim | LTS atual |
| macOS | 11+ (Big Sur) | ✅ SUPPORTED | A fazer | Intel e Apple Silicon |
| WSL 2 | todas | ✅ SUPPORTED | Sim | Dual boot com Windows |

Teste recomendado: rodar `npm install` e `node scripts/validate.js` em cada OS

### 1.3 Maven (para compilacao Java)

| Versão | Status | Testado | Notas |
|--------|--------|---------|-------|
| 3.8.1+ | ✅ SUPPORTED | A fazer | recomendado >= 3.9.0 |
| 3.9.x | ✅ SUPPORTED | A fazer | atual estável |
| < 3.8.1 | ⚠️ LEGACY | - | security issues, evitar |

### 1.4 JDK (para compilacao Java)

| Versão | Status | Testado | Notas |
|--------|--------|---------|-------|
| JDK 11 | ✅ SUPPORTED | Sim | em pom.xml: maven.compiler.source=11 |
| JDK 17 | ✅ SUPPORTED | A fazer | LTS, compatível |
| JDK 21 | ✅ SUPPORTED | A fazer | LTS, compatível |
| JDK < 11 | ❌ NOT SUPPORTED | - | fora de suporte, EOL |

### 1.5 JasperReports

| Versão | Status | Testado | Notas |
|--------|--------|---------|-------|
| 6.2.0 | ✅ BASELINE | Sim | única suportada em Fase 0 |
| > 6.2.0 | ❌ NOT YET | - | será avaliado em upgrade futuro |
| < 6.2.0 | ❌ NOT SUPPORTED | - | muito antiga e insegura |

## 2. Dependências Externas Críticas

### 2.1 Node modules (scripts/)

Dependências esperadas no package.json:

```json
"dependencies": {
  "xml2js": "^0.6.2",      ← parsing JRXML
  "chalk": "^4.1.2"        ← output colorido
},
"devDependencies": {
  "jest": "^29.0.0"        ← testes (futuro)
}
```

Verificação: `npm list`

### 2.2 Maven POM

```xml
<jasperreports.version>6.2.0</jasperreports.version>
```

Dependências críticas:
- net.sf.jasperreports:jasperreports:6.2.0
- org.postgresql:postgresql:42.7.2 (atualizado de 42.7.0)
- org.apache.pdfbox:pdfbox:2.0.30

Verificação: `mvn dependency:tree`

## 3. Comandos Críticos - Compatibilidade Esperada

### 3.1 Validação

```bash
# Compatível (modo simples sem modelo)
node scripts/validate.js output/RELATORIO_*/relatorio.jrxml

# Compatível (modo simples com modelo visual)
node scripts/validate.js output/RELATORIO_*/relatorio.jrxml rules/views.json --check-model-contamination /tmp/modelo.jrxml

# Saída esperada em ambos: exit code 0
```

### 3.2 Compilação

```bash
# Compatível (modo simples, sem PDF)
node scripts/compile.js output/RELATORIO_*/relatorio.jrxml

# Compatível (modo simples, com PDF)
node scripts/compile.js output/RELATORIO_*/relatorio.jrxml --pdf

# Saída esperada: exit code 0, arquivos gerados
```

### 3.3 Java runner

```bash
# Neste snapshot de compatibilidade suporta:
java -jar jasper-runner.jar compile <report.jrxml> <report.jasper>
java -jar jasper-runner.jar pdf <report.jrxml> <report.pdf>
java -jar jasper-runner.jar pdf-from-jasper <report.jasper> <report.pdf>
java -jar jasper-runner.jar pdf-with-data <report.jasper> <report.pdf> <DB_URL> <DB_USER> <DB_PASSWORD>
```

Compatibilidade esperada: ✅ todos sem mudança

## 4. Base de Dados (Teste com Dados Reais)

### 4.1 PostgreSQL

| Versão | Status | Testado | Notas |
|--------|--------|---------|-------|
| 12 | ✅ SUPPORTED | A fazer | suporte até 2024 |
| 13 | ✅ SUPPORTED | A fazer | suporte até 2025 |
| 14 | ✅ SUPPORTED | A fazer | suporte até 2026 |
| 15 | ✅ SUPPORTED | A fazer | suporte até 2027 |

Driver atualizado: postgresql:42.7.2 (compatível com Postgres 12+)

### 4.2 MySQL (futuro)

Compatibilidade ainda nao validada. Comentário em rules/views.json.

## 5. Ambientes de Execucao Tipicos

### 5.1 Developer Local (Windows + WSL)

Matriz esperada:
- Windows 10/11
- WSL 2 com Ubuntu 20.04+ ou Windows native com Node 16+
- Maven 3.9+ com JDK 11+
- PostgreSQL local ou remoto

Status esperado: ✅ SUPPORTED

### 5.2 CI/CD (GitHub Actions)

Matriz esperada:
- ubuntu-latest (20.04 LTS)
- Node 16.x, 18.x, 20.x
- Maven 3.9+, JDK 11+

Status esperado: ✅ SUPPORTED

### 5.3 Docker / Container

Matriz esperada:
- node:16, node:18, node:20
- maven:3.9-jdk-11+
- Postgres:14+

Status esperado: ✅ COMPATIBLE (com Dockerfile apropriado)

## 6. Cenarios de Regressao Critica

Compatibilidade regressiva para validar em cada fase:

- [ ] Modo simples sem modelo visual - gera PDF com dados ✅
- [ ] Modo simples com modelo visual - gera PDF com estilo ✅
- [ ] Modo simples com múltiplos filtros - SQL parametrizado ✅
- [ ] Modo simples com agregacao (SUM, COUNT) - aplicado corretamente ✅
- [ ] Validacao JSON de tipo SQL (type consistency check) - detecta INT/VARCHAR mismatch ✅
- [ ] Validacao de contaminacao semantica de modelo - bloqueia heranca de dados ✅

## 7. Plano de Teste por Fase

### Fase 0: Congelamento (Atualizar nesta fase)

- [ ] Verificar Node 16+ instala dpendencias
- [ ] Verificar Maven 3.9+ compila pom.xml
- [ ] Verificar 1 relatorio simples full pipeline
- [ ] Verificar 1 relatorio com modelo visual
- [ ] Coletar checksums baseline

### Fase 1-8: Pre-mudanca (Executar antes de cada fase)

- [ ] Smoke test: relatorio simples sem modelo
- [ ] Smoke test: relatorio simples com modelo
- [ ] Validar exit codes esperados

### Fase 1-8: Pos-mudanca (Executar apos cada fase)

- [ ] Repetir testes de regressao acima
- [ ] Validar que saídas esperadas nao mudaram de formato
- [ ] Validar que metadata.json mantem estrutura anterior

## 8. Checkpoint de Compatibilidade de Fase 0

Antes de aprovar Fase 0:

- [ ] Todos ambientes em 5 foram testados ou documentados (seu estado)
- [ ] Nenhuma ferramenta/versao foi substituída sem nota
- [ ] Checklist de regressao critica foi passado
- [ ] Decisão: Fase 0 APPROVED ou BLOCKED para revisao

---

**Proximos passos:**

1. Executar testes em cada ambiente (dev local, CI, Docker)
2. Coletar checksums de baseline (BASELINE-MODO-SIMPLES.md)
3. Atualizar esta matriz com status real
