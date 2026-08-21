$ErrorActionPreference = 'Stop'
$DataDirectory = Join-Path $env:LOCALAPPDATA 'XymonTray'
$LogFile = Join-Path $DataDirectory 'host.log'
$StatusFile = Join-Path $DataDirectory 'status.json'
$CurrentIconFile = Join-Path $DataDirectory 'current.ico'
New-Item -ItemType Directory -Path $DataDirectory -Force | Out-Null

function Write-Log { param([string]$Message) Add-Content -LiteralPath $LogFile -Value "$(Get-Date -Format o) $Message" }
function Read-Exactly {
  param([System.IO.Stream]$Stream, [int]$Count)
  $Buffer = New-Object byte[] $Count
  $Offset = 0
  while ($Offset -lt $Count) {
    $Read = $Stream.Read($Buffer, $Offset, $Count - $Offset)
    if ($Read -eq 0) { if ($Offset -eq 0) { return $null }; throw 'Unexpected end of Native Messaging input.' }
    $Offset += $Read
  }
  return $Buffer
}
function Read-NativeMessage {
  $InputStream = [Console]::OpenStandardInput()
  $Header = Read-Exactly -Stream $InputStream -Count 4
  if ($null -eq $Header) { return $null }
  $Length = [BitConverter]::ToUInt32($Header, 0)
  if ($Length -gt 1048576) { throw "Native message length $Length exceeds the 1 MiB limit." }
  $Payload = Read-Exactly -Stream $InputStream -Count ([int]$Length)
  if ($null -eq $Payload) { throw 'Native message payload is missing.' }
  return [Text.Encoding]::UTF8.GetString($Payload)
}
function Publish-StatusFile {
  param([pscustomobject]$Message)
  $IconPath = $null
  if ($Message.iconData) {
    try {
      $IconBytes = [Convert]::FromBase64String([string]$Message.iconData)
      if ($IconBytes.Length -gt 65536) { throw 'Decoded icon exceeds 64 KiB.' }
      $IconTemp = "$CurrentIconFile.tmp"
      [IO.File]::WriteAllBytes($IconTemp, $IconBytes)
      Move-Item -LiteralPath $IconTemp -Destination $CurrentIconFile -Force
      $IconPath = $CurrentIconFile
    } catch { Write-Log "Icon update failed: $($_.Exception.Message)" }
  }
  $Status = [ordered]@{
    state = if ($Message.state) { [string]$Message.state } else { 'unknown' }
    displayName = if ($Message.displayName) { [string]$Message.displayName } else { 'Xymon' }
    staleAfter = if ($Message.staleAfter) { [int]$Message.staleAfter } else { 300 }
    receivedUtc = [DateTime]::UtcNow.ToString('o')
  }
  if ($Message.url) { $Status.url = [string]$Message.url }
  if ($IconPath) { $Status.iconPath = $IconPath }
  $TempFile = "$StatusFile.tmp"
  $Json = $Status | ConvertTo-Json -Depth 3
  [IO.File]::WriteAllText($TempFile, $Json, (New-Object Text.UTF8Encoding $false))
  Move-Item -LiteralPath $TempFile -Destination $StatusFile -Force
}

Write-Log 'XymonTray 0.9 native host started'
try {
  while ($true) {
    $Json = Read-NativeMessage
    if ($null -eq $Json) { break }
    Write-Log $Json
    try {
      $Message = $Json | ConvertFrom-Json
      Publish-StatusFile -Message $Message
      Write-Log "Published state=$($Message.state)"
    } catch { Write-Log "Message processing failed: $($_.Exception.Message)" }
  }
} catch { Write-Log "Fatal error: $($_.Exception.Message)" }
finally { Write-Log 'XymonTray 0.9 native host stopped' }
