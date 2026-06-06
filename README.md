123
# PaiResume

PaiResume 是一个面向中文简历场景的在线简历编辑器，采用前后端分离架构，支持账号体系、模块化简历编辑、实时预览、Markdown/TXT 简历导入、AI 优化与整份简历分析，以及 PDF 导出。

## 项目特性

- 邮箱注册、登录、Token 刷新与退出登录
- 简历列表管理：新建、重命名、删除
- 模块化简历编辑：基础信息、教育背景、实习经历、项目经历、专业技能、论文发表、科研经历、获奖情况
- 实时预览，编辑区与预览区联动
- 支持拖拽导入 Markdown / TXT 格式的结构化简历
- 支持 PDF 简历导入：后端提取文本 + AI 结构化解析，前端四步进度反馈
- 简历原件存档与重新解析：导入的 PDF 原件持久保存，可随时查看原件、一键重新解析，并对手动修改过的模块给出覆盖警告
- 支持 AI 单模块优化与字段级优化
- 支持整份简历分析与评分，支持自定义分析提示词
- JD 解析与人岗匹配：AI 按 JD 给简历打分，输出技能差距与分模块建议
- 简历纠错与 ATS 兼容性检查
- AI 求职信与面试自我介绍生成
- 模拟面试：可选简历针对性面试，复盘报告持久化与历史回看
- 公开分享链接：可启用/停用，带浏览量统计
- 会员体系：激活码兑换、管理后台、调用量统计
- 支持导出 PDF，多套模板与排版主题
- 全站统一设计令牌体系（品牌渐变、卡片阴影、圆角描边规范）
- 提供健康检查与就绪检查接口

## 技术栈

### 前端

- React 18
- TypeScript
- Vite 6
- React Router 7
- Zustand
- Tailwind CSS
- Axios
- Framer Motion
- `@react-pdf/renderer`

### 后端

- Java 17
- Spring Boot 3.3
- Spring Security
- MyBatis-Plus
- MySQL
- Redis
- JWT
- Knife4j / OpenAPI
- WebClient

## 项目结构

```text
PaiResume
├── config/
│   └── field-optimize-prompts.yml # 字段优化默认提示词配置
├── src/                          # 前端源码
│   ├── api/                      # 接口封装
│   ├── components/               # 页面组件、表单组件、预览组件
│   ├── pages/                    # 登录、注册、工作台、编辑页
│   ├── store/                    # Zustand 状态管理
│   ├── utils/                    # PDF 导出、Markdown 导入、模块内容处理等
│   └── types/                    # 类型定义
├── server/                       # Spring Boot 后端
│   ├── src/main/java/...         # Controller / Service / Config / Security
│   └── src/main/resources/       # application.yml / schema.sql
├── public/fonts/                 # PDF 导出使用的中文字体
└── .env.example                  # 前后端共用环境变量示例
```

## 本地启动

### 1. 准备环境

- Node.js 18+
- npm 9+
- Java 17
- Maven 3.9+
- Docker Desktop（用于一键部署 MySQL + Redis）

### 2. 一键部署数据库和 Redis（Docker）

项目提供了跨平台的 Docker 一键部署脚本，自动创建 MySQL 8.0 和 Redis 7.2 容器并初始化表结构。

**两种模式：**

| 模式 | 说明 | 适用场景 |
| --- | --- | --- |
| 确保模式（默认） | 逐个检查服务，已正常运行的跳过，只补缺失的 | 日常启动、上次中途失败后继续 |
| 重装模式 (`-Reinstall` / `--reinstall`) | 删除所有容器后从头创建，保留数据卷 | 环境异常、更换镜像版本 |

#### Windows (PowerShell)

```powershell
# 确保模式 - 相对路径（在项目根目录下执行）
.\scripts\dev-env-setup.ps1

# 确保模式 - 绝对路径（在任意目录下执行）
e:\Code\Java\PaiResume\scripts\dev-env-setup.ps1

# 重装模式 - 删除容器并重新创建（数据保留）
.\scripts\dev-env-setup.ps1 -Reinstall
e:\Code\Java\PaiResume\scripts\dev-env-setup.ps1 -Reinstall
```

#### Mac / Linux (Bash)

