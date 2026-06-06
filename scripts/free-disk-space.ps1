# Safe dev cleanup for ThesisX (run in PowerShell from repo root)
# Usage: .\scripts\free-disk-space.ps1

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "Disk before cleanup:"
Get-PSDrive -PSProvider FileSystem | Format-Table Name, @{N='FreeGB';E={[math]::Round($_.Free/1GB,2)}}

Write-Host "`nStopping stray Node dev servers..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if (Test-Path ".next") {
  Write-Host "Removing .next ..."
  Remove-Item -Recurse -Force ".next"
}

Write-Host "Cleaning npm cache (usually on C:)..."
npm cache clean --force

$temp = [System.IO.Path]::GetTempPath()
Write-Host "Cleaning user Temp older than 7 days: $temp"
Get-ChildItem $temp -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`nDisk after cleanup:"
Get-PSDrive -PSProvider FileSystem | Format-Table Name, @{N='FreeGB';E={[math]::Round($_.Free/1GB,2)}}

Write-Host "`nNext: npm install   then   npm run dev"
