@echo off
title ATHPEST AI Call Manager Agent
echo ====================================================
echo Starting ATHPEST Spoken English Call Manager Agent...
echo ====================================================
echo.
start "" http://localhost:3000
node server.js
pause