```bash
# 首次执行需要赋权
chmod +x scripts/dev-env-setup.sh

# 确保模式 - 相对路径（在项目根目录下执行）
./scripts/dev-env-setup.sh

# 确保模式 - 绝对路径（在任意目录下执行，路径替换为你的实际路径）
/Users/<你的用户名>/Code/PaiResume/scripts/dev-env-setup.sh

# 重装模式 - 删除容器并重新创建（数据保留）
./scripts/dev-env-setup.sh --reinstall
/Users/<你的用户名>/Code/PaiResume/scripts/dev-env-setup.sh --reinstall
```

#### 脚本特性

| 特性 | 说明 |
| --- | --- |
| 容器命名 | `workon-auto-mysql-20260725` / `workon-auto-redis-20260725` |
| 镜像版本 | MySQL `8.0.37` / Redis `7.2.5-alpine`（固定版本，不用 latest） |
| 数据持久化 | 数据映射到本机目录，容器删除不丢数据 |
| 重复执行保护 | 检测已有容器和数据库数据，确认后才重建 |
| 自动建表 | 等待 MySQL 就绪后自动执行 `schema.sql` |

#### 数据卷默认路径

| 平台 | 默认基础目录 | 示例 |
| --- | --- | --- |
| Mac | `~/Documents/docker-volumes` | `~/Documents/docker-volumes/mysql/data` |
| Windows | `E:/Code/docker/docker-volumes` | `E:/Code/docker/docker-volumes/mysql/data` |

可通过环境变量修改基础目录：

```bash
# Mac/Linux
DOCKER_VOLUMES_BASE=/custom/path ./scripts/dev-env-setup.sh
```

```powershell
# Windows PowerShell
$env:DOCKER_VOLUMES_BASE='D:/docker-volumes'; .\scripts\dev-env-setup.ps1
```

#### Windows 常见问题

| 问题 | 原因 | 解决方法 |
| --- | --- | --- |
| 中文乱码 / 字符显示为 `鏁版嵁搴?` | PowerShell 5.1 默认不识别无 BOM 的 UTF-8 文件 | 脚本已保存为 UTF-8 with BOM；如重新编辑请确保编辑器保存时选择 "UTF-8 with BOM" |
| `数组索引表达式丢失` 解析错误 | 字符串中的 `[xxx]` 被 PowerShell 解析为数组索引 | 已修复，使用 `Write-Host -ForegroundColor` 替代自定义函数传参 |
| `NativeCommandError` docker network not found | `$ErrorActionPreference = "Stop"` 将 docker stderr 视为终止错误 | 已修复，关键 docker 调用前临时切换为 `SilentlyContinue` |
| 执行策略限制 (`Execution Policy`) | 系统默认禁止运行 .ps1 脚本 | 执行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 或加 `-ExecutionPolicy Bypass` 参数 |

#### Mac / Linux 注意事项

- 首次执行前必须 `chmod +x scripts/dev-env-setup.sh` 赋予可执行权限
- 如遇 `Permission denied`，检查是否用了 `sh scripts/dev-env-setup.sh`（应使用 `bash` 或 `./`）
- macOS 默认编码为 UTF-8，无需额外配置
- 脚本已对所有可能失败的 docker 命令加了 `|| true` 防止 `set -e` 误退出

### 3. 启动后端

在项目根目录准备环境变量：

```bash
cp .env.example .env
```

按实际情况修改根目录 `.env`，至少确认以下配置：

