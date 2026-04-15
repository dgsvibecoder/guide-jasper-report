# Verificacao de pre-requisitos de ambiente para JasperReports
# Executar antes do primeiro uso: .\setup\check-env.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile   = Join-Path $ScriptDir "..\scripts\.env"
$Errors    = 0

# --- Java ---
try {
    $JavaOutput  = (& java -version 2>&1)
    $VersionLine = ($JavaOutput | Where-Object { $_ -match 'version' } | Select-Object -First 1).ToString()
    $VersionStr  = if ($VersionLine -match '"([^"]+)"') { $matches[1] } else { "desconhecida" }
    $Major       = ($VersionStr -split '[._]')[0]
    if ($Major -eq "1") { $Major = ($VersionStr -split '[._]')[1] }
    if ([int]$Major -ge 11) {
        Write-Host "[OK]  Java $VersionStr"
    } else {
        Write-Host "[ERRO] Java versao < 11. Versao detectada: $VersionStr. Instale JDK 11 ou superior."
        $Errors++
    }
} catch {
    Write-Host "[ERRO] Java nao encontrado. Instale JDK 11 ou superior e configure JAVA_HOME."
    $Errors++
}

# --- Maven ---
try {
    $MvnLine    = (& mvn -version 2>&1 | Select-Object -First 1).ToString()
    $MvnVersion = if ($MvnLine -match 'Apache Maven (\S+)') { $matches[1] } else { $MvnLine }
    Write-Host "[OK]  Maven $MvnVersion"
} catch {
    Write-Host "[ERRO] Maven nao encontrado. Instale Maven 3.6 ou superior e configure MAVEN_HOME."
    $Errors++
}

# --- Node.js ---
try {
    $NodeVersion = (& node --version 2>&1).ToString().Trim()
    $NodeMajor   = if ($NodeVersion -match '^v(\d+)') { [int]$matches[1] } else { 0 }
    if ($NodeMajor -ge 16) {
        Write-Host "[OK]  Node.js $NodeVersion"
    } else {
        Write-Host "[ERRO] Node.js versao < 16. Versao detectada: $NodeVersion. Instale Node.js 16 ou superior."
        $Errors++
    }
} catch {
    Write-Host "[ERRO] Node.js nao encontrado. Instale Node.js 16 ou superior."
    $Errors++
}

# --- Variaveis de banco de dados ---
$EffDbUrl      = $null
$EffDbUser     = $null
$EffDbPassword = $null
$DbSrc         = "via variavel de ambiente"

# Priority 1: scripts/.env
if (Test-Path $EnvFile) {
    $Lines = Get-Content $EnvFile -Encoding UTF8
    foreach ($Line in $Lines) {
        $Line = $Line.Trim()
        if ($Line.StartsWith('#') -or $Line -eq '') { continue }
        if ($Line -match '^DB_URL=(.+)$')      { $EffDbUrl      = $matches[1]; $DbSrc = "via .env" }
        if ($Line -match '^DB_USER=(.+)$')     { $EffDbUser     = $matches[1] }
        if ($Line -match '^DB_PASSWORD=(.+)$') { $EffDbPassword = $matches[1] }
    }
}

# Priority 2: system environment variables (fallback)
if (-not $EffDbUrl)      { $EffDbUrl      = $env:DB_URL }
if (-not $EffDbUser)     { $EffDbUser     = $env:DB_USER }
if (-not $EffDbPassword) { $EffDbPassword = $env:DB_PASSWORD }

if ($EffDbUrl) {
    Write-Host "[OK]  DB_URL detectado ($DbSrc)"
} else {
    Write-Host "[ERRO] DB_URL nao encontrado."
    Write-Host "       Crie o arquivo scripts\.env com o conteudo abaixo e tente novamente:"
    Write-Host ""
    Write-Host "         DB_URL=jdbc:postgresql://HOST:5432/DATABASE?sslmode=disable"
    Write-Host "         DB_USER=seu_usuario"
    Write-Host "         DB_PASSWORD=sua_senha"
    Write-Host ""
    Write-Host "       Referencia: scripts\.env.example"
    $Errors++
}

if ($EffDbUser) {
    Write-Host "[OK]  DB_USER detectado"
} else {
    Write-Host "[AVISO] DB_USER nao encontrado. Defina DB_USER em scripts\.env ou como variavel de ambiente."
}

if ($EffDbPassword) {
    Write-Host "[OK]  DB_PASSWORD detectado"
} else {
    Write-Host "[AVISO] DB_PASSWORD nao encontrado. Defina DB_PASSWORD em scripts\.env ou como variavel de ambiente."
}

Write-Host ""
if ($Errors -eq 0) {
    Write-Host "Ambiente pronto para uso."
} else {
    Write-Host "Corrija os erros acima antes de continuar."
    exit 1
}
