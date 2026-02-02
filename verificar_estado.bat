@echo off
echo ========================================
echo  Verificación del Estado del Proyecto
echo ========================================
echo.

echo 1. Verificando archivos principales...
if exist "frontend\index.html" (
    echo    [OK] frontend\index.html
) else (
    echo    [ERROR] frontend\index.html NO ENCONTRADO
)
if exist "frontend\js\app-clean.js" (
    echo    [OK] frontend\js\app-clean.js
) else (
    echo    [ERROR] frontend\js\app-clean.js NO ENCONTRADO
)
if exist "backend\app.py" (
    echo    [OK] backend\app.py
) else (
    echo    [ERROR] backend\app.py NO ENCONTRADO
)
if exist "backend\models.py" (
    echo    [OK] backend\models.py
) else (
    echo    [ERROR] backend\models.py NO ENCONTRADO
)

echo.
echo 2. Verificando estructura de carpetas...
if exist "frontend\css" (
    echo    [OK] frontend\css\ existe
) else (
    echo    [ERROR] frontend\css\ NO EXISTE
)
if exist "frontend\js" (
    echo    [OK] frontend\js\ existe
) else (
    echo    [ERROR] frontend\js\ NO EXISTE
)
if exist "database" (
    echo    [OK] database\ existe
) else (
    echo    [ERROR] database\ NO EXISTE
)
if exist "docs" (
    echo    [OK] docs\ existe
) else (
    echo    [ERROR] docs\ NO EXISTE
)

echo.
echo 3. Verificando scripts de inicio...
if exist "start_backend.bat" (
    echo    [OK] start_backend.bat
) else (
    echo    [ERROR] start_backend.bat NO ENCONTRADO
)
if exist "start_system.bat" (
    echo    [OK] start_system.bat
) else (
    echo    [ERROR] start_system.bat NO ENCONTRADO
)
if exist "test_api.bat" (
    echo    [OK] test_api.bat
) else (
    echo    [ERROR] test_api.bat NO ENCONTRADO
)

echo.
echo 4. Verificando archivos duplicados...
if exist "js\" (
    echo    [ADVERTENCIA] La carpeta js\ aun existe (debería eliminarse)
) else (
    echo    [OK] No hay carpeta js\ duplicada
)

if exist "frontend\index-bootstrap.html" (
    echo    [ADVERTENCIA] Archivos de prueba aun presentes
) else (
    echo    [OK] No hay archivos de prueba
)

echo.
echo 5. Verificando documentación...
if exist "README.md" (
    echo    [OK] README.md
) else (
    echo    [ERROR] README.md NO ENCONTRADO
)
if exist "REPORTE_FINAL.md" (
    echo    [OK] REPORTE_FINAL.md
) else (
    echo    [INFO] REPORTE_FINAL.md no encontrado
)
if exist "LIMPIEZA_COMPLETADA.md" (
    echo    [OK] LIMPIEZA_COMPLETADA.md
) else (
    echo    [INFO] LIMPIEZA_COMPLETADA.md no encontrado
)

echo.
echo ========================================
echo  Verificación completada
echo ========================================
echo.
echo Para iniciar el sistema:
echo   start_system.bat
echo.
pause
