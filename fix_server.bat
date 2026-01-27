@echo off
echo ============================================
echo   CORRIGINDO SERVIDOR - MATANDO PROCESSOS
echo ============================================
echo.
echo Parando todos os processos Node.js...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Processos Node encerrados com sucesso!
) else (
    echo [AVISO] Nenhum processo Node encontrado ou ja estava parado.
)

echo.
echo Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   INICIANDO SERVIDOR LIMPO
echo ============================================
echo.
npm start
