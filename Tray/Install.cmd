@echo off
setlocal EnableExtensions
set "VERSION=0.9.0"
set "SOURCE=%~dp0Payload"
set "INSTALLDIR=%LOCALAPPDATA%\XymonTray"
set "MANIFEST=%INSTALLDIR%\com.xymon.tray.json"

if not exist "%SOURCE%\XymonHost.cmd" (
  echo ERROR: Tray payload files are missing.
  exit /b 1
)

if not exist "%INSTALLDIR%" mkdir "%INSTALLDIR%"
xcopy "%SOURCE%\*" "%INSTALLDIR%\" /E /I /Y >nul
if errorlevel 1 (
  echo ERROR: Could not copy XymonTray files.
  exit /b 1
)

set "HOSTCMD=%INSTALLDIR%\XymonHost.cmd"
set "JSONHOST=%HOSTCMD:\=\\%"
>"%MANIFEST%" echo {
>>"%MANIFEST%" echo   "name": "com.xymon.tray",
>>"%MANIFEST%" echo   "description": "XymonTray 0.9 Native Messaging host",
>>"%MANIFEST%" echo   "path": "%JSONHOST%",
>>"%MANIFEST%" echo   "type": "stdio",
>>"%MANIFEST%" echo   "allowed_origins": [
set /p "EXTENSIONID=Enter the Edge extension ID from edge://extensions: "
if "%EXTENSIONID%"=="" (
  echo ERROR: Extension ID is required.
  exit /b 1
)
>>"%MANIFEST%" echo     "chrome-extension://%EXTENSIONID%/"
>>"%MANIFEST%" echo   ]
>>"%MANIFEST%" echo }

reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.xymon.tray" /ve /t REG_SZ /d "%MANIFEST%" /f >nul
reg add "HKCU\Software\XymonTray" /v InstallPath /t REG_SZ /d "%INSTALLDIR%" /f >nul
reg add "HKCU\Software\XymonTray" /v Version /t REG_SZ /d "%VERSION%" /f >nul

echo.
echo XymonTray %VERSION% tray integration installed for the current user.
echo Reload the extension, enable XymonTray integration, and save its settings.
echo.
endlocal
