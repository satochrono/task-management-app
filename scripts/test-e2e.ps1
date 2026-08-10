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

if (-not (Test-Path -LiteralPath $e2eEnvPath)) {
    throw '.env.e2e is missing.'
}

$previousEnvironment = @{}

try {
    #
    # Load .env.e2e into the current process environment.
    #
    # The values are deliberately loaded before Prisma, seed, Next.js,
    # and Playwright are started so that all child processes inherit the
    # E2E-specific environment.
    #
    $lineNumber = 0

    foreach ($rawLine in Get-Content -LiteralPath $e2eEnvPath) {
        $lineNumber++

        $line = $rawLine.Trim()

        if (
            $line.Length -eq 0 -or
            $line.StartsWith('#')
        ) {
            continue
        }

        $separatorIndex = $line.IndexOf('=')

        if ($separatorIndex -le 0) {
            throw "Invalid .env.e2e syntax at line $lineNumber."
        }

        $name =
            $line.Substring(
                0,
                $separatorIndex
            ).Trim()

        if (
            $name -notmatch
            '^[A-Za-z_][A-Za-z0-9_]*$'
        ) {
            throw "Invalid environment variable name at line $lineNumber."
        }

        $value =
            $line.Substring(
                $separatorIndex + 1
            ).Trim()

        if (
            $value.Length -ge 2 -and
            (
                (
                    $value.StartsWith('"') -and
                    $value.EndsWith('"')
                ) -or
                (
                    $value.StartsWith("'") -and
                    $value.EndsWith("'")
                )
            )
        ) {
            $value =
                $value.Substring(
                    1,
                    $value.Length - 2
                )
        }

        if (-not $previousEnvironment.ContainsKey($name)) {
            $previousEnvironment[$name] =
                [Environment]::GetEnvironmentVariable(
                    $name,
                    'Process'
                )
        }

        [Environment]::SetEnvironmentVariable(
            $name,
            $value,
            'Process'
        )
    }

    #
    # Validate required E2E environment variables.
    #
    $requiredVariables = @(
        'DATABASE_URL',
        'AUTH_SECRET',
        'SEED_USER_EMAIL',
        'SEED_USER_PASSWORD'
    )

    foreach ($requiredVariable in $requiredVariables) {
        $value =
            [Environment]::GetEnvironmentVariable(
                $requiredVariable,
                'Process'
            )

        if ([string]::IsNullOrWhiteSpace($value)) {
            throw "$requiredVariable is missing in .env.e2e."
        }
    }

    #
    # Validate authentication-specific constraints before starting tests.
    #
    if ($env:AUTH_SECRET.Length -lt 32) {
        throw 'AUTH_SECRET in .env.e2e must be at least 32 characters.'
    }

    $seedPasswordByteCount =
        [System.Text.Encoding]::UTF8.GetByteCount(
            $env:SEED_USER_PASSWORD
        )

    if ($seedPasswordByteCount -gt 72) {
        throw 'SEED_USER_PASSWORD in .env.e2e must be at most 72 UTF-8 bytes.'
    }

    #
    # Validate that DATABASE_URL points only to the dedicated local E2E DB.
    #
    try {
        $databaseUri =
            [System.Uri]$env:DATABASE_URL
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

    #
    # Playwright owns port 3100 for the duration of the E2E run.
    #
    $existingListener =
        Get-NetTCPConnection `
            -LocalPort 3100 `
            -State Listen `
            -ErrorAction SilentlyContinue

    if ($null -ne $existingListener) {
        throw 'Port 3100 is already in use. Stop the existing process before running E2E tests.'
    }

    #
    # Preserve and set the Playwright base URL.
    #
    if (
        -not $previousEnvironment.ContainsKey(
            'PLAYWRIGHT_TEST_BASE_URL'
        )
    ) {
        $previousEnvironment['PLAYWRIGHT_TEST_BASE_URL'] =
            [Environment]::GetEnvironmentVariable(
                'PLAYWRIGHT_TEST_BASE_URL',
                'Process'
            )
    }

    $env:PLAYWRIGHT_TEST_BASE_URL =
        'http://127.0.0.1:3100'

    Write-Host 'E2E environment loaded.'
    Write-Host 'E2E database safety checks passed.'

    #
    # Apply committed migrations to the dedicated E2E database.
    #
    Write-Host ''
    Write-Host '=== Apply E2E database migrations ==='

    pnpm db:deploy

    if ($LASTEXITCODE -ne 0) {
        throw 'E2E database migration failed.'
    }

    #
    # Seed the E2E authentication user.
    #
    # DATABASE_URL, SEED_USER_EMAIL, and SEED_USER_PASSWORD are already
    # present in this process, so the seed command targets task_management_e2e.
    #
    Write-Host ''
    Write-Host '=== Seed E2E database ==='

    pnpm db:seed

    if ($LASTEXITCODE -ne 0) {
        throw 'E2E database seed failed.'
    }

    #
    # Run Playwright.
    #
    Write-Host ''
    Write-Host '=== Run Playwright E2E tests ==='

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

    Write-Host ''
    Write-Host 'E2E tests completed successfully.'
}
finally {
    #
    # Restore the process environment exactly to the state it had before
    # this script started.
    #
    foreach ($name in $previousEnvironment.Keys) {
        $previousValue =
            $previousEnvironment[$name]

        [Environment]::SetEnvironmentVariable(
            $name,
            $previousValue,
            'Process'
        )
    }
}
