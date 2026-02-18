@echo off
echo.
echo ========================================
echo  REINICIANDO SERVIDOR NEXT.JS
echo ========================================
echo.
echo Este script vai:
echo 1. Procurar processos Node.js rodando na porta 3000
echo 2. Finalizar esses processos
echo 3. Reiniciar o servidor Next.js
echo.
pause

echo.
echo [1/3] Procurando processos Node.js na porta 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Finalizando processo PID: %%a
    taskkill /F /PID %%a
)

echo.
echo [2/3] Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Iniciando servidor Next.js...
echo.
npm run dev
