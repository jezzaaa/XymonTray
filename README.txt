XymonTray 0.9
=============

XymonTray consists of an Edge extension and an optional Windows notification-area companion.

INSTALL THE EXTENSION
---------------------
1. Extract this complete package to a stable directory.
2. Open edge://extensions in Microsoft Edge.
3. Enable Developer mode.
4. Select Load unpacked.
5. Select the Extension directory from this package.
6. Pin XymonTray if you want its browser icon to remain visible.
7. Open XymonTray's extension options and configure the Xymon page URL.

OPTIONAL WINDOWS TRAY INTEGRATION
---------------------------------
1. Copy the extension ID shown on edge://extensions.
2. Run Tray\Install.cmd.
3. Paste the extension ID when requested.
4. Reload XymonTray on edge://extensions.
5. Open its options, select Enable XymonTray integration, and save.

The tray files are installed per-user under:
  %LOCALAPPDATA%\XymonTray

No administrator access is required. The installer registers the Native Messaging host under HKCU.

UNINSTALL
---------
1. If tray integration was installed, run Tray\Uninstall.cmd.
2. Remove XymonTray from edge://extensions.
3. Delete the extracted package directory if no longer required.

Tray uninstallation removes the Native Messaging registry registration and all runtime residue under %LOCALAPPDATA%\XymonTray. The browser extension is removed separately because Edge does not uninstall external Native Messaging hosts when an extension is removed.

NOTES
-----
- Windows may label the notification-area process as Windows PowerShell.
- XymonTray does not generate toast, balloon, or sound notifications.
- The browser extension works without the optional tray integration.
- Version 0.9 is a pre-1.0 release and still has planned usability refinements.
