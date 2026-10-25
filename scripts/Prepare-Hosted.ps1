[CmdletBinding()]
param(
    [string]$OutputDirectory = "artifacts\maf-hosted",
    [string]$PackageSource
)

$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$output = [IO.Path]::GetFullPath((Join-Path $root $OutputDirectory))
if ((Test-Path -LiteralPath $output) -and (Get-ChildItem -LiteralPath $output -Force | Select-Object -First 1)) {
    throw "Output is not empty: $output. Use a new -OutputDirectory; this script never deletes existing work."
}

$project = Join-Path $root "examples\MafHosted\MafHosted.csproj"
$arguments = @("publish", $project, "--configuration", "Release", "--runtime", "linux-x64",
    "--self-contained", "false", "--output", $output, "-p:UseSharedCompilation=false", "--verbosity", "minimal")
if ($PackageSource) {
    $arguments += "-p:RestoreSources=$PackageSource"
}
& dotnet @arguments | Out-Host
if ($LASTEXITCODE -ne 0) { throw "The hosted package build failed." }

foreach ($file in @("MafHosted.dll", "ServiceGuide.Shared.dll", "MafHosted.deps.json", "MafHosted.runtimeconfig.json")) {
    if (-not (Test-Path -LiteralPath (Join-Path $output $file))) {
        throw "The package is incomplete: $file is missing."
    }
}
Copy-Item -LiteralPath (Join-Path $root "examples\MafHosted\.agentignore") -Destination (Join-Path $output ".agentignore")
Write-Host "Bundled .NET agent prepared. No Azure resources were created or deployed."
Write-Output $output
