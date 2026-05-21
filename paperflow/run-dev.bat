@ECHO OFF
SETLOCAL

REM ---------------------------------------------------------------------------
REM  PaperFlow unified dev runner for Windows (CMD + tmux/psmux)
REM
REM  Usage:  run-dev.bat [--install]
REM
REM  Requires: python (3.9+), node + npm (18+), tmux (psmux)
REM  NOTE: ROOT_DIR path must not contain spaces.
REM ---------------------------------------------------------------------------

SET "ROOT_DIR=%~dp0"
SET "ROOT_DIR=%ROOT_DIR:~0,-1%"
SET "BACKEND_DIR=%ROOT_DIR%\backend"
SET "FRONTEND_DIR=%ROOT_DIR%\frontend"

REM -- Internal sub-commands (invoked from within tmux panes) ------------------
IF /I "%~1"=="--run-backend"  GOTO run_backend
IF /I "%~1"=="--run-frontend" GOTO run_frontend

REM -- Defaults (can be overridden by SET before calling this script) ----------
IF NOT DEFINED BACKEND_HOST  SET "BACKEND_HOST=127.0.0.1"
IF NOT DEFINED BACKEND_PORT  SET "BACKEND_PORT=8000"
IF NOT DEFINED FRONTEND_HOST SET "FRONTEND_HOST=127.0.0.1"
IF NOT DEFINED FRONTEND_PORT SET "FRONTEND_PORT=5173"
SET "INSTALL_DEPS=0"

REM -- Argument parsing --------------------------------------------------------
:parse_args
IF "%~1"=="" GOTO done_args
IF /I "%~1"=="--install" (
    SET "INSTALL_DEPS=1"
    SHIFT
    GOTO parse_args
)
IF /I "%~1"=="-h"     GOTO show_usage
IF /I "%~1"=="--help" GOTO show_usage
ECHO [paperflow] Unknown argument: %~1 1>&2
EXIT /B 2

:done_args

REM -- Ensure backend ----------------------------------------------------------
IF NOT EXIST "%BACKEND_DIR%\.venv\" (
    IF NOT "%INSTALL_DEPS%"=="1" (
        ECHO [paperflow] Backend venv missing. Run 'run-dev.bat --install' first. 1>&2
        EXIT /B 1
    )
    ECHO [paperflow] Creating backend virtualenv
    python -m venv "%BACKEND_DIR%\.venv"
    IF ERRORLEVEL 1 (
        ECHO [paperflow] Failed to create virtualenv. 1>&2
        EXIT /B 1
    )
)

IF "%INSTALL_DEPS%"=="1" (
    ECHO [paperflow] Installing backend dependencies
    "%BACKEND_DIR%\.venv\Scripts\python.exe" -m pip install -e "%BACKEND_DIR%[dev]"
    IF ERRORLEVEL 1 (
        ECHO [paperflow] Failed to install backend dependencies. 1>&2
        EXIT /B 1
    )
)

IF NOT EXIST "%BACKEND_DIR%\.venv\Scripts\uvicorn.exe" (
    ECHO [paperflow] uvicorn not found in venv. Run 'run-dev.bat --install'. 1>&2
    EXIT /B 1
)

REM -- Ensure frontend ---------------------------------------------------------
IF NOT EXIST "%FRONTEND_DIR%\node_modules\" (
    IF NOT "%INSTALL_DEPS%"=="1" (
        ECHO [paperflow] Frontend node_modules missing. Run 'run-dev.bat --install' first. 1>&2
        EXIT /B 1
    )
    ECHO [paperflow] Installing frontend dependencies
    PUSHD "%FRONTEND_DIR%"
    npm install
    IF ERRORLEVEL 1 (
        ECHO [paperflow] Frontend npm install failed. 1>&2
        POPD
        EXIT /B 1
    )
    POPD
) ELSE IF "%INSTALL_DEPS%"=="1" (
    ECHO [paperflow] Refreshing frontend dependencies
    PUSHD "%FRONTEND_DIR%"
    npm install
    POPD
)

REM -- Resolve data directory --------------------------------------------------
IF NOT DEFINED PAPERFLOW_DATA_DIR (
    FOR %%I IN ("%ROOT_DIR%\..") DO SET "PAPERFLOW_DATA_DIR=%%~fI\data"
)

