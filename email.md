Searched for text `extension|extensão|vscode|vsix` (`**/*.md`), 20 results

Searched for files matching `**/.vscode/extensions.json`, no matches

Searched for files matching `**/.vscode/**`, no matches

Não há um extensions.json no repositório. Com base em tudo que o setup usa (Markdown, XML/JRXML, PDF, GitHub Copilot, Java/Maven), aqui está o email completo:

---

**Assunto:** Pré-requisitos para usar o setup de geração de relatórios JasperReports

---

Olá,

Para conseguir usar o setup de geração de relatórios JasperReports via IA, você precisará instalar alguns programas e extensões na sua máquina. Siga o passo a passo abaixo **na ordem indicada**.

---

### Passo 1 — Instalar os programas base

Todos os downloads abaixo são gratuitos.

**1.1 Visual Studio Code (VS Code)**
Editor de código onde tudo acontece.
→ Download: https://code.visualstudio.com/

**1.2 JDK 11+ (Java Development Kit)**
Motor que compila os relatórios. Versão mínima: 11.
→ Download recomendado (Temurin/Eclipse): https://adoptium.net/
→ Escolha: **JDK 11** ou superior, pacote **JDK** (não JRE), seu sistema operacional.
→ Após instalar, reinicie o computador.

**1.3 Apache Maven**
Ferramenta que faz o build do motor Java interno do setup.
→ Download: https://maven.apache.org/download.cgi
→ Baixe o arquivo `.zip` (Windows) ou `.tar.gz` (Mac/Linux), descompacte e adicione a pasta `bin` ao PATH do sistema.
→ Guia passo a passo para Windows: https://maven.apache.org/install.html

**1.4 Node.js 16+**
Executa os scripts de validação e compilação do setup.
→ Download: https://nodejs.org/
→ Escolha a versão **LTS** (recomendada). O npm vem junto automaticamente.

---

### Passo 2 — Instalar extensões no VS Code

Abra o VS Code e instale as extensões abaixo. Para instalar: pressione `Ctrl+Shift+X` para abrir o painel de extensões, pesquise pelo nome e clique em **Install**.

**Extensões obrigatórias:**

| #   | Nome da extensão            | Para que serve                                                 | ID para pesquisar          |
| --- | --------------------------- | -------------------------------------------------------------- | -------------------------- |
| 1   | **GitHub Copilot**          | IA que gera os relatórios automaticamente                      | `GitHub.copilot`           |
| 2   | **GitHub Copilot Chat**     | Interface de chat com a IA                                     | `GitHub.copilot-chat`      |
| 3   | **Extension Pack for Java** | Suporte a Java e Maven dentro do VS Code                       | `vscjava.vscode-java-pack` |
| 4   | **XML** (Red Hat)           | Visualizar e validar arquivos `.jrxml` com destaque de sintaxe | `redhat.vscode-xml`        |

**Extensões recomendadas (facilitam muito o trabalho):**

| #   | Nome da extensão              | Para que serve                                                                               | ID para pesquisar                     |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| 5   | **Markdown Preview Enhanced** | Visualizar arquivos `.md` (guias e documentação) diretamente no VS Code                      | `shd101wyy.markdown-preview-enhanced` |
| 6   | **vscode-pdf**                | Abrir e visualizar arquivos `.pdf` gerados direto no VS Code, sem precisar de outro programa | `tomoki1207.pdf`                      |
| 7   | **Prettier – Code Formatter** | Formata automaticamente XML e outros arquivos para facilitar leitura                         | `esbenp.prettier-vscode`              |

> **Importante:** O GitHub Copilot requer uma **assinatura ativa** (individual ou via organização). Confirme com seu gestor se você já tem acesso antes de prosseguir.

---

### Passo 3 — Clonar o repositório e instalar dependências

Abra o terminal do VS Code (`Ctrl+`` ` ``) e execute:

```bash
# 1. Clonar o repositório
git clone <URL-do-repositório> guide-jasper-report
cd guide-jasper-report

# 2. Abrir no VS Code
code .

# 3. Instalar dependências dos scripts
cd scripts
npm install
cd ..
```

---

### Passo 4 — Configurar as credenciais do banco de dados

O setup se conecta ao banco de dados para gerar PDFs com dados reais. Você precisará das credenciais fornecidas pelo time de infraestrutura/DBA.

