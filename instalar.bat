@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo  Historia Clinica Psicologica - Instalacion local
echo ============================================================
echo.
echo Este script prepara la aplicacion para poder usarla en este
echo computador. Solo hace falta ejecutarlo UNA VEZ (o cuando el
echo manual te lo indique despues de una actualizacion).
echo.
echo Antes de continuar, asegurate de haber completado los pasos
echo 1, 2 y 3 de MANUAL-INSTALACION-LOCAL.md (instalar Python,
echo Node.js y MySQL, y crear la base de datos).
echo.
pause

echo.
echo ------------------------------------------------------------
echo [1/6] Verificando Python...
echo ------------------------------------------------------------
where python >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] No se encontro Python en este computador.
    echo Instala Python siguiendo el paso 1 de MANUAL-INSTALACION-LOCAL.md
    echo y vuelve a ejecutar este script.
    echo.
    pause
    exit /b 1
)
python --version

echo.
echo ------------------------------------------------------------
echo [2/6] Verificando Node.js...
echo ------------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] No se encontro Node.js en este computador.
    echo Instala Node.js siguiendo el paso 2 de MANUAL-INSTALACION-LOCAL.md
    echo y vuelve a ejecutar este script.
    echo.
    pause
    exit /b 1
)
node --version

echo.
echo ------------------------------------------------------------
echo [3/6] Verificando conexion a MySQL en localhost:3306...
echo ------------------------------------------------------------
powershell -NoProfile -Command "if (-not (Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue).TcpTestSucceeded) { exit 1 }"
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo conectar a MySQL en localhost:3306.
    echo Verifica que MySQL este instalado y su servicio iniciado
    echo ^(paso 3 de MANUAL-INSTALACION-LOCAL.md^) y que ya hayas
    echo creado la base de datos y el usuario ^(paso 4^).
    echo.
    pause
    exit /b 1
)
echo Conexion a MySQL correcta.

echo.
echo ------------------------------------------------------------
echo [4/6] Preparando el backend (Python)...
echo ------------------------------------------------------------
cd backend

if not exist ".env" (
    echo Creando backend\.env a partir de backend\.env.example ...
    copy /y ".env.example" ".env" >nul
)

if not exist ".venv" (
    echo Creando entorno virtual de Python ^(.venv^) ...
    python -m venv .venv
)

echo Instalando dependencias del backend ^(puede tardar unos minutos^) ...
call .venv\Scripts\activate.bat
pip install --quiet --upgrade pip
pip install --quiet -e .[dev]
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la instalacion de dependencias del backend.
    echo.
    pause
    exit /b 1
)

echo.
echo ------------------------------------------------------------
echo [5/6] Aplicando migraciones y datos iniciales...
echo ------------------------------------------------------------
alembic upgrade head
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la aplicacion de migraciones. Revisa que la
    echo base de datos "hist_clinica_psic" y el usuario "hist_user"
    echo existan en MySQL tal como indica el paso 4 del manual.
    echo.
    pause
    exit /b 1
)
python -m app.db.seed

call .venv\Scripts\deactivate.bat
cd ..

echo.
echo ------------------------------------------------------------
echo [6/6] Preparando el frontend (Node.js)...
echo ------------------------------------------------------------
cd frontend
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la instalacion de dependencias del frontend.
    echo.
    pause
    exit /b 1
)
cd ..

echo.
echo ============================================================
echo  Instalacion completa.
echo ============================================================
echo.
echo Ahora puedes ejecutar "iniciar.bat" cada vez que quieras usar
echo la aplicacion.
echo.
echo Usuario administrador de prueba:
echo   Email:    admin@example.com
echo   Password: Admin12345!
echo.
pause
