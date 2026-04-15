#!/usr/bin/env bash
# Verificacao de pre-requisitos de ambiente para JasperReports
# Executar antes do primeiro uso: bash setup/check-env.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../scripts/.env"
ERRORS=0

# --- Java ---
if command -v java > /dev/null 2>&1; then
    JAVA_VER_RAW=$(java -version 2>&1 | head -1)
    JAVA_VER_STR=$(echo "$JAVA_VER_RAW" | sed 's/.*version "\([^"]*\)".*/\1/')
    JAVA_MAJOR=$(echo "$JAVA_VER_STR" | cut -d. -f1)
    # Java 8 e anteriores usam formato "1.8.x" — major real e o segundo segmento
    [ "$JAVA_MAJOR" = "1" ] && JAVA_MAJOR=$(echo "$JAVA_VER_STR" | cut -d. -f2)
    if [ "$JAVA_MAJOR" -ge 11 ] 2>/dev/null; then
        echo "[OK]  Java $JAVA_VER_STR"
    else
        echo "[ERRO] Java versao < 11 detectada: $JAVA_VER_STR. Instale JDK 11 ou superior."
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "[ERRO] Java nao encontrado. Instale JDK 11 ou superior e configure JAVA_HOME."
    ERRORS=$((ERRORS + 1))
fi

# --- Maven ---
if command -v mvn > /dev/null 2>&1; then
    MVN_LINE=$(mvn -version 2>&1 | head -1)
    MVN_VER=$(echo "$MVN_LINE" | sed 's/Apache Maven \([^ ]*\).*/\1/')
    echo "[OK]  Maven $MVN_VER"
else
    echo "[ERRO] Maven nao encontrado. Instale Maven 3.6 ou superior e configure MAVEN_HOME."
    ERRORS=$((ERRORS + 1))
fi

# --- Node.js ---
if command -v node > /dev/null 2>&1; then
    NODE_VER=$(node --version 2>&1)
    NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -ge 16 ] 2>/dev/null; then
        echo "[OK]  Node.js $NODE_VER"
    else
        echo "[ERRO] Node.js versao < 16 detectada: $NODE_VER. Instale Node.js 16 ou superior."
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "[ERRO] Node.js nao encontrado. Instale Node.js 16 ou superior."
    ERRORS=$((ERRORS + 1))
fi

# --- Variaveis de banco de dados ---
EFF_DB_URL=""
EFF_DB_USER=""
EFF_DB_PASSWORD=""
DB_SRC="via variavel de ambiente"

# Priority 1: scripts/.env
if [ -f "$ENV_FILE" ]; then
    while IFS= read -r line; do
        case "$line" in "#"*|"") continue ;; esac
        case "$line" in
            DB_URL=*)      EFF_DB_URL="${line#DB_URL=}";      DB_SRC="via .env" ;;
            DB_USER=*)     EFF_DB_USER="${line#DB_USER=}"     ;;
            DB_PASSWORD=*) EFF_DB_PASSWORD="${line#DB_PASSWORD=}" ;;
        esac
    done < "$ENV_FILE"
fi

# Priority 2: system environment variables (fallback)
[ -z "$EFF_DB_URL" ]      && EFF_DB_URL="${DB_URL:-}"
[ -z "$EFF_DB_USER" ]     && EFF_DB_USER="${DB_USER:-}"
[ -z "$EFF_DB_PASSWORD" ] && EFF_DB_PASSWORD="${DB_PASSWORD:-}"

if [ -n "$EFF_DB_URL" ]; then
    echo "[OK]  DB_URL detectado ($DB_SRC)"
else
    echo "[ERRO] DB_URL nao encontrado."
    echo "       Crie o arquivo scripts/.env com o conteudo abaixo e tente novamente:"
    echo ""
    echo "         DB_URL=jdbc:postgresql://HOST:5432/DATABASE?sslmode=disable"
    echo "         DB_USER=seu_usuario"
    echo "         DB_PASSWORD=sua_senha"
    echo ""
    echo "       Referencia: scripts/.env.example"
    ERRORS=$((ERRORS + 1))
fi

if [ -n "$EFF_DB_USER" ]; then
    echo "[OK]  DB_USER detectado"
else
    echo "[AVISO] DB_USER nao encontrado. Defina DB_USER em scripts/.env ou como variavel de ambiente."
fi

if [ -n "$EFF_DB_PASSWORD" ]; then
    echo "[OK]  DB_PASSWORD detectado"
else
    echo "[AVISO] DB_PASSWORD nao encontrado. Defina DB_PASSWORD em scripts/.env ou como variavel de ambiente."
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
    echo "Ambiente pronto para uso."
else
    echo "Corrija os erros acima antes de continuar."
    exit 1
fi
