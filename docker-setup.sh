#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ============ 1. 生成 .env ============
if [ ! -f .env ]; then
    echo "首次运行，自动生成 .env ..."
    cp .env.example .env

    JWT_RANDOM=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_RANDOM}|" .env
    else
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_RANDOM}|" .env
    fi

    echo ".env 已生成，JWT_SECRET 已自动填充。"
    echo ""
fi

# 加载 .env
set -a
source .env
set +a

MYSQL_PORT_CHECK=${MYSQL_PORT:-3306}
REDIS_PORT_CHECK=${REDIS_PORT:-6379}

# ============ 2. 检测数据库 ============
check_port() {
    local host=$1 port=$2
    if command -v nc &>/dev/null; then
        nc -z -w 2 "$host" "$port" 2>/dev/null
    elif command -v timeout &>/dev/null; then
        timeout 2 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null
    else
        bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null
    fi
}

echo "检测数据库状态..."

MYSQL_HOST_CHECK=${MYSQL_HOST:-localhost}
REDIS_HOST_CHECK=${REDIS_HOST:-localhost}

mysql_ok=false
redis_ok=false

check_port "$MYSQL_HOST_CHECK" "$MYSQL_PORT_CHECK" && mysql_ok=true
check_port "$REDIS_HOST_CHECK" "$REDIS_PORT_CHECK" && redis_ok=true

if $mysql_ok && $redis_ok; then
    echo "检测到 MySQL ($MYSQL_HOST_CHECK:$MYSQL_PORT_CHECK) 和 Redis ($REDIS_HOST_CHECK:$REDIS_PORT_CHECK) 已在运行。"
    echo "跳过数据库启动，仅启动后端和前端..."
    docker compose up -d backend frontend
else
    if ! $mysql_ok; then
        echo "未检测到 MySQL ($MYSQL_HOST_CHECK:$MYSQL_PORT_CHECK)，将自动启动。"
    fi
    if ! $redis_ok; then
        echo "未检测到 Redis ($REDIS_HOST_CHECK:$REDIS_PORT_CHECK)，将自动启动。"
    fi
    echo "启动所有服务（首次会自动构建镜像，请耐心等待）..."
    docker compose up -d
fi

echo ""
echo "========================================="
echo "  PaiResume 部署完成！"
echo "========================================="
echo ""
echo "  前端:    http://localhost"
echo "  后端 API: http://localhost/api/"
echo "  API 文档: http://localhost/api/doc.html"
echo ""
echo "常用命令:"
echo "  查看日志:  docker compose logs -f"
echo "  停止服务:  docker compose down"
echo "  重建镜像:  docker compose build && docker compose up -d"
echo ""
