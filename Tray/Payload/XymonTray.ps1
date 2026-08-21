Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataDirectory = Join-Path $env:LOCALAPPDATA 'XymonTray'
$StatusFile = Join-Path $DataDirectory 'status.json'
$LockFile = Join-Path $DataDirectory 'tray.lock'
$StopFile = Join-Path $DataDirectory 'stop.flag'
$UnknownIcon = Join-Path $ScriptRoot 'Icons\favicon-unknown.ico'
$GreenIcon = Join-Path $ScriptRoot 'Icons\favicon-green.ico'
New-Item -ItemType Directory -Path $DataDirectory -Force | Out-Null
Remove-Item -LiteralPath $StopFile -Force -ErrorAction SilentlyContinue
try { $LockStream = [IO.File]::Open($LockFile, 'OpenOrCreate', 'ReadWrite', 'None') } catch { exit 0 }
$script:CurrentUrl = ''
$script:LastReceivedUtc = $null
$script:StaleAfter = 300
$script:LastStatusWriteUtc = [DateTime]::MinValue
$script:CurrentIcon = $null

function Set-NotifyIconImage {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  try {
    $NewIcon = New-Object System.Drawing.Icon($Path)
    $OldIcon = $script:CurrentIcon
    $script:CurrentIcon = $NewIcon
    $NotifyIcon.Icon = $NewIcon
    if ($null -ne $OldIcon) { $OldIcon.Dispose() }
  } catch { }
}

$NotifyIcon = New-Object System.Windows.Forms.NotifyIcon
$NotifyIcon.Text = 'Xymon: Unknown'
$NotifyIcon.Visible = $true
Set-NotifyIconImage -Path $UnknownIcon
$Menu = New-Object System.Windows.Forms.ContextMenuStrip
$TitleItem = $Menu.Items.Add('Xymon')
$TitleItem.Enabled = $false
$StateItem = $Menu.Items.Add('State: Unknown')
$StateItem.Enabled = $false
$AgeItem = $Menu.Items.Add('Last update: Never')
$AgeItem.Enabled = $false
$Menu.Items.Add('-') | Out-Null
$OpenItem = $Menu.Items.Add('Open Webpage')
$ExitItem = $Menu.Items.Add('Exit')
$NotifyIcon.ContextMenuStrip = $Menu
$OpenItem.Enabled = $false
$OpenItem.Add_Click({ if ($script:CurrentUrl) { Start-Process $script:CurrentUrl } })

function Format-Age {
  param([TimeSpan]$Age)
  $Seconds = [int]$Age.TotalSeconds
  if ($Seconds -lt 120) { return "$Seconds seconds ago" }
  $Minutes = [int]($Seconds / 60)
  if ($Minutes -lt 120) { return "$Minutes minutes ago" }
  $Hours = [int]($Minutes / 60)
  return "$Hours hours ago"
}

function Apply-Status {
  param([pscustomobject]$Status)
  $State = if ($Status.state) { [string]$Status.state } else { 'unknown' }
  $DisplayName = if ($Status.displayName) { [string]$Status.displayName } else { 'Xymon' }
  $script:CurrentUrl = if ($Status.url) { [string]$Status.url } else { '' }
  $script:StaleAfter = if ($Status.staleAfter) { [int]$Status.staleAfter } else { 300 }
  $script:LastReceivedUtc = if ($Status.receivedUtc) { [DateTime]::Parse([string]$Status.receivedUtc).ToUniversalTime() } else { [DateTime]::UtcNow }
  $TitleItem.Text = $DisplayName
  $StateItem.Text = "State: $($State.Substring(0,1).ToUpper() + $State.Substring(1))"
  $OpenItem.Enabled = [bool]$script:CurrentUrl
  if ($Status.iconPath -and (Test-Path -LiteralPath $Status.iconPath)) { Set-NotifyIconImage -Path ([string]$Status.iconPath) }
  elseif ($State -eq 'green') { Set-NotifyIconImage -Path $GreenIcon }
  else { Set-NotifyIconImage -Path $UnknownIcon }
  $Tooltip = "$DisplayName`: $State"
  if ($Tooltip.Length -gt 63) { $Tooltip = $Tooltip.Substring(0,63) }
  $NotifyIcon.Text = $Tooltip
}

$Timer = New-Object System.Windows.Forms.Timer
$Timer.Interval = 1000
$Timer.Add_Tick({
  if (Test-Path -LiteralPath $StopFile) { [System.Windows.Forms.Application]::Exit(); return }
  if (Test-Path -LiteralPath $StatusFile) {
    try {
      $WriteUtc = (Get-Item -LiteralPath $StatusFile).LastWriteTimeUtc
      if ($WriteUtc -gt $script:LastStatusWriteUtc) {
        $Status = Get-Content -LiteralPath $StatusFile -Raw | ConvertFrom-Json
        Apply-Status -Status $Status
        $script:LastStatusWriteUtc = $WriteUtc
      }
    } catch { }
  }
  if ($null -ne $script:LastReceivedUtc) {
    $Age = [DateTime]::UtcNow - $script:LastReceivedUtc
    $AgeItem.Text = "Last update: $(Format-Age -Age $Age)"
    if ($Age.TotalSeconds -gt $script:StaleAfter) {
      $StateItem.Text = 'State: Stale'
      Set-NotifyIconImage -Path $UnknownIcon
      $NotifyIcon.Text = 'Xymon: Stale'
    }
  }
})
$ExitItem.Add_Click({ $Timer.Stop(); $NotifyIcon.Visible = $false; [System.Windows.Forms.Application]::Exit() })
$Timer.Start()
try { [System.Windows.Forms.Application]::Run() }
finally {
  $Timer.Stop()
  $NotifyIcon.Visible = $false
  if ($null -ne $script:CurrentIcon) { $script:CurrentIcon.Dispose() }
  $NotifyIcon.Dispose()
  $LockStream.Dispose()
}
