@echo off
echo Iniciando servidor backend...
echo Usando Python correcto para evitar errores de conexion
cd /d "%~dp0"
C:/Users/Usuario/AppData/Local/Programs/Python/Python311/python.exe app.py
pause