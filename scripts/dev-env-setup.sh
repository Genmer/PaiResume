#!/usr/bin/env bash
# ================================================================
# PaiResume 开发环境一键部署脚本 (Mac / Linux)
# 使用 Docker 部署 MySQL + Redis，数据持久化到本机
#
# 用法：
#   ./scripts/dev-env-setup.sh              # 确保模式：跳过已正常运行的，只补缺失的
#   ./scripts/dev-env-setup.sh --reinstall  # 重装模式：删除所有容器重建（保留数据）
# ================================================================

set -uo pipefail
# Note: 不使用 set -e，手动处理错误以实现 ensure 逻辑

# ---- 解析参数 ----
REINSTALL=false
for arg in "$@"; do
    case "$arg" in
        --reinstall|-r) REINSTALL=true ;;
        *) echo "Unknown option: $arg"; echo "Usage: $0 [--reinstall]"; exit 1 ;;
    esac
done

# ---- 配置（可修改） ----
DATE_TAG="20260725"
MYSQL_CONTAINER="workon-auto-mysql-${DATE_TAG}"
REDIS_CONTAINER="workon-auto-redis-${DATE_TAG}"
NETWORK_NAME="workon-auto-network"

MYSQL_IMAGE="mysql:8.0.37"
REDIS_IMAGE="redis:7.2.5-alpine"

MYSQL_ROOT_PASSWORD="root"
MYSQL_DATABASE="resume"
MYSQL_PORT="3306"
REDIS_PORT="6379"
REDIS_PASSWORD="root"

# 数据卷基础目录
VOLUMES_BASE="${DOCKER_VOLUMES_BASE:-$HOME/Documents/docker-volumes}"
MYSQL_DATA_DIR="${VOLUMES_BASE}/mysql/data"
MYSQL_CONF_DIR="${VOLUMES_BASE}/mysql/conf"
REDIS_DATA_DIR="${VOLUMES_BASE}/redis/data"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ---- 辅助函数 ----
is_container_running() {
    local name="$1"
    local result
    result=$(docker ps --filter "name=^${name}$" --format "{{.Names}}" 2>/dev/null || true)
    [[ "$result" == "$name" ]]
}

container_exists() {
    local name="$1"
    local result
    result=$(docker ps -a --filter "name=^${name}$" --format "{{.Names}}" 2>/dev/null || true)
    [[ "$result" == "$name" ]]
}

remove_container() {
    local name="$1"
    if container_exists "$name"; then
        docker rm -f "$name" > /dev/null 2>&1 || true
        echo -e "    ${YELLOW}removed: ${name}${NC}"
    fi
}

# ---- 标题 ----
echo ""
echo -e "${BLUE}================================================${NC}"
if $REINSTALL; then
    echo -e "${BLUE}  PaiResume Docker (Mac/Linux) - REINSTALL MODE${NC}"
else
    echo -e "${BLUE}  PaiResume Docker (Mac/Linux) - ENSURE MODE${NC}"
fi
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "  MySQL:       ${GREEN}${MYSQL_CONTAINER} (${MYSQL_IMAGE})${NC}"
echo -e "  Redis:       ${GREEN}${REDIS_CONTAINER} (${REDIS_IMAGE})${NC}"
echo -e "  Volumes:     ${GREEN}${VOLUMES_BASE}${NC}"
echo ""

# ---- 检查 Docker ----
if ! command -v docker &> /dev/null; then
    echo -e "${RED}FAILED: Docker not installed or not in PATH${NC}"
    exit 1
fi

if ! docker info &> /dev/null 2>&1; then
    echo -e "${RED}FAILED: Docker is not running, please start Docker Desktop${NC}"
    exit 1
fi

# ---- REINSTALL: 删除所有容器（保留数据） ----
if $REINSTALL; then
    echo -e "${BLUE}[0] Reinstall: removing existing containers (data volumes preserved)...${NC}"
    remove_container "$MYSQL_CONTAINER"
    remove_container "$REDIS_CONTAINER"
    echo -e "    ${GREEN}Done. Data at ${VOLUMES_BASE} is preserved.${NC}"
    echo ""
fi

# ---- Step 1: 数据卷目录 ----
echo -e "${BLUE}[1/5] Data volume directories${NC}"
mkdir -p "$MYSQL_DATA_DIR" "$MYSQL_CONF_DIR" "$REDIS_DATA_DIR"
echo -e "    ${GREEN}OK: ${MYSQL_DATA_DIR}${NC}"
echo -e "    ${GREEN}OK: ${MYSQL_CONF_DIR}${NC}"
echo -e "    ${GREEN}OK: ${REDIS_DATA_DIR}${NC}"

# ---- Step 2: Docker Network ----
echo -e "${BLUE}[2/5] Docker network: ${NETWORK_NAME}${NC}"
if docker network inspect "$NETWORK_NAME" &> /dev/null 2>&1; then
    echo -e "    ${GREEN}SKIP: network already exists${NC}"
else
    docker network create "$NETWORK_NAME" > /dev/null
    echo -e "    ${GREEN}CREATED${NC}"
fi

# ---- Step 3: MySQL ----
echo -e "${BLUE}[3/5] MySQL container: ${MYSQL_CONTAINER}${NC}"
if ! $REINSTALL && is_container_running "$MYSQL_CONTAINER"; then
    echo -e "    ${GREEN}SKIP: already running${NC}"
