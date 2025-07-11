@echo off
setlocal enabledelayedexpansion

echo.
echo ===================================================
echo    ClinicWave Setup - Windows Installation Helper
echo ===================================================
echo.

:: Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

:: Check Python version
for /f "tokens=2" %%I in ('python --version 2^>^&1') do set "PYTHON_VERSION=%%I"
echo [INFO] Found Python %PYTHON_VERSION%

:: Create a directory for logs if it doesn't exist
if not exist "logs" mkdir logs

echo.
echo Please select installation method:
echo.
echo 1. Docker installation (recommended)
echo 2. Local installation (no Docker)
echo.

set /p INSTALL_CHOICE="Enter your choice (1 or 2): "

set SETUP_ARGS=

if "%INSTALL_CHOICE%"=="2" (
    set SETUP_ARGS=--no-docker
    
    echo.
    echo [INFO] Selected local installation without Docker.
    echo.
    echo Checking prerequisites for local installation...
    
    :: Check for PostgreSQL
    where psql >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] PostgreSQL is not installed or not in PATH.
        echo You may need to install PostgreSQL manually before continuing.
        echo.
        set /p CONTINUE="Do you want to continue anyway? (y/n): "
        if /i not "!CONTINUE!"=="y" (
            echo Setup aborted.
            exit /b 1
        )
    ) else (
        echo [OK] PostgreSQL found.
    )
    
    :: Check for Redis
    where redis-cli >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Redis is not installed or not in PATH.
        echo You may need to install Redis manually before continuing.
        echo.
        set /p CONTINUE="Do you want to continue anyway? (y/n): "
        if /i not "!CONTINUE!"=="y" (
            echo Setup aborted.
            exit /b 1
        )
    ) else (
        echo [OK] Redis found.
    )
) else (
    :: Default to Docker installation
    echo.
    echo [INFO] Selected Docker installation.
    echo.
    
    :: Check for Docker
    where docker >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Docker is not installed or not in PATH.
        echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    ) else (
        echo [OK] Docker found.
    )
    
    :: Check Docker is running
    docker info >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Docker is not running. Please start Docker Desktop.
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    ) else (
        echo [OK] Docker is running.
    )
)

echo.
echo Additional options:
echo.
set /p SKIP_CLONE="Skip repository cloning? (y/n, default: n): "
if /i "%SKIP_CLONE%"=="y" set "SETUP_ARGS=!SETUP_ARGS! --skip-clone"

set /p SKIP_PREREQS="Skip prerequisites installation? (y/n, default: n): "
if /i "%SKIP_PREREQS%"=="y" set "SETUP_ARGS=!SETUP_ARGS! --skip-prereqs"

echo.
echo [INFO] Running setup script with arguments: !SETUP_ARGS!
echo [INFO] Setup log will be saved to logs\setup_log.txt
echo.

:: Create timestamp for log file
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "DATETIME=%%I"
set "LOG_FILE=logs\setup_%DATETIME:~0,8%_%DATETIME:~8,6%.txt"

:: Run the setup script
echo Starting setup at %TIME% on %DATE% > "%LOG_FILE%"
echo Running: python setup.py !SETUP_ARGS! >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo [INFO] Starting setup process...
python setup.py !SETUP_ARGS! 2>&1 | tee -a "%LOG_FILE%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Setup failed with error code %ERRORLEVEL%.
    echo Please check the log file: %LOG_FILE%
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo    ClinicWave Setup Completed Successfully!
echo ===================================================
echo.
echo You can access the application at:
echo.
echo Web Application: http://localhost:3000
echo API Server: http://localhost:4000
echo.
echo Default login credentials:
echo Email: admin@clinicwave.com
echo Password: admin123
echo.
echo Log file saved to: %LOG_FILE%
echo.
echo Press any key to exit...
pause >nul
exit /b 0
