$ErrorActionPreference = 'Stop'

Set-Location (
    Split-Path `
        -Parent `
        $PSScriptRoot
)

$databaseName =
    'task_management_test'

$exists =
    docker compose exec -T db `
        psql `
        -U task_app `
        -d postgres `
        -tAc `
        "SELECT 1 FROM pg_database WHERE datname = '$databaseName';"

if ($LASTEXITCODE -ne 0) {
    throw 'Failed to query PostgreSQL.'
}

$existsText =
    (@($exists) -join '').Trim()

if ($existsText -eq '1') {
    Write-Host `
        "Database already exists: $databaseName"

    exit 0
}

docker compose exec -T db `
    psql `
    -U task_app `
    -d postgres `
    -c `
    "CREATE DATABASE $databaseName;"

if ($LASTEXITCODE -ne 0) {
    throw 'Failed to create test database.'
}

Write-Host `
    "Created database: $databaseName"