else
    if container_exists "$MYSQL_CONTAINER"; then
        remove_container "$MYSQL_CONTAINER"
    fi
    mysql_ok=false
    for attempt in 1 2 3; do
        if [[ $attempt -gt 1 ]]; then
            echo -e "    ${YELLOW}Retry $attempt/3...${NC}"
            remove_container "$MYSQL_CONTAINER"
            sleep 3
        fi
        if docker run -d \
            --name "$MYSQL_CONTAINER" \
            --network "$NETWORK_NAME" \
            -p "${MYSQL_PORT}:3306" \
            -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
            -e MYSQL_DATABASE="$MYSQL_DATABASE" \
            -v "${MYSQL_DATA_DIR}:/var/lib/mysql" \
            -v "${MYSQL_CONF_DIR}:/etc/mysql/conf.d" \
            --restart unless-stopped \
            "$MYSQL_IMAGE" \
            --character-set-server=utf8mb4 \
            --collation-server=utf8mb4_unicode_ci \
            --default-authentication-plugin=caching_sha2_password \
            > /dev/null 2>&1; then
            mysql_ok=true
            break
        fi
    done
    if ! $mysql_ok; then
        echo -e "    ${RED}FAILED: MySQL failed after 3 attempts. Try: docker pull $MYSQL_IMAGE${NC}"
        exit 1
    fi
    echo -e "    ${GREEN}CREATED: localhost:${MYSQL_PORT}${NC}"
fi

# ---- Step 4: Redis ----
echo -e "${BLUE}[4/5] Redis container: ${REDIS_CONTAINER}${NC}"
if ! $REINSTALL && is_container_running "$REDIS_CONTAINER"; then
    echo -e "    ${GREEN}SKIP: already running${NC}"
else
    if container_exists "$REDIS_CONTAINER"; then
        remove_container "$REDIS_CONTAINER"
    fi
    redis_ok=false
    for attempt in 1 2 3; do
        if [[ $attempt -gt 1 ]]; then
            echo -e "    ${YELLOW}Retry $attempt/3...${NC}"
            remove_container "$REDIS_CONTAINER"
            sleep 3
        fi
        if docker run -d \
            --name "$REDIS_CONTAINER" \
            --network "$NETWORK_NAME" \
            -p "${REDIS_PORT}:6379" \
            -v "${REDIS_DATA_DIR}:/data" \
            --restart unless-stopped \
            "$REDIS_IMAGE" \
            redis-server --requirepass "$REDIS_PASSWORD" --appendonly yes \
            > /dev/null 2>&1; then
            redis_ok=true
            break
        fi
    done
    if ! $redis_ok; then
        echo -e "    ${RED}FAILED: Redis failed after 3 attempts. Try: docker pull $REDIS_IMAGE${NC}"
        exit 1
    fi
    echo -e "    ${GREEN}CREATED: localhost:${REDIS_PORT}${NC}"
fi

# ---- Step 5: Wait for MySQL ready ----
echo -e "${BLUE}[5/5] Waiting for MySQL to be ready...${NC}"
MAX_WAIT=60
WAITED=0
while ! docker exec "$MYSQL_CONTAINER" mysqladmin ping -uroot -p"$MYSQL_ROOT_PASSWORD" --silent 2>/dev/null; do
    sleep 2
    WAITED=$((WAITED + 2))
    if [[ $WAITED -ge $MAX_WAIT ]]; then
        echo -e "    ${RED}FAILED: MySQL not ready after ${MAX_WAIT}s. Run: docker logs ${MYSQL_CONTAINER}${NC}"
        exit 1
    fi
done
echo -e "    ${GREEN}OK: MySQL ready (waited ${WAITED}s)${NC}"

# ---- Schema init (only if tables missing) ----
TABLE_COUNT=$(docker exec "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}';" -sN 2>/dev/null || echo "0")

if [[ "$TABLE_COUNT" -gt "0" ]]; then
    echo -e "    ${GREEN}SKIP: database '${MYSQL_DATABASE}' already has ${TABLE_COUNT} tables${NC}"
else
    SCHEMA_FILE="$(cd "$(dirname "$0")/../server/src/main/resources" 2>/dev/null && pwd)/schema.sql"
    if [[ -f "$SCHEMA_FILE" ]]; then
        echo -e "    ${BLUE}Initializing schema...${NC}"
        docker exec -i "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < "$SCHEMA_FILE"
        echo -e "    ${GREEN}OK: schema initialized${NC}"
    else
        echo -e "    ${YELLOW}WARN: schema.sql not found, skipping${NC}"
    fi
fi

# ---- Done ----
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  All services are running!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "  MySQL:  root / ${MYSQL_ROOT_PASSWORD} @ localhost:${MYSQL_PORT} / ${MYSQL_DATABASE}"
echo -e "  Redis:  localhost:${REDIS_PORT} (password: ${REDIS_PASSWORD})"
echo ""
echo -e "  Commands:"
echo -e "    docker logs ${MYSQL_CONTAINER}"
echo -e "    docker logs ${REDIS_CONTAINER}"
echo -e "    docker stop ${MYSQL_CONTAINER} ${REDIS_CONTAINER}"
echo -e "    docker start ${MYSQL_CONTAINER} ${REDIS_CONTAINER}"
echo ""
echo -e "  ${BLUE}Ready to start backend!${NC}"
echo ""
