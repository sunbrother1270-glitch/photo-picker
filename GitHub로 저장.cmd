@echo off
setlocal
chcp 65001 >nul
node "%~dp0tools\github-save.js"
endlocal
