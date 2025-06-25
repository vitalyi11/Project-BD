@echo off

start cmd /k "cd /d %~dp0backend && python app.py"

timeout /t 2 /nobreak >nul

start cmd /k "npm run dev"
