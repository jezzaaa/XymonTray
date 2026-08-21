# XymonTray Implementation Notes

## Overview

XymonTray consists of two independent components:

1. Microsoft Edge extension
2. Optional Windows tray integration

The extension operates independently and does not require the tray component.

The tray component is enabled only when "Enable XymonTray integration" is selected in the extension configuration.

---

## Architecture

```text
Xymon
  |
  v
Edge Extension
  |
  +---- Browser toolbar status indicator
  |
  +---- Native Messaging (optional)
              |
              v
      PowerShell Native Host
              |
              v
        Windows Tray Icon
```

---

## Browser Extension

The extension periodically polls a configured Xymon URL.

The current state is determined by comparing the page favicon against
the standard Xymon favicon set:

- green
- yellow
- red
- purple
- blue
- clear
- unknown

The favicon contents are fingerprinted and compared rather than relying
on filenames.

---

## Runtime State

The extension stores:

- current state
- favicon fingerprint
- last update time
- detected favicon URL
- cached reference fingerprints

in local extension storage.

---

## Native Messaging

The extension communicates with the optional tray application using
Microsoft Edge Native Messaging.

Host name:

```text
com.xymon.tray
```

The extension publishes:

- state
- display name
- stale timeout
- Xymon URL
- icon data

to the native host.

---

## Tray Application

The tray application is implemented in PowerShell and WinForms.

Responsibilities:

- display tray icon
- show current state
- display last update age
- open configured Xymon page
- detect stale status

The tray reads updates from:

```text
%LOCALAPPDATA%\XymonTray\status.json
```

---

## Installation

The tray integration is installed by:

```text
Tray\Install.cmd
```

Files are deployed under:

```text
%LOCALAPPDATA%\XymonTray
```

The Native Messaging host is registered in:

```text
HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.xymon.tray
```

No administrator privileges are required.

---

## Uninstallation

The tray component is removed by:

```text
Tray\Uninstall.cmd
```

This removes:

- Native Messaging registration
- runtime files
- tray state files

The Edge extension must be removed separately.

---

## Design Decisions

### Optional tray integration

The browser extension remains fully functional without the tray.

Native Messaging is only enabled when explicitly configured.

### PowerShell implementation

PowerShell was chosen because:

- no compilation required
- simple deployment
- suitable for enterprise environments
- easy Native Messaging integration

### Favicon matching

State is determined from actual favicon content rather than URLs or
filenames to support customised Xymon themes.

---

## Future Enhancements

Planned improvements include:

- Multi-URL support with sticky failover
- Installer usability improvements
