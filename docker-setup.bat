@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

REM ============ 1. 生成 .env ============
if not exist ".env" (
    echo 首次运行，自动生成 .env ...
    copy .env.example .env >nul

    for /f "tokens=*" %%i in ('powershell -NoProfile -Command "[Convert]::ToBase64String([byte[]](1..32 | ForEach-Object {Get-Random -Maximum 256}))"') do set "JWT_RANDOM=%%i"

    powershell -NoProfile -Command "(Get-Content .env) -replace '^JWT_SECRET=.*', 'JWT_SECRET=!JWT_RANDOM!' | Set-Content .env -Encoding UTF8"

    echo .env 已生成，JWT_SECRET 已自动填充。
    echo 如需配置 AI、邮件等可选功能，请编辑 .env 后重新运行本脚本。
    echo.
)

REM ============ 2. 从 .env 读取配置 ============
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        if "%%a"=="MYSQL_HOST" set "MYSQL_HOST=%%b"
        if "%%a"=="MYSQL_PORT" set "MYSQL_PORT=%%b"
        if "%%a"=="REDIS_HOST" set "REDIS_HOST=%%b"
        if "%%a"=="REDIS_PORT" set "REDIS_PORT=%%b"
    )
)

if not defined MYSQL_HOST set "MYSQL_HOST=localhost"
if not defined MYSQL_PORT set "MYSQL_PORT=3306"
if not defined REDIS_HOST set "REDIS_HOST=localhost"
if not defined REDIS_PORT set "REDIS_PORT=6379"

REM ============ 3. 检测数据库 ============
echo 检测数据库状态...

set "mysql_ok=false"
set "redis_ok=false"

powershell -NoProfile -Command "try { $tcp = New-Object System.Net.Sockets.TcpClient; $tcp.Connect('%MYSQL_HOST%', %MYSQL_PORT%); $tcp.Close(); exit 0 } catch { exit 1 }"
if !errorlevel! equ 0 set "mysql_ok=true"

powershell -NoProfile -Command "try { $tcp = New-Object System.Net.Sockets.TcpClient; $tcp.Connect('%REDIS_HOST%', %REDIS_PORT%); $tcp.Close(); exit 0 } catch { exit 1 }"
if !errorlevel! equ 0 set "redis_ok=true"

if "!mysql_ok!"=="true" if "!redis_ok!"=="true" (
    echo 检测到 MySQL (%MYSQL_HOST%:%MYSQL_PORT%) 和 Redis (%REDIS_HOST%:%REDIS_PORT%) 已在运行。
    echo 跳过数据库启动，仅启动后端和前端...
    docker compose up -d backend frontend
    goto :done
)

if "!mysql_ok!"=="false" echo 未检测到 MySQL (%MYSQL_HOST%:%MYSQL_PORT%)，将自动启动。
if "!redis_ok!"=="false" echo 未检测到 Redis (%REDIS_HOST%:%REDIS_PORT%)，将自动启动。

echo 启动所有服务（首次会自动构建镜像，请耐心等待）...
docker compose up -d

:done
echo.
echo =========================================
echo   PaiResume 部署完成！
echo =========================================
echo.
echo   前端:     http://localhost
echo   后端 API: http://localhost/api/
echo   API 文档: http://localhost/api/doc.html
echo.
echo 常用命令:
echo   查看日志:  docker compose logs -f
echo   停止服务:  docker compose down
echo   重建镜像:  docker compose build ^&^& docker compose up -d
echo.

pause
