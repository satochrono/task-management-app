$ErrorActionPreference = 'Stop'

$projectRoot =
    Split-Path `
        -Parent `
        $PSScriptRoot

Set-Location $projectRoot

$testEnvPath =
    Join-Path `
        $projectRoot `
        '.env.test'

if (-not (Test-Path $testEnvPath)) {
    throw '.env.test is missing.'
}

$databaseUrlLine =
    Get-Content $testEnvPath |
    Where-Object {
        $_ -match '^\s*DATABASE_URL\s*='
    } |
    Select-Object -First 1

if ($null -eq $databaseUrlLine) {
    throw 'DATABASE_URL is missing in .env.test.'
}

$databaseUrl =
    ($databaseUrlLine -split '=', 2)[1].Trim()

try {
    $uri = [System.Uri]$databaseUrl
}
catch {
    throw 'DATABASE_URL in .env.test is invalid.'
}

$databaseName =
    $uri.AbsolutePath.TrimStart('/')

if ($databaseName -ne 'task_management_test') {
    throw "Unsafe integration database: $databaseName"
}

if (
    $uri.Host -ne '127.0.0.1' -and
    $uri.Host -ne 'localhost'
) {
    throw "Unsafe integration database host: $($uri.Host)"
}

$env:DATABASE_URL = $databaseUrl

try {
    pnpm db:deploy

    if ($LASTEXITCODE -ne 0) {
        throw 'Migration failed.'
    }

    pnpm exec vitest run `
        --project integration

    if ($LASTEXITCODE -ne 0) {
        throw 'Integration tests failed.'
    }
}
finally {
    Remove-Item `
        Env:DATABASE_URL `
        -ErrorAction SilentlyContinue
}