REM -- Write env-forwarder bat for tmux panes ----------------------------------
REM    Bakes current env values into a temp file so panes inherit them cleanly.
SET "ENV_FILE=%ROOT_DIR%\_paperflow_env.bat"
(
    ECHO @ECHO OFF
    ECHO SET "BACKEND_HOST=%BACKEND_HOST%"
    ECHO SET "BACKEND_PORT=%BACKEND_PORT%"
    ECHO SET "FRONTEND_HOST=%FRONTEND_HOST%"
    ECHO SET "FRONTEND_PORT=%FRONTEND_PORT%"
    ECHO SET "PAPERFLOW_DATA_DIR=%PAPERFLOW_DATA_DIR%"
) > "%ENV_FILE%"

REM -- Kill any stale paperflow session ----------------------------------------
tmux kill-session -t paperflow >NUL 2>&1

REM -- Create session, register linked-shutdown hook, start panes --------------
tmux new-session -d -s paperflow
tmux set-hook -g pane-died "kill-session"

tmux send-keys -t paperflow:0.0 "CALL %ENV_FILE% && %ROOT_DIR%\run-dev.bat --run-backend" Enter
tmux split-window -h -t paperflow:0
tmux send-keys -t paperflow:0.1 "CALL %ENV_FILE% && %ROOT_DIR%\run-dev.bat --run-frontend" Enter

ECHO.
ECHO [paperflow] PaperFlow is starting.
ECHO [paperflow]   Backend:  http://%BACKEND_HOST%:%BACKEND_PORT%
ECHO [paperflow]   Frontend: http://%FRONTEND_HOST%:%FRONTEND_PORT%
ECHO.
ECHO [paperflow] Attaching to tmux session  (Ctrl-C inside to stop all).
ECHO.
tmux attach-session -t paperflow

IF EXIST "%ENV_FILE%" DEL "%ENV_FILE%" >NUL 2>&1
GOTO :EOF

REM -- Sub-command: start backend (runs inside tmux pane) ----------------------
:run_backend
IF NOT DEFINED BACKEND_HOST SET "BACKEND_HOST=127.0.0.1"
IF NOT DEFINED BACKEND_PORT SET "BACKEND_PORT=8000"
IF NOT DEFINED PAPERFLOW_DATA_DIR (
    FOR %%I IN ("%ROOT_DIR%\..") DO SET "PAPERFLOW_DATA_DIR=%%~fI\data"
)
CD /D "%BACKEND_DIR%"
CALL .venv\Scripts\activate.bat
uvicorn app.main:app --host %BACKEND_HOST% --port %BACKEND_PORT% --reload
GOTO :EOF

REM -- Sub-command: start frontend (runs inside tmux pane) ---------------------
:run_frontend
IF NOT DEFINED FRONTEND_HOST SET "FRONTEND_HOST=127.0.0.1"
IF NOT DEFINED FRONTEND_PORT SET "FRONTEND_PORT=5173"
IF NOT DEFINED BACKEND_HOST  SET "BACKEND_HOST=127.0.0.1"
IF NOT DEFINED BACKEND_PORT  SET "BACKEND_PORT=8000"
SET "VITE_PAPERFLOW_API_BASE_URL=http://%BACKEND_HOST%:%BACKEND_PORT%"
CD /D "%FRONTEND_DIR%"
npm run dev -- --host %FRONTEND_HOST% --port %FRONTEND_PORT%
GOTO :EOF

REM -- Usage -------------------------------------------------------------------
:show_usage
ECHO PaperFlow unified dev runner for Windows (CMD + tmux)
ECHO.
ECHO Usage:
ECHO   run-dev.bat [--install]
ECHO.
ECHO Environment (set before running):
ECHO   BACKEND_HOST       default: 127.0.0.1
ECHO   BACKEND_PORT       default: 8000
ECHO   FRONTEND_HOST      default: 127.0.0.1
ECHO   FRONTEND_PORT      default: 5173
ECHO   PAPERFLOW_DATA_DIR optional override; default is ..\data
ECHO.
ECHO Examples:
ECHO   run-dev.bat
ECHO   run-dev.bat --install
ECHO   set BACKEND_PORT=8010 ^&^& set FRONTEND_PORT=5174 ^&^& run-dev.bat
GOTO :EOF
