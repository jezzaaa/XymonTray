XymonTray 0.9
=============

XymonTray provides visual indication of the current status of a Xymon
monitoring page.

Features:

- Browser toolbar status indication
- Dynamic favicon-based state detection
- Optional Windows tray integration
- Native Messaging integration between Edge and PowerShell
- Stale-state detection
- Direct access to the monitored Xymon page

The browser extension works independently and does not require the
optional tray integration.

The extension has been tested on Edge; should also work on Chrome.


INSTALL THE EXTENSION
---------------------

1. Extract this package to a suitable directory.

2. Open:

       edge://extensions

3. Enable Developer Mode.

4. Select:

       Load unpacked

5. Select the:

       Extension

   directory from this package.

6. Open XymonTray settings.

7. Configure:

       Display name
       Xymon page URL
       Poll interval
       Stale timeout

8. Save.


OPTIONAL WINDOWS TRAY INTEGRATION
---------------------------------

The tray integration provides a persistent Windows notification-area
icon which mirrors the detected Xymon state.

To install:

1. Open:

       edge://extensions

2. Note the XymonTray extension ID.

3. Run:

       Tray\Install.cmd

4. Enter the extension ID when prompted.

5. Reload the extension.

6. Open XymonTray settings.

7. Enable:

       Enable XymonTray integration

8. Save.

The tray files are installed to:

       %LOCALAPPDATA%\XymonTray

No administrator privileges are required.


KEEPING THE TRAY ICON VISIBLE
-----------------------------

Windows may initially place the XymonTray icon in the hidden
notification-area overflow menu.

Windows 11:

1. Open Settings.
2. Select Personalisation.
3. Select Taskbar.
4. Expand:

       Other system tray icons

5. Enable:

       Windows PowerShell

The tray application currently appears as:

       Windows PowerShell

because it is implemented using PowerShell and WinForms.

Once enabled, the XymonTray icon remains permanently visible in the
notification area.


RUNTIME FILES
-------------

XymonTray stores runtime information in:

       %LOCALAPPDATA%\XymonTray

Important files:

       host.log
           Native Messaging activity log.

       status.json
           Current status received from the extension.

       current.ico
           Current tray icon image.

       tray.lock
           Ensures only one tray instance runs.


UNINSTALLATION
--------------

To remove the tray integration:

1. Run:

       Tray\Uninstall.cmd

2. Remove the extension from:

       edge://extensions

The tray uninstaller removes:

       Native Messaging registration
       Runtime files
       Registry entries


ADDITIONAL DOCUMENTATION
------------------------

For implementation and design details, refer to:

       IMPLEMENTATION.md

This document describes:

       Architecture
       Native Messaging integration
       Registry registration
       Runtime files
       Deployment model
       Design decisions
       Future enhancements


NOTES
-----

- The browser extension functions normally without tray integration.

- Tray integration is disabled by default.

- Version 0.9 is a pre-release version and additional usability
  enhancements are planned before version 1.0.

- Windows may continue to display the tray application as
  "Windows PowerShell" until a future version replaces the
  PowerShell host with a packaged executable.

SEE ALSO
--------

For implementation and design details, refer to:

    IMPLEMENTATION.md

This document describes the internal architecture, Native Messaging integration,
tray operation and deployment model.

LICENCE
-------

XymonTray is released under the MIT License.

See the LICENCE file for details.
