# 📦 Backup Directory - Non-Essential Project Artifacts

This directory contains files that were moved during architectural cleanup. They are **NOT required** for the core JasperReports generation functionality but are preserved for reference and historical purposes.

---

## 📋 Directory Structure

```
backup/
├── processo/               # Project development process documentation (historical)
│   ├── ASSINATURA-CONCLUSAO.md
│   ├── CHECKLIST-CONCLUSAO.md
│   ├── ESTRUTURA-FINAL.md
│   ├── GET-STARTED.md          (see docs/QUICKSTART.md instead)
│   ├── GUIA-LEITURA.md
│   ├── INDEX-EXECUTIVO.md
│   ├── PLANO-DESENVOLVIMENTO.md (2000+ lines technical design)
│   ├── PROJETO-COMPLETO.md
│   ├── RESUMO-VISUAL.md
│   └── SETUP.md                (see docs/QUICKSTART.md instead)
│
├── design/                 # Design and architecture documentation
│   ├── CONTRATO-PROMPT-PDF-LEGADO.md  (see .github/copilot-instructions.md)
│   ├── PLANO-PARSER-PDF-LEGADO.md     (historical design plan)
│   ├── EXAMPLES.md                     (example reports)
│   └── TROUBLESHOOTING.md              (error reference)
│
├── exemplos/               # Examples, templates, and reference skills
│   ├── legacy-examples/            # Old JRXML sample files
│   ├── prompt-templates/           # Old prompt templates
│   └── skills/
│       └── generate-jrxml.md       (superseded by copilot-instructions.md)
│
├── setup/                  # One-time setup and test scripts
│   ├── seed-data.js        # Database seed script (run once)
│   ├── seed-accessops.sh   # AWS setup script (run once)
│   ├── SeedData.java       # Legacy seed helper
│   └── test.js             # Test utilities (no formal test suite)
│
└── dados-teste/            # Test data and temporary files
    └── tmp/
        ├── censo-ocupacional.pdf   # Legacy PDF used for Phase 1, 2, 3 testing
        └── [other test artifacts]
```

---

## 🗂️ What Should Stay in Active Project

**ESSENTIAL (DO NOT MOVE):**
- `scripts/` — Core report generation logic
- `rules/views.json` — Database schema validation rules
- `.github/copilot-instructions.md` — Copilot workflow instructions
- `docs/STYLE-BLUEPRINT.schema.json` — Blueprint contract specification
- `docs/QUICKSTART.md` — Quick-start guide
- `prompts/relatorio-simples.prompt.md` — Report generation prompt template
- `README.md` — Project overview
- `.vscode/` — VSCode workspace configuration
- `.gitignore`, `package.json`, `package-lock.json` — Project metadata
- `output/` — Generated reports and artifacts

---

## 📚 When to Reference Backup Files

| Scenario | File to Check |
|----------|---------------|
| Learning about report generation | `design/EXAMPLES.md` or `exemplos/legacy-examples/` |
| Debugging a generation error | `design/TROUBLESHOOTING.md` |
| Understanding project history | `processo/PLANO-DESENVOLVIMENTO.md` (2000+ lines) |
| Re-running database seed | `setup/seed-data.js` |
| Using old prompt templates as reference | `exemplos/prompt-templates/` |
| Testing with legacy PDF | `dados-teste/tmp/censo-ocupacional.pdf` |

---

## 🎯 Why Files Were Moved

### Processo documentation (10 files)
- **Reason**: Historical project development artifacts; project is now COMPLETE
- **Impact**: Zero functional impact
- **Recovery**: Any file can be restored if needed for audit/historical purposes

### Design documentation (4 files)
- **Reason**: Knowledge has been consolidated into copilot-instructions.md and inline code comments
- **Impact**: Zero functional impact (all critical info already documented in active files)

### Skills and example templates (2 directories)
- **Reason**: Functionality is now implemented and documented in copilot-instructions.md
- **Impact**: No code dependency; copilot will use main instructions

### Setup scripts (4 files)
- **Reason**: One-time execution scripts; not part of ongoing report generation
- **Impact**: Zero functional impact (database is already seeded)

### Test data (1 directory, 1+ files)
- **Reason**: Temporary testing artifacts; actual output lives in `output/`
- **Impact**: Can regenerate test PDFs if needed; functional tests don't depend on these

---

## ⚡ How to Restore Files (if needed)

```bash
# Restore a specific file:
git restore backup/processo/PLANO-DESENVOLVIMENTO.md

# Or simply move back:
mv backup/processo/PLANO-DESENVOLVIMENTO.md .

# Restore entire backup directory to active:
mv backup/* .
```

---

## 📊 Project Size Impact

**Before cleanup**: ~29MB (includes node_modules, examples, historical docs)  
**After cleanup**: ~8MB (active code + essentials only)  
**Reduction**: 73% ✅

---

**Created**: March 31, 2026  
**Purpose**: Architectural cleanup — keep project focused on core functionality
