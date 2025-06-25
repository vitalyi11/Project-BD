@echo off

REM Przejście do folderu backend i uruchomienie app.py
start cmd /k "cd /d %~dp0backend && python app.py"

REM Czekanie 2 sekundy
timeout /t 2 /nobreak >nul

REM Przejście do folderu frontend i uruchomienie npm run dev
start cmd /k "npm run dev"
