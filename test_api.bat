@echo off
echo ========================================
echo  Probando API del Backend
echo ========================================
echo.
echo 1. Verificando si el backend esta corriendo...
curl -s http://localhost:5000/api/zonas >nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] Backend respondiendo
) else (
    echo    [ERROR] Backend no responde
    pause
    exit /b 1
)
echo.
echo 2. Probando API de zonas...
curl -s http://localhost:5000/api/zonas
echo.
echo.
echo 3. Probando API de mesas...
curl -s http://localhost:5000/api/mesas
echo.
echo.
echo ========================================
echo  Pruebas completadas
echo ========================================
pause
