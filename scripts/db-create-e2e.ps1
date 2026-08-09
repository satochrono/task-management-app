$ErrorActionPreference = 'Stop'

$projectRoot =
    Split-Path `
        -Parent `
        $PSScriptRoot

Set-Location $projectRoot

$databaseName =
    'task_management_e2e'

$databaseExistsOutput =
    docker compose exec -T db `
        psql `
        -U task_app `
        -d postgres `
        -tAc `
        "SELECT 1 FROM pg_database WHERE datname = '$databaseName';"

if ($LASTEXITCODE -ne 0) {
    throw 'Failed to query PostgreSQL.'
}

$databaseExists =
    if ($null -eq $databaseExistsOutput) {
        ''
    }
    else {
        (
            $databaseExistsOutput |
            Out-String
        ).Trim()
    }

if ($databaseExists -eq '1') {
    Write-Host "Database already exists: $databaseName"
    exit 0
}

docker compose exec -T db `
    psql `
    -U task_app `
    -d postgres `
    -c `
    "CREATE DATABASE $databaseName;"

if ($LASTEXITCODE -ne 0) {
    throw 'Failed to create E2E database.'
}

Write-Host "Created database: $databaseName"