[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$version = (& gh aw version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $version -ne "gh aw version v0.89.21") {
    throw "This workshop requires gh-aw v0.89.21. See docs/prework.md; do not upgrade implicitly."
}

Push-Location (Join-Path $PSScriptRoot "..")
try {
    & gh aw compile qa-review --validate --no-check-update
    if ($LASTEXITCODE -ne 0) { throw "QA workflow compilation failed. Do not edit the generated lock file." }
}
finally {
    Pop-Location
}