- `SERVER_PORT`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USERNAME`
- `MYSQL_PASSWORD`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `AI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL`

启动服务：

```bash
cd server
mvn spring-boot:run
```

默认情况下：

- 后端地址：[http://localhost:8084/api](http://localhost:8084/api)
- 健康检查：[http://localhost:8084/api/health](http://localhost:8084/api/health)
- 就绪检查：[http://localhost:8084/api/ready](http://localhost:8084/api/ready)
- 接口文档：[http://localhost:8084/api/doc.html](http://localhost:8084/api/doc.html)

说明：

- 后端启动时会自动执行 `server/src/main/resources/schema.sql` 建表。
- 当 `APP_ENV=development` 时，后端启动后会自动确保存在一个测试账号，默认是 `test@example.com / Test123456`，可通过 `DEV_ACCOUNT_EMAIL` 和 `DEV_ACCOUNT_PASSWORD` 覆盖。
- 当前项目没有显式依赖 Flyway 运行迁移，数据库初始化以 `schema.sql` 为准。
- 在 `APP_ENV` 不是 `development` 时，必须显式覆盖 `JWT_SECRET`，否则服务会拒绝启动。

### 4. 启动前端

在项目根目录执行：

```bash
npm install
npm run dev
```

默认情况下：

- 前端地址：[http://localhost:5173](http://localhost:5173)
- 前端会通过 Vite 代理把 `/api` 请求转发到后端

## Docker 部署

无需手动安装 Java、Node.js、MySQL、Redis，一条命令即可启动完整服务。脚本会自动检测当前环境是否已有数据库，智能决定启动哪些服务。

详细配置（环境变量、自定义端口、数据持久化等）参见 **[DOCKER.md](./DOCKER.md)**。

### 一键启动

macOS / Linux：

```bash
./docker-setup.sh
```

Windows（双击运行或在 CMD 中执行）：

```bat
docker-setup.bat
```

脚本自动处理：
1. 首次运行自动生成 `.env`（随机填充 `JWT_SECRET`）
2. 检测 MySQL/Redis 是否已在运行
3. 已有数据库 → 只启动后端 + 前端
4. 没有数据库 → 启动全部 4 个服务（MySQL、Redis、后端、前端）

### 服务与端口

| 服务 | 镜像 | 端口映射 | 说明 |
|------|------|----------|------|
| frontend | 自建（nginx） | `80:80` | React 前端 + API 反代 |
| backend | 自建（JRE 17） | `8080:8080` | Spring Boot 后端 |
| mysql | mysql:8.0 | `13306:3306` | 数据库 |
| redis | redis:7-alpine | `16379:6379` | 缓存 |

启动完成后访问：

- 前端：http://localhost
- 后端 API：http://localhost/api/
- API 文档：http://localhost/api/doc.html

### 常用命令

```bash
docker compose logs -f          # 查看所有服务日志
docker compose logs -f backend  # 只看后端日志
docker compose down             # 停止（保留数据）
docker compose down -v          # 停止并清除数据卷（慎用）
docker compose build            # 重新构建镜像
docker compose up -d            # 重启服务
```

---

## 环境变量

### 根目录 `.env`

| 变量名 | 说明 |
| --- | --- |
| `VITE_REACT_APP_TITLE` / `VITE_PORT` / `VITE_API_BASE_URL` / `VITE_API_PROXY_TARGET` | 前端标题、端口与本地代理配置 |
| `VITE_AI_API_KEY` / `VITE_AI_BASE_URL` / `VITE_AI_MODEL` | 前端预留 AI 配置，可选 |
| `APP_ENV` | 运行环境，默认 `development` |
| `APP_CORS_ALLOWED_ORIGIN_PATTERNS` | 允许跨域来源 |
| `SERVER_PORT` | 后端端口，默认 `8084` |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_DATABASE` / `MYSQL_USERNAME` / `MYSQL_PASSWORD` | MySQL 连接配置 |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis 连接配置 |
| `JWT_SECRET` | JWT 密钥，生产环境必须替换 |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` / `AI_ANALYSIS_MODEL` | AI 服务配置 |
| `FIELD_OPTIMIZE_PROMPTS_FILE` | 字段优化默认提示词配置文件路径，默认 `config/field-optimize-prompts.yml` |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | 邮件配置 |

说明：

- 当前简历分析与模块优化的主流程由后端 AI 接口提供。
- 前端中的 `VITE_AI_*` 变量更多是兼容性保留配置，联调时优先保证后端 AI 配置正确。
- 前端和后端现在统一从项目根目录 `.env` 读取配置，不再维护 `server/.env`。

### 字段优化提示词

- 字段优化页面使用的默认 `系统提示词`、`项目简介/项目描述`、`核心职责` 提示词，统一维护在 [config/field-optimize-prompts.yml](/Users/itwanger/Documents/GitHub/PaiResume/config/field-optimize-prompts.yml)。
- 这份 YAML 是多行可编辑配置，适合直接调整提示词，不需要把长文本塞进 `.env` 单行。
- 如果需要换路径，可以在根目录 `.env` 里修改 `FIELD_OPTIMIZE_PROMPTS_FILE`。
- 后端会按请求读取这份 YAML，并把同一份配置返回给前端字段优化页，所以前后端默认提示词是一致的。
- 修改 YAML 后：
- 后端下一次字段优化请求会使用新提示词。
- 前端字段优化页需要重新进入一次，才能看到新的默认提示词。

## 当前功能说明

### 认证

- 注册时需要邮箱验证码
- 登录后前端会持久化 `accessToken` 与 `refreshToken`
- 遇到 401/部分 403 场景时，前端会自动尝试刷新 Token

注意：

- 验证码通过 SMTP 发送，使用 HTML 邮件模板。当 `MAIL_USERNAME` / `MAIL_PASSWORD` 未配置时，开发模式会将验证码打印到后端控制台日志。

### 简历编辑

- 在工作台创建简历后进入编辑页
- 左侧为模块导航，中间为模块表单，右侧为实时预览
- 支持同类模块多实例的有：实习经历、项目经历、论文发表、科研经历、获奖情况等
- 支持对单个模块发起 AI 优化
- 支持对整份简历执行 AI 分析

### 导入与导出

- 当前已启用：Markdown / TXT / PDF 导入
- 当前未启用：Word 导入
- PDF 导入会保存原件，编辑页可查看原件或重新解析；重新解析时会检测手动修改过的模块并提示覆盖风险
- 已支持 PDF 导出，导出文件名会尽量根据姓名、学校、求职意向生成

## 主要接口

### 认证接口

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/send-code`

