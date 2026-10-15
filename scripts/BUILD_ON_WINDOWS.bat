@echo off
setlocal
cd /d "%~dp0.."
echo ==== GXA Cricket Challenge: install dependencies ====
call npm install
if errorlevel 1 goto error
echo ==== Building production static files ====
call npm run build
if errorlevel 1 goto error
echo ==== Packaging deploy folder ====
if exist "GXA_Cricket_Hostinger_Deploy.zip" del /q "GXA_Cricket_Hostinger_Deploy.zip"
powershell -NoProfile -Command "Compress-Archive -Path 'dist\*' -DestinationPath 'GXA_Cricket_Hostinger_Deploy.zip' -Force"
if errorlevel 1 goto error
echo SUCCESS: GXA_Cricket_Hostinger_Deploy.zip created
pause
exit /b 0
:error
echo Build failed. Please copy the command error output for diagnosis.
pause
exit /b 1
