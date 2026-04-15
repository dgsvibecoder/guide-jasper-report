# PLANO B — Melhorias que requerem autorização explícita (arquivos protegidos)

**Escopo:** `scripts/`, `setup/`, `rules/views.json`, `.github/copilot-instructions.md`  
**Autorização necessária:** SIM — cada item abaixo deve ser autorizado individualmente  
**Origem:** Análise de 4 relatórios gerados por usuário real (`analysis/*.md`)  
**Status:** Aguardando autorização explícita por item

---

## B1 — Problema 1: Script de verificação de pré-requisitos de ambiente

**Diagnóstico:** O Teste 1 (REL_ACCOUNT) exigiu 5 a 6 instruções extras apenas para
conseguir compilar pela primeira vez: instalar Extension Pack for Java, configurar Maven
manualmente (`MAVEN_HOME`, `PATH`), configurar `JAVA_HOME`. A IA diagnosticou o ambiente
de forma reativa, instrução por instrução, sem nenhum ponto de verificação antecipada.

### Arquivos novos (não editam arquivos protegidos existentes, mas alteram `setup/`)

- `setup/check-env.ps1` — Windows
- `setup/check-env.sh` — Linux/Mac

### O que os scripts verificam

1. Java instalado e versão `>= 11` (`java -version`)
2. Maven instalado (`mvn -version`)
3. Node.js `>= 16` (`node --version`)
4. Variáveis de conexão com banco: verifica na ordem (a) arquivo `scripts/.env`, (b) variáveis de ambiente do sistema; se nenhum, emite aviso e instrui criação do `.env`

### Saída esperada (sucesso)

```
[OK]  Java 11.0.22
[OK]  Maven 3.9.6
[OK]  Node.js v20.11.0
[OK]  DB_URL detectado (via .env)
[OK]  DB_USER detectado
[OK]  DB_PASSWORD detectado
Ambiente pronto para uso.
```

### Saída esperada (falha de conexão)

```
[ERRO] DB_URL não encontrado.
       Crie o arquivo scripts/.env com o conteúdo abaixo e tente novamente:

         DB_URL=jdbc:postgresql://HOST:5432/DATABASE?sslmode=disable
         DB_USER=seu_usuario
         DB_PASSWORD=sua_senha

       Referência: scripts/.env.example
```

### Referências a atualizar (não protegidas)

- Mencionar `setup/check-env` no início de `docs/QUICKSTART.md` e `docs/GUIA-CREATE-JASPER-REPORTS.md` como **Etapa 0 obrigatória** antes do primeiro relatório.

### Autorização necessária para

- Criar `setup/check-env.ps1`
- Criar `setup/check-env.sh`

---

## B2 — Problema 2: Suporte a `.env` para credenciais de banco de dados

**Diagnóstico:** Em todos os 4 testes o usuário informou credenciais de banco via variáveis
de ambiente no formato PowerShell (`$env:DB_URL = "..."`). Esse formato não persiste entre
sessões de terminal e não funciona em ambientes WSL ou sh. O resultado foram múltiplas
iterações de falha na geração de PDF onde a IA não conseguia diagnosticar se as variáveis
estavam de fato definidas no processo Node.js.

### Arquivos protegidos modificados

| Arquivo                             | Mudança                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `scripts/package.json`              | Adicionar `"dotenv": "^16.0.0"` em `dependencies`                  |
| `scripts/compile.js`                | `require('dotenv').config()` no topo + log de variáveis detectadas |
| `scripts/generate-pdf-with-data.js` | `require('dotenv').config()` no topo                               |
| `scripts/validate.js`               | `require('dotenv').config()` no topo                               |

### Arquivo novo (não protegido)

- `scripts/.env.example` — template de credenciais para o usuário copiar e preencher

Conteúdo do `.env.example`:

```
# Copie este arquivo para scripts/.env e preencha com suas credenciais.
# O arquivo .env NÃO deve ser versionado no Git.
DB_URL=jdbc:postgresql://HOST:5432/DATABASE?sslmode=disable
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

### Mudança no `compile.js` — log de diagnóstico antes de gerar PDF

Logo antes de chamar `java -jar jasper-runner.jar pdf-with-data`, emitir no console:

```
[DB] DB_URL:      jdbc:postgresql://172.31.251.11:5432/hero (detectado via .env)
[DB] DB_USER:     hero (detectado)
[DB] DB_PASSWORD: *** (definido)
```

Se qualquer variável não estiver definida:

```
[AVISO] DB_URL não definido. PDF com dados reais pode falhar.
        Defina DB_URL em scripts/.env ou como variável de ambiente.
