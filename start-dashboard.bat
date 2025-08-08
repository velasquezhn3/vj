@echo off
title Dashboard Simple - Bot VJ
echo.
echo ========================================
echo  🎯 INICIANDO DASHBOARD SIMPLE - BOT VJ
echo ========================================
echo.

:START
echo [%TIME%] Iniciando Dashboard Simple...
node dashboard-simple.js

echo.
echo [%TIME%] Dashboard Simple se detuvo. Reiniciando en 5 segundos...
timeout /t 5 /nobreak > nul
goto START
