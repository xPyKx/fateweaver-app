param(
  [ValidateSet("start", "stop", "status")]
  [string]$Action = "start",
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root ".devserver.pid"
$OutLog = Join-Path $Root ".devserver.stdout.log"
$ErrLog = Join-Path $Root ".devserver.stderr.log"
$Url = "http://127.0.0.1:$Port"

function Test-DevServer {
  try {
    $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Get-DevProcess {
  if (!(Test-Path $PidFile)) {
    try {
      $connection = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($connection) {
        return Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
      }
    } catch {
      return $null
    }
  }

  $rawPid = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (!$rawPid) {
    return $null
  }

  $processId = 0
  if (![int]::TryParse($rawPid, [ref]$processId)) {
    return $null
  }

  return Get-Process -Id $processId -ErrorAction SilentlyContinue
}

if ($Action -eq "status") {
  $process = Get-DevProcess
  if (Test-DevServer) {
    if ($process) {
      Write-Host "Devserver erreichbar: $Url (PID $($process.Id))"
    } else {
      Write-Host "Devserver erreichbar: $Url"
    }
    exit 0
  }

  if ($process) {
    Write-Host "Devserver-Prozess laeuft, aber $Url antwortet nicht. PID: $($process.Id)"
    exit 1
  }

  Write-Host "Devserver nicht erreichbar: $Url"
  exit 1
}

if ($Action -eq "stop") {
  $process = Get-DevProcess
  if ($process) {
    Stop-Process -Id $process.Id
    Write-Host "Devserver gestoppt. PID: $($process.Id)"
  } else {
    Write-Host "Kein gespeicherter Devserver-Prozess gefunden."
  }
  Remove-Item $PidFile -ErrorAction SilentlyContinue
  exit 0
}

if (Test-DevServer) {
  $process = Get-DevProcess
  if ($process) {
    Set-Content -Path $PidFile -Value $process.Id
    Write-Host "Devserver laeuft bereits: $Url (PID $($process.Id))"
  } else {
    Write-Host "Devserver laeuft bereits: $Url"
  }
  exit 0
}

$oldProcess = Get-DevProcess
if ($oldProcess) {
  Stop-Process -Id $oldProcess.Id -ErrorAction SilentlyContinue
  Remove-Item $PidFile -ErrorAction SilentlyContinue
}

Remove-Item $OutLog, $ErrLog -ErrorAction SilentlyContinue

$process = Start-Process `
  -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "$Port", "--strictPort") `
  -WorkingDirectory $Root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError $ErrLog `
  -PassThru

Set-Content -Path $PidFile -Value $process.Id

for ($attempt = 1; $attempt -le 30; $attempt++) {
  Start-Sleep -Milliseconds 500
  if (Test-DevServer) {
    Write-Host "Devserver gestartet: $Url (PID $($process.Id))"
    exit 0
  }
}

Write-Host "Devserver wurde gestartet, antwortet aber noch nicht: $Url (PID $($process.Id))"
Write-Host "Stdout: $OutLog"
Write-Host "Stderr: $ErrLog"
exit 1
