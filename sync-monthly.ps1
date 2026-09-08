#!/usr/bin/env pwsh
# sync-monthly.ps1 - Windows PowerShell monthly sync script for Aazadi
# Delegates to the Bun-based sync which handles catalog extraction,
# writing, git commit and push.

param(
  [switch]$Force
)

Write-Host "🔄 Aazadi: Starting monthly free models catalog sync..." -ForegroundColor Cyan

# Locate the repo root (parent of the directory containing this script)
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Error "Bun is required. Install it from https://bun.sh"
  exit 1
}

Write-Host "📦 Using Bun sync at $RepoDir" -ForegroundColor Gray
Push-Location $RepoDir

try {
  if ($Force) {
    bun run src/sync/refresh-free-models.ts --run --force
  } else {
    bun run sync:monthly
  }

  if ($LASTEXITCODE -eq 0) {
    Write-Host "" -ForegroundColor Green
    Write-Host "🎉 Aazadi monthly sync complete!" -ForegroundColor Cyan
    Write-Host "   Catalog: $RepoDir\catalog\free-models-catalog.json" -ForegroundColor Gray
  } else {
    Write-Host "❌ Sync failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}