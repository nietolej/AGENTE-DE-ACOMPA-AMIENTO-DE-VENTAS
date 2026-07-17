@echo off
title Apagando el Servidor del Dashboard
echo ====================================================
echo    Apagando el Servidor de Ventas (Next.js)
echo ====================================================
echo.
echo Esto cerrara los procesos ocultos de Node.js que mantienen vivo el dashboard.
echo.
taskkill /F /IM node.exe
echo.
echo Servidor apagado correctamente.
pause
