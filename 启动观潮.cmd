@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 24 或更高版本。
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 (
  echo 当前 Node.js 版本过低，请升级到 24 或更高版本。
  pause
  exit /b 1
)
if not exist node_modules\tsx (
  call npm ci
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)
call npm run build
if errorlevel 1 (
  echo 构建失败，请保留错误信息用于排查。
  pause
  exit /b 1
)
echo.
echo 观潮即将启动，请在浏览器打开终端显示的本地地址。
echo 默认地址：http://127.0.0.1:3180
echo 按 Ctrl+C 停止服务，已保存的数据会保留。
echo.
call npm start
pause
