$ErrorActionPreference = 'Stop'

$projectRoot =
    Split-Path `
        -Parent `
        $PSScriptRoot

Set-Location $projectRoot

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Description,

        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    Write-Host ''
    Write-Host "=== $Description ==="

    & $Command

    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE."
    }
}

Write-Host 'Starting full local quality gate.'

Invoke-CheckedCommand `
    -Description 'Fast quality gate' `
    -Command {
        pnpm check
    }

Invoke-CheckedCommand `
    -Description 'Start PostgreSQL' `
    -Command {
        pnpm db:up
    }

Invoke-CheckedCommand `
    -Description 'Create integration test database' `
    -Command {
        pnpm db:test:create
    }

Invoke-CheckedCommand `
    -Description 'Create E2E database' `
    -Command {
        pnpm db:e2e:create
    }

Invoke-CheckedCommand `
    -Description 'Integration tests' `
    -Command {
        pnpm test:integration
    }

Invoke-CheckedCommand `
    -Description 'E2E tests' `
    -Command {
        pnpm test:e2e
    }

Invoke-CheckedCommand `
    -Description 'Production build' `
    -Command {
        pnpm build
    }

Write-Host ''
Write-Host 'Full local quality gate PASSED.'