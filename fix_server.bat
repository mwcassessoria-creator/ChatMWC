@echo off
echo ===========================================
echo PARANDO TODOS OS PROCESSOS NODE...
echo ===========================================
taskkill /F /IM node.exe

echo.
echo ===========================================
echo INICIANDO O SERVIDOR...
echo ===========================================
npm start
pause
