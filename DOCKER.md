# Docker 部署指南

## 前置要求

- Docker 20.10+
- Docker Compose V2+

## 快速启动（一键部署）

macOS / Linux:

```bash
./docker-setup.sh
```

Windows（双击运行或在 CMD 中执行）：

```bat
docker-setup.bat
```

首次运行会自动：
1. 从 `.env.example` 生成 `.env`（随机填充 `JWT_SECRET`）
2. 检测 MySQL 和 Redis 是否已在运行
3. 如果已运行 → 跳过数据库，只启动后端和前端
4. 如果未运行 → 启动全部 4 个服务（MySQL、Redis、后端、前端）

如需配置 AI、邮件等可选功能，先编辑 `.env`，再重新运行脚本。

### 已有数据库的情况

如果你已经手动用 `docker run` 或其他方式启动了 MySQL/Redis，只需在 `.env` 中配置对应的连接信息：

```bash
MYSQL_HOST=localhost      # 或 host.docker.internal（Docker 内访问宿主机）
MYSQL_PORT=3306
MYSQL_DATABASE=pai_resume
MYSQL_USERNAME=root
MYSQL_PASSWORD=你的密码

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=你的密码
```

脚本会自动检测到已有数据库，只启动后端和前端。

### 手动启动

```bash
# 1. 设置必须的环境变量
export JWT_SECRET=your-random-secret-at-least-32-bytes
export AI_API_KEY=your-ai-api-key

# 2. 启动所有服务（首次会自动构建镜像）
docker compose up -d

# 3. 查看启动状态
docker compose ps
```

启动完成后访问：

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost |
| 后端 API | http://localhost/api/ |
| API 文档 | http://localhost/api/doc.html |

## 服务说明

| 服务 | 镜像 | 端口映射 | 说明 |
|------|------|----------|------|
| frontend | 自建（nginx） | `80:80` | React 前端 + API 反代 |
| backend | 自建（JRE 17） | `8080:8080` | Spring Boot 后端 |
| mysql | mysql:8.0 | `13306:3306` | 数据库 |
| redis | redis:7-alpine | `16379:6379` | 缓存 |

> MySQL 和 Redis 使用非标准宿主机端口（13306、16379），避免与本地服务冲突。

## 环境变量

### 必填

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 密钥，至少 32 字节随机字符串，生产环境必须设置 |

### 可选

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `AI_API_KEY` | （空） | AI 服务 API Key |
| `AI_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` | AI 服务地址 |
| `AI_MODEL` | `glm-5.1` | 主 AI 模型 |
| `AI_ANALYSIS_MODEL` | `glm-4.5-air` | 简历分析模型 |
| `AI_INTERVIEW_MODEL` | `GLM-4-Flash` | 模拟面试模型 |
| `MYSQL_PASSWORD` | `pairesume123` | MySQL root 密码 |
| `MYSQL_DATABASE` | `pai_resume` | 数据库名 |
| `MAIL_USERNAME` | （空） | SMTP 发件邮箱 |
| `MAIL_PASSWORD` | （空） | SMTP 授权码 |
| `DEV_ACCOUNT_EMAIL` | （空） | 开发测试账号邮箱 |
| `DEV_ACCOUNT_PASSWORD` | （空） | 开发测试账号密码 |

可以在 `docker compose up` 前通过 `export` 设置，也可以创建 `.env` 文件（已在 `.gitignore` 中，不会提交）。

## 常用命令

```bash
# 启动
docker compose up -d

# 查看日志（跟踪所有服务）
docker compose logs -f

# 只看后端日志
docker compose logs -f backend

# 停止（保留数据）
docker compose down

# 停止并清除数据卷（慎用，会删数据库）
docker compose down -v

# 重新构建镜像（代码更新后）
docker compose build
docker compose up -d

# 只重建后端
docker compose build backend
docker compose up -d backend
```

## 自定义端口

在 `docker compose up` 前设置环境变量：

```bash
export FRONTEND_HOST_PORT=3000
export BACKEND_HOST_PORT=9090
docker compose up -d
```

## 数据持久化

MySQL 和 Redis 的数据存储在 Docker volumes 中：

- `pairesume_mysql_data` → MySQL 数据
- `pairesume_redis_data` → Redis 数据

`docker compose down` 不会删除 volumes，数据会保留。如需清除：

```bash
docker compose down -v
```

## Prompt 配置文件

后端运行时会读取 `config/` 目录下的 YAML 配置文件，通过 volume 挂载到容器内：

```
config/
├── field-optimize-prompts.yml   # 字段优化提示词
├── jd-parse-prompts.yml        # JD 解析提示词
├── error-check-prompts.yml     # 简历纠错提示词
├── ats-check-prompts.yml       # ATS 解析提示词
└── mock-interview-prompts.yml  # 模拟面试提示词
```

修改后重启后端即可生效：

```bash
docker compose restart backend
```

## 架构

```
浏览器 ──► nginx (:80) ──/api──► Spring Boot (:8080) ──► MySQL (:3306)
                                        └──► Redis (:6379)
```

- nginx 负责前端静态文件 + API 反向代理
- SSE 流式接口已配置 `proxy_buffering off`，支持实时推送
- 前端为 SPA，所有路由回退到 `index.html`
