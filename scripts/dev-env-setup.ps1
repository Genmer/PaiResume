# ================================================================
# PaiResume 开发环境一键部署脚本 (Windows PowerShell)
# 使用 Docker 部署 MySQL + Redis，数据持久化到本机
#
# 用法：
#   .\scripts\dev-env-setup.ps1              # 确保模式：跳过已正常运行的，只补缺失的
#   .\scripts\dev-env-setup.ps1 -Reinstall   # 重装模式：删除所有容器重建（保留数据）
# ================================================================

param(
    [switch]$Reinstall
)

$ErrorActionPreference = "Stop"

# ---- 配置（可修改） ----
$DATE_TAG = "20260725"
$MYSQL_CONTAINER = "workon-auto-mysql-$DATE_TAG"
$REDIS_CONTAINER = "workon-auto-redis-$DATE_TAG"
$NETWORK_NAME = "workon-auto-network"

$MYSQL_IMAGE = "mysql:8.0.37"
$REDIS_IMAGE = "redis:7.2.5-alpine"

$MYSQL_ROOT_PASSWORD = "root"
$MYSQL_DATABASE = "resume"
$MYSQL_PORT = "3306"
$REDIS_PORT = "6379"
$REDIS_PASSWORD = "root"

# 数据卷基础目录
if ($env:DOCKER_VOLUMES_BASE) {
    $VOLUMES_BASE = $env:DOCKER_VOLUMES_BASE
} else {
    $VOLUMES_BASE = "E:/Code/docker/docker-volumes"
}
$MYSQL_DATA_DIR = "$VOLUMES_BASE/mysql/data"
$MYSQL_CONF_DIR = "$VOLUMES_BASE/mysql/conf"
$REDIS_DATA_DIR = "$VOLUMES_BASE/redis/data"

# ---- 辅助函数 ----
function Write-Color {
    param([string]$Color, [string]$Text)
    Write-Host $Text -ForegroundColor $Color
}

function Write-Step {
    param([string]$Step, [string]$Text)
    Write-Host "[$Step] $Text" -ForegroundColor Cyan
}

function Test-ContainerRunning {
    param([string]$Name)
    $ErrorActionPreference = "SilentlyContinue"
    $result = docker ps --filter "name=^${Name}$" --format "{{.Names}}" 2>&1
    $ErrorActionPreference = "Stop"
    return ($LASTEXITCODE -eq 0 -and $result -eq $Name)
}

function Test-ContainerExists {
    param([string]$Name)
    $ErrorActionPreference = "SilentlyContinue"
    $result = docker ps -a --filter "name=^${Name}$" --format "{{.Names}}" 2>&1
    $ErrorActionPreference = "Stop"
    return ($LASTEXITCODE -eq 0 -and $result -eq $Name)
}

function Test-NetworkExists {
    $ErrorActionPreference = "SilentlyContinue"
    $null = docker network inspect $NETWORK_NAME 2>&1
    $exists = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = "Stop"
    return $exists
}

function Remove-ContainerIfExists {
    param([string]$Name)
    $ErrorActionPreference = "SilentlyContinue"
    $exists = docker ps -a --filter "name=^${Name}$" --format "{{.Names}}" 2>&1
    if ($LASTEXITCODE -eq 0 -and $exists -eq $Name) {
        docker rm -f $Name 2>&1 | Out-Null
        Write-Host "    removed: $Name" -ForegroundColor Yellow
    }
    $ErrorActionPreference = "Stop"
}

# ---- 标题 ----
Write-Host ""
Write-Color Cyan "================================================"
if ($Reinstall) {
    Write-Color Cyan "  PaiResume Docker (Windows) - REINSTALL MODE"
} else {
    Write-Color Cyan "  PaiResume Docker (Windows) - ENSURE MODE"
}
Write-Color Cyan "================================================"
Write-Host ""
Write-Host "  MySQL:       " -NoNewline; Write-Color Green "$MYSQL_CONTAINER ($MYSQL_IMAGE)"
Write-Host "  Redis:       " -NoNewline; Write-Color Green "$REDIS_CONTAINER ($REDIS_IMAGE)"
Write-Host "  Volumes:     " -NoNewline; Write-Color Green $VOLUMES_BASE
Write-Host ""

