param(
    [switch]$NoBrowser,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$python = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = "python"
}

$command = "$python -m uvicorn src.api.server:app --host 127.0.0.1 --port 8000"

if ($DryRun) {
    Write-Host "[dry-run] $command"
    exit 0
}

if (-not $NoBrowser) {
    Start-Process "http://127.0.0.1:8000"
}

Write-Host "Starting backend + frontend on http://127.0.0.1:8000"
Invoke-Expression $command
