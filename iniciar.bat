@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo  Historia Clinica Psicologica - Iniciando aplicacion
echo ============================================================
echo.

if not exist "backend\.venv" (
    echo [ERROR] No se encontro backend\.venv
    echo Primero debes ejecutar "instalar.bat" una vez.
    echo.
    pause
    exit /b 1
)

echo Verificando Python...
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Python en este computador.
    echo Revisa MANUAL-INSTALACION-LOCAL.md.
    pause
    exit /b 1
)

echo Verificando Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Node.js en este computador.
    echo Revisa MANUAL-INSTALACION-LOCAL.md.
    pause
    exit /b 1
)

echo Verificando conexion a MySQL en localhost:3306...
powershell -NoProfile -Command "if (-not (Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue).TcpTestSucceeded) { exit 1 }"
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo conectar a MySQL en localhost:3306.
    echo Verifica que el servicio de MySQL este iniciado:
    echo   1. Presiona la tecla Windows y escribe "Servicios"
    echo   2. Busca un servicio que empiece por "MySQL" ^(ej. MySQL80^)
    echo   3. Click derecho -^> Iniciar
    echo Luego vuelve a ejecutar este script.
    echo.
    pause
    exit /b 1
)
echo Conexion a MySQL correcta.
echo.

echo Abriendo el backend en una nueva ventana...
start "Backend - Historia Clinica" cmd /k call "%~dp0backend\run-local.bat"

echo Abriendo el frontend en una nueva ventana...
start "Frontend - Historia Clinica" cmd /k call "%~dp0frontend\run-local.bat"

echo.
echo Esperando a que los servicios terminen de arrancar...
timeout /t 8 /nobreak >nul

echo Abriendo la aplicacion en el navegador...
start http://localhost:5173

echo.
echo ============================================================
echo  La aplicacion esta corriendo.
echo ============================================================
echo.
echo Se abrieron dos ventanas nuevas: "Backend - Historia Clinica"
echo y "Frontend - Historia Clinica". Dejalas abiertas mientras
echo uses la aplicacion.
echo.
echo Para DETENER la aplicacion, simplemente cierra esas dos
echo ventanas ^(o presiona Ctrl+C dentro de cada una^).
echo.
echo Esta ventana ya puede cerrarse.
echo.
pause