1. Localize o arquivo .env.example
2. Faça uma cópia dele com o nome `scripts/.env`
3. Edite o arquivo `.env` preenchendo os três campos:

```
DB_URL=jdbc:postgresql://SERVIDOR:5432/BANCO?sslmode=disable
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

> **Atenção:** Nunca compartilhe o arquivo `.env` nem o envie para o Git. Ele contém sua senha.

---

### Passo 5 — Verificar se tudo está instalado corretamente

Execute o script de verificação de ambiente:

**Windows (PowerShell):**

```powershell
.\setup\check-env.ps1
```

**Linux / Mac (Terminal):**

```bash
bash setup/check-env.sh
```

Todos os itens devem aparecer como `[OK]`. Se algum aparecer `[ERRO]`, corrija o item indicado antes de continuar.

---

### Passo 6 — Build inicial do motor Java (feito uma única vez)

```bash
cd scripts/jasper-runner
mvn package -q
cd ../..
```

Isso pode levar alguns minutos na primeira vez (Maven baixa as dependências). Após concluir, o setup está 100% pronto para uso.

---

### Resumo rápido do que instalar

```
✅ VS Code
✅ JDK 11 ou superior
✅ Apache Maven 3.6 ou superior
✅ Node.js 16 ou superior (LTS)
✅ Extensão: GitHub Copilot
✅ Extensão: GitHub Copilot Chat
✅ Extensão: Extension Pack for Java
✅ Extensão: XML (Red Hat)
✅ Extensão: Markdown Preview Enhanced
✅ Extensão: vscode-pdf
✅ Extensão: Prettier
✅ Credenciais de banco (DB_URL, DB_USER, DB_PASSWORD)
```

Qualquer dúvida durante a instalação, entre em contato com [nome do responsável].

Att,
[Seu nome]

Aqui estão duas sugestões com tons diferentes:

---

## Sugestão 1 — Tom executivo, foco em resultado

**Relatórios JasperReports em minutos — sem precisar saber SQL ou Jasper**

O time de deploy agora conta com um setup de geração automática de relatórios que elimina a dependência de especialistas técnicos para cada nova demanda.

Com uma instrução simples em linguagem natural — informando o nome do relatório, os campos desejados e os filtros — o GitHub Copilot gera automaticamente o arquivo de relatório completo, compila e entrega o PDF pronto para produção.

**O que muda na prática:**

- Antes: abrir chamado para a equipe técnica → esperar análise → aguardar desenvolvimento → revisar → aprovar. Dias ou semanas.
- Agora: preencher um formulário padronizado → enviar para o Copilot → validar o PDF gerado. Minutos.

O setup é fail-safe: cada etapa é validada automaticamente antes de prosseguir. Erros de estrutura, campos inválidos e inconsistências são detectados e reportados antes de qualquer geração, eliminando retrabalho.

Não é necessário conhecimento em SQL, XML ou JasperReports. O único pré-requisito humano é saber descrever o relatório que precisa.

---

## Sugestão 2 — Tom direto, foco nas pessoas

**Você não precisa ser técnico para gerar um relatório de produção**

Sabe aquela situação em que você precisa de um relatório novo e a fila do time de TI está cheia? Ou em que o relatório existe, mas precisaria de um ajuste pequeno e isso vira uma demanda de duas semanas?

Esse setup foi criado exatamente para resolver isso.

Com ele, qualquer pessoa do time de deploy consegue gerar relatórios JasperReports completos — com layout, filtros, conexão com banco de dados e PDF — apenas descrevendo o que precisa em uma mensagem. O GitHub Copilot cuida de toda a parte técnica.

**Sem precisar saber:**

- SQL
- XML / JasperReports
- Java ou Node.js

**O que você faz:**

1. Descreve o relatório (nome, campos, filtros)
2. O Copilot gera e valida tudo automaticamente
3. Você recebe o PDF pronto para produção

O processo tem verificação automática em cada etapa. Se algo estiver errado — campo inválido, tipo incorreto, estrutura quebrada — o sistema avisa antes de gerar qualquer arquivo. Nada chega em produção com erro.

Resultado: menos fila para o time técnico, mais autonomia para quem opera, e relatórios entregues no mesmo dia.
