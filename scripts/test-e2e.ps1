param(
    [switch]$Ui,
    [switch]$Headed
)

$ErrorActionPreference = 'Stop'

$projectRoot =
    Split-Path `
        -Parent `
        $PSScriptRoot

Set-Location $projectRoot

$e2eEnvPath =
    Join-Path `
        $projectRoot `
        '.env.e2e'

if (-not (Test-Path $e2eEnvPath)) {
    throw '.env.e2e is missing.'
}

$databaseUrlLine =
    Get-Content $e2eEnvPath |
    Where-Object {
        $_ -match '^\s*DATABASE_URL\s*='
    } |
    Select-Object -First 1

if ($null -eq $databaseUrlLine) {
    throw 'DATABASE_URL is missing in .env.e2e.'
}

$databaseUrl =
    ($databaseUrlLine -split '=', 2)[1].Trim()

try {
    $databaseUri =
        [System.Uri]$databaseUrl
}
catch {
    throw 'DATABASE_URL in .env.e2e is invalid.'
}

$databaseName =
    $databaseUri.AbsolutePath.TrimStart('/')

if ($databaseName -ne 'task_management_e2e') {
    throw "Unsafe E2E database: $databaseName"
}

if (
    $databaseUri.Host -ne '127.0.0.1' -and
    $databaseUri.Host -ne 'localhost'
) {
    throw "Unsafe E2E database host: $($databaseUri.Host)"
}

$existingListener =
    Get-NetTCPConnection `
        -LocalPort 3100 `
        -State Listen `
        -ErrorAction SilentlyContinue

if ($null -ne $existingListener) {
    throw 'Port 3100 is already in use. Stop the existing process before running E2E tests.'
}

$env:DATABASE_URL =
    $databaseUrl

$env:PLAYWRIGHT_TEST_BASE_URL =
    'http://127.0.0.1:3100'

try {
    pnpm db:deploy

    if ($LASTEXITCODE -ne 0) {
        throw 'E2E database migration failed.'
    }

    if ($Ui) {
        pnpm exec playwright test --ui
    }
    elseif ($Headed) {
        pnpm exec playwright test --headed
    }
    else {
        pnpm exec playwright test
    }

    if ($LASTEXITCODE -ne 0) {
        throw 'E2E tests failed.'
    }
}
finally {
    Remove-Item `
        Env:DATABASE_URL `
        -ErrorAction SilentlyContinue

    Remove-Item `
        Env:PLAYWRIGHT_TEST_BASE_URL `
        -ErrorAction SilentlyContinue
}