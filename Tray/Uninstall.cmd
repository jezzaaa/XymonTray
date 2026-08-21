@echo off
setlocal EnableExtensions
set "INSTALLDIR=%LOCALAPPDATA%\XymonTray"

if exist "%INSTALLDIR%" (
  >"%INSTALLDIR%\stop.flag" echo stop
  timeout /t 3 /nobreak >nul
)

reg delete "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.xymon.tray" /f >nul 2>&1
reg delete "HKCU\Software\XymonTray" /f >nul 2>&1

if exist "%INSTALLDIR%" rmdir /s /q "%INSTALLDIR%"

echo.
echo XymonTray tray integration has been removed for the current user.
echo The Edge extension must be removed separately from edge://extensions.
echo.
endlocal