# ---- 检查 Docker ----
try {
    $null = Get-Command docker -ErrorAction Stop
} catch {
    Write-Host "FAILED: Docker not installed or not in PATH" -ForegroundColor Red
    exit 1
}

try {
    $ErrorActionPreference = "SilentlyContinue"
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw "not running" }
    $ErrorActionPreference = "Stop"
} catch {
    $ErrorActionPreference = "Stop"
    Write-Host "FAILED: Docker is not running, please start Docker Desktop" -ForegroundColor Red
    exit 1
}

# ---- REINSTALL: 删除所有容器（保留数据） ----
if ($Reinstall) {
    Write-Step "0" "Reinstall: removing existing containers (data volumes preserved)..."
    Remove-ContainerIfExists $MYSQL_CONTAINER
    Remove-ContainerIfExists $REDIS_CONTAINER
    Write-Color Green "    Done. Data at $VOLUMES_BASE is preserved."
    Write-Host ""
}

# ---- Step 1: 数据卷目录 ----
Write-Step "1/5" "Data volume directories"
New-Item -ItemType Directory -Path $MYSQL_DATA_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $MYSQL_CONF_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $REDIS_DATA_DIR -Force | Out-Null
Write-Color Green "    OK: $MYSQL_DATA_DIR"
Write-Color Green "    OK: $MYSQL_CONF_DIR"
Write-Color Green "    OK: $REDIS_DATA_DIR"

# ---- Step 2: Docker Network ----
Write-Step "2/5" "Docker network: $NETWORK_NAME"
if (Test-NetworkExists) {
    Write-Color Green "    SKIP: network already exists"
} else {
    docker network create $NETWORK_NAME | Out-Null
    Write-Color Green "    CREATED"
}

# ---- Step 3: MySQL ----
Write-Step "3/5" "MySQL container: $MYSQL_CONTAINER"
if (-not $Reinstall -and (Test-ContainerRunning $MYSQL_CONTAINER)) {
    Write-Color Green "    SKIP: already running"
} else {
    if (Test-ContainerExists $MYSQL_CONTAINER) {
        Remove-ContainerIfExists $MYSQL_CONTAINER
    }
    $mysqlOk = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        if ($attempt -gt 1) {
            Write-Host "    Retry $attempt/3..." -ForegroundColor Yellow
            # 清理上次失败的残留容器
            Remove-ContainerIfExists $MYSQL_CONTAINER
            Start-Sleep -Seconds 3
        }
        $ErrorActionPreference = "SilentlyContinue"
        docker run -d `
            --name $MYSQL_CONTAINER `
            --network $NETWORK_NAME `
            -p "${MYSQL_PORT}:3306" `
            -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" `
            -e MYSQL_DATABASE="$MYSQL_DATABASE" `
            -v "${MYSQL_DATA_DIR}:/var/lib/mysql" `
            -v "${MYSQL_CONF_DIR}:/etc/mysql/conf.d" `
            --restart unless-stopped `
            $MYSQL_IMAGE `
            --character-set-server=utf8mb4 `
            --collation-server=utf8mb4_unicode_ci `
            --default-authentication-plugin=caching_sha2_password `
            2>&1 | Out-Null
        $ErrorActionPreference = "Stop"
        if ($LASTEXITCODE -eq 0) { $mysqlOk = $true; break }
    }
    if (-not $mysqlOk) {
        Write-Host "    FAILED: MySQL failed after 3 attempts. Try manually: docker pull $MYSQL_IMAGE" -ForegroundColor Red
        exit 1
    }
    Write-Color Green "    CREATED: localhost:$MYSQL_PORT"
}