```

### Segurança

- Verificar se `scripts/.env` já consta em `.gitignore`; se não, adicionar.
- O log nunca exibe o valor de `DB_PASSWORD` — apenas `***` se definido ou `não definido`.

### Autorização necessária para

- Editar `scripts/package.json`
- Editar `scripts/compile.js`
- Editar `scripts/generate-pdf-with-data.js`
- Editar `scripts/validate.js`
- Criar `scripts/.env.example`
- Verificar/editar `.gitignore`

---

## B3 — Problema 3: Suporte a MASTER_DETAIL com 2 níveis de detail

**Diagnóstico:** O Teste 3 (REL_FAT_PACIENTE) tentou criar topologia master → detail1 →
detail2. Sem suporte declarado no pipeline, a IA gerou JRXML por tentativa e erro durante
12 instruções. A solução correta é suportar o segundo nível de forma controlada, com limite
máximo documentado em 2 níveis.

**Aviso de escopo:** Este é o item de maior impacto. Envolve 4 arquivos protegidos e deve
ser tratado como evolução de engenharia planejada, não executada no meio de uma sessão de
geração de relatório.

### Arquivos protegidos modificados

| Arquivo                           | Mudança                                        |
| --------------------------------- | ---------------------------------------------- |
| `scripts/compile.js`              | Suporte ao parâmetro `--detail2 <caminho>`     |
| `scripts/validate.js`             | Validação de topologia 2-nível                 |
| `rules/views.json`                | Schema de relacionamentos em cadeia            |
| `.github/copilot-instructions.md` | Regras e pipeline para modo `MASTER_DETAIL_2L` |

### Mudanças em `scripts/compile.js`

- Aceitar `--detail2 <caminho>` como parâmetro opcional
- Quando `--detail2` presente, compilar em 3 estágios: `master → detail1 → detail2`
- `SUBREPORT_DETAIL_PATH` passado ao detail1 aponta para `detail2.jasper`
- `metadata.json` inclui `reportTopology.type = "MASTER_DETAIL_2L"` quando 2 níveis
- Se `--detail3` for tentado: falhar com mensagem `Máximo de 2 níveis de detail suportados`

Comando resultante:

```bash
node scripts/compile.js output/{pasta}/master.jrxml \
  --detail output/{pasta}/detail1.jrxml \
  --detail2 output/{pasta}/detail2.jrxml \
  --relationship {chave} \
  --pdf
```

### Mudanças em `scripts/validate.js`

- Ao validar `detail1.jrxml`, se detectar `<subreport>` na banda detail, verificar se `--detail2` foi informado
- Validar que `detail2.jrxml` existe e que a chave de relação do segundo nível existe em `rules/views.json.relationships`
- Bloquear com exit code 1 se alguém tentar 3 ou mais níveis

### Mudanças em `rules/views.json`

Adicionar suporte a relacionamentos em cadeia no schema de `relationships`:

```json
{
  "masterView": "viewA",
  "detailView": "viewB",
  "detail2View": "viewC",
  "relationship": {
    "localKey": "chaveA",
    "foreignKey": "chaveB",
    "cardinality": "1:N"
  },
  "relationship2": {
    "localKey": "chaveB",
    "foreignKey": "chaveC",
    "cardinality": "1:N"
  }
}
```

### Mudanças em `.github/copilot-instructions.md`

- Adicionar seção `MODO MASTER_DETAIL_2L` com regras análogas às de `MASTER_DETAIL`
- Documentar limite máximo: 2 níveis de detail
- Atualizar pipeline obrigatório (passo 4) para incluir `--detail2` quando aplicável
- Atualizar seção de troubleshooting com erros típicos do 2º nível
- Remover (ou atualizar) qualquer texto que descreva MASTER_DETAIL como limitado a 1 nível

### Artefatos esperados com topologia 2L

- `master.jasper`, `detail1.jasper`, `detail2.jasper`
- `master.pdf`
- `master.log`
- `metadata.json` com `reportTopology.type = "MASTER_DETAIL_2L"`

### Autorização necessária para

- Editar `scripts/compile.js`
- Editar `scripts/validate.js`
- Editar `rules/views.json`
- Editar `.github/copilot-instructions.md`

---

## Resumo consolidado

| Item           | Arquivos protegidos                                                                                      | Arquivos novos                              | Prioridade                   |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------- |
| B1 — check-env | `setup/` (novos)                                                                                         | `setup/check-env.ps1`, `setup/check-env.sh` | Alta                         |
| B2 — .env      | `scripts/compile.js`, `scripts/generate-pdf-with-data.js`, `scripts/validate.js`, `scripts/package.json` | `scripts/.env.example`                      | Alta                         |
| B3 — 2L detail | `scripts/compile.js`, `scripts/validate.js`, `rules/views.json`, `.github/copilot-instructions.md`       | —                                           | Média (engenharia planejada) |

## Dependências entre itens

- B1 e B2 são independentes entre si e podem ser autorizados separadamente.
- B3 depende logicamente de B2 estar concluído (compilação com conexão estável) para testes confiáveis.
- B1 deve ser implementado antes de B2, pois o script `check-env` verificará a existência do `.env`.
