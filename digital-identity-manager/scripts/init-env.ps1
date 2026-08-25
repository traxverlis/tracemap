# Create or complete the local .env file used by the Docker stack (Windows).
#
# The compose files declare SECRET_KEY, OSINT_RUNNER_TOKEN and POSTGRES_PASSWORD
# as required: `docker compose up` refuses to start while one of them is missing
# or empty. This script copies .env.example when needed and fills only the
# secrets that are still empty, so it is safe to run several times.
#
# Usage (from the digital-identity-manager directory):
#     powershell -ExecutionPolicy Bypass -File scripts\init-env.ps1

[CmdletBinding()]
param(
    [string]$EnvFile = '.env'
)

$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot '..')

$exampleFile = '.env.example'
$secretKeys = @('SECRET_KEY', 'OSINT_RUNNER_TOKEN', 'POSTGRES_PASSWORD')

function New-Secret {
    # 32 cryptographically random bytes, rendered as hexadecimal.
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    }
    finally {
        $rng.Dispose()
    }
    return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
    if (-not (Test-Path -LiteralPath $exampleFile)) {
        throw "Neither $EnvFile nor $exampleFile exists"
    }
    Copy-Item -LiteralPath $exampleFile -Destination $EnvFile
    Write-Host "Created $EnvFile from $exampleFile"
}

$lines = @(Get-Content -LiteralPath $EnvFile)

foreach ($key in $secretKeys) {
    $index = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*$key=") {
            $index = $i
            break
        }
    }

    # A value counts as present only when it is not blank: "KEY=" and "KEY=   "
    # are the placeholders shipped in .env.example.
    if ($index -ge 0) {
        $value = ($lines[$index] -replace "^\s*$key=", '').Trim()
        if ($value) {
            Write-Host "${key}: already set, left untouched"
            continue
        }
        $lines[$index] = "$key=$(New-Secret)"
    }
    else {
        $lines += "$key=$(New-Secret)"
    }
    Write-Host "${key}: generated"
}

# LF endings and no byte-order mark: Docker Compose reads this file verbatim.
$content = ($lines -join "`n") + "`n"
[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location).Path $EnvFile),
    $content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ''
Write-Host "$EnvFile is ready. Review the remaining values, then start the stack:"
Write-Host '    docker compose up -d --build'