# ---- Step 4: Redis ----
Write-Step "4/5" "Redis container: $REDIS_CONTAINER"
if (-not $Reinstall -and (Test-ContainerRunning $REDIS_CONTAINER)) {
    Write-Color Green "    SKIP: already running"
} else {
    if (Test-ContainerExists $REDIS_CONTAINER) {
        Remove-ContainerIfExists $REDIS_CONTAINER
    }
    $redisOk = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        if ($attempt -gt 1) {
            Write-Host "    Retry $attempt/3..." -ForegroundColor Yellow
            Remove-ContainerIfExists $REDIS_CONTAINER
            Start-Sleep -Seconds 3
        }
        $ErrorActionPreference = "SilentlyContinue"
        docker run -d `
            --name $REDIS_CONTAINER `
            --network $NETWORK_NAME `
            -p "${REDIS_PORT}:6379" `
            -v "${REDIS_DATA_DIR}:/data" `
            --restart unless-stopped `
            $REDIS_IMAGE `
            redis-server --requirepass "$REDIS_PASSWORD" --appendonly yes `
            2>&1 | Out-Null
        $ErrorActionPreference = "Stop"
        if ($LASTEXITCODE -eq 0) { $redisOk = $true; break }
    }
    if (-not $redisOk) {
        Write-Host "    FAILED: Redis failed after 3 attempts. Try manually: docker pull $REDIS_IMAGE" -ForegroundColor Red
        exit 1
    }
    Write-Color Green "    CREATED: localhost:$REDIS_PORT"
}

# ---- Step 5: Wait for MySQL ready ----
Write-Step "5/5" "Waiting for MySQL to be ready..."
$maxWait = 60
$waited = 0
$ErrorActionPreference = "SilentlyContinue"
do {
    Start-Sleep -Seconds 2
    $waited += 2
    $null = docker exec $MYSQL_CONTAINER mysqladmin ping -uroot -p"$MYSQL_ROOT_PASSWORD" --silent 2>&1
    if ($LASTEXITCODE -eq 0) { break }
    if ($waited -ge $maxWait) {
        $ErrorActionPreference = "Stop"
        Write-Host "    FAILED: MySQL not ready after ${maxWait}s. Run: docker logs $MYSQL_CONTAINER" -ForegroundColor Red
        exit 1
    }
} while ($true)
$ErrorActionPreference = "Stop"
Write-Color Green "    OK: MySQL ready (waited ${waited}s)"

# ---- Schema init (only if tables missing) ----
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$schemaFile = Join-Path $scriptDir "..\server\src\main\resources\schema.sql"

$ErrorActionPreference = "SilentlyContinue"
$tableCount = docker exec $MYSQL_CONTAINER mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$MYSQL_DATABASE';" -sN 2>&1 | Select-Object -Last 1
$ErrorActionPreference = "Stop"

if ([int]$tableCount -gt 0) {
    Write-Color Green "    SKIP: database '$MYSQL_DATABASE' already has $tableCount tables"
} elseif (Test-Path $schemaFile) {
    Write-Host "    Initializing schema..." -ForegroundColor Cyan
    # 使用 docker cp 避免 PowerShell 管道 UTF-16 编码问题
    docker cp $schemaFile "${MYSQL_CONTAINER}:/tmp/schema.sql"
    $ErrorActionPreference = "SilentlyContinue"
    docker exec $MYSQL_CONTAINER mysql -uroot -p"$MYSQL_ROOT_PASSWORD" $MYSQL_DATABASE -e "source /tmp/schema.sql" 2>&1 | Out-Null
    $initResult = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    if ($initResult -eq 0) {
        Write-Color Green "    OK: schema initialized"
    } else {
        Write-Host "    FAILED: schema init error" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "    WARN: schema.sql not found at $schemaFile, skipping" -ForegroundColor Yellow
}

# ---- Done ----
Write-Host ""
Write-Color Green "================================================"
Write-Color Green "  All services are running!"
Write-Color Green "================================================"
Write-Host ""
Write-Host "  MySQL:  root / $MYSQL_ROOT_PASSWORD @ localhost:$MYSQL_PORT / $MYSQL_DATABASE"
Write-Host "  Redis:  localhost:$REDIS_PORT (password: $REDIS_PASSWORD)"
Write-Host ""
Write-Host "  Commands:"
Write-Host "    docker logs $MYSQL_CONTAINER"
Write-Host "    docker logs $REDIS_CONTAINER"
Write-Host "    docker stop $MYSQL_CONTAINER $REDIS_CONTAINER"
Write-Host "    docker start $MYSQL_CONTAINER $REDIS_CONTAINER"
Write-Host ""
Write-Color Cyan "  Ready to start backend!"
Write-Host ""
