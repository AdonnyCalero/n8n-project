@echo off
echo ========================================
echo  Iniciando Sistema de Restaurante
echo ========================================
echo.
echo 1. Iniciando servidor backend...
cd /d "%~dp0backend"
start /B C:/Users/Usuario/AppData/Local/Programs/Python/Python311/python.exe app.py

echo 2. Esperando a que el servidor backend inicie...
timeout /t 3 /nobreak >nul

echo 3. Verificando conexion con el backend...
curl -X GET http://localhost:5000/api/zonas >nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] Backend respondiendo correctamente
) else (
    echo    [ERROR] Backend no responde
    pause
    exit /b 1
)

echo.
echo 4. Abriendo interfaz web...
start http://localhost:5000

echo.
echo ========================================
echo  Sistema iniciado correctamente
echo  Backend: http://localhost:5000
echo  Frontend: http://localhost:5000
echo ========================================
echo.
echo Presione Ctrl+C para detener el servidor
echo.

:: Mantener el script corriendo
:loop
timeout /t 60 /nobreak >nul
goto loop