### 简历接口

- `GET /api/resumes`
- `POST /api/resumes`
- `PUT /api/resumes/{id}`
- `DELETE /api/resumes/{id}`
- `GET /api/resumes/{id}/modules`
- `POST /api/resumes/{id}/modules`
- `POST /api/resumes/{id}/modules/{mid}/update`
- `DELETE /api/resumes/{id}/modules/{mid}`

### AI 接口

- `POST /api/resumes/{resumeId}/modules/{moduleId}/ai-optimize`
- `POST /api/resumes/{resumeId}/modules/{moduleId}/ai-optimize-field`
- `POST /api/resumes/{resumeId}/analysis`
- `POST /api/resumes/{resumeId}/smart-onepage/preview`

## 开发建议

- 建议先启动 MySQL 和 Redis，再启动后端，最后启动前端
- 如果前端请求异常，先确认 `VITE_API_PROXY_TARGET` 与后端端口是否一致
- 如果注册拿不到验证码，直接查看后端控制台日志
- 如果 AI 分析失败，优先检查后端 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`
- 如果 PDF 导出异常，确认 `public/fonts/` 下的字体文件存在

## 后续可扩展方向

- 开放 Word 简历导入
- 增加更多模板与排版主题
- 多模板导出
- CI/CD 自动化构建与发布



## 改动

PDF 文件上传                                                                                                                                                                                                                                                                                                       
→ 后端提取文本                                                                                                                                                                                                                                                                                                     
→ Prompt 驱动 AI 结构化解析                                                                                                                                                                                                                                                                                        
→ 返回 ParsedResumeDTO                                                                                                                                                                                                                                                                                             
→ 前端转换为编辑器模块                                                                                                                                                                                                                                                                                             
→ 进入系统继续编辑/预览/导出  

网站名称变更 -> 完成咕咕嘎嘎主题

新增 JD

解析、简历纠错、ATS解析

新增高阶模板（改变排版）

后台完善、前台新增个人中心、完善会员体系、统一Header

模拟面试（针对性面试 + 复盘报告持久化与历史回看）、AI 求职信 / 面试自我介绍、JD 人岗匹配打分

公开分享链接（启用/停用 + 浏览量统计）

简历原件存档与重新解析（原件持久保存、查看原件、重新解析时手动修改冲突警告）

全站 UI 风格统一：设计令牌体系落地（品牌渐变按钮、卡片阴影/描边规范、弹层样式），覆盖全部页面与共享组件

修复未登录访客访问首页/定价页被 401 拦截器强制跳转登录页的问题