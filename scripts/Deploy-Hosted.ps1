[CmdletBinding(SupportsShouldProcess, ConfirmImpact = "High")]
param(
    [Parameter(Mandatory)]
    [ValidatePattern("^/subscriptions/[0-9a-fA-F-]{36}/resourceGroups/[^/]+/providers/Microsoft\.CognitiveServices/accounts/[^/]+/projects/[^/]+$")]
    [string]$ProjectResourceId,
    [Parameter(Mandatory)]
    [ValidatePattern("^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$")]
    [string]$ModelDeployment,
    [Parameter(Mandatory)]
    [ValidatePattern("^[a-zA-Z0-9][a-zA-Z0-9-]{0,62}$")]
    [string]$AgentName,
    [Parameter(Mandatory)]
    [string]$PackageDirectory
)

$ErrorActionPreference = "Stop"
$package = (Resolve-Path -LiteralPath $PackageDirectory).Path
foreach ($file in @("MafHosted.dll", "ServiceGuide.Shared.dll", ".agentignore")) {
    if (-not (Test-Path -LiteralPath (Join-Path $package $file))) {
        throw "Run Prepare-Hosted.ps1 first. The package is missing $file."
    }
}
if (Test-Path -LiteralPath (Join-Path $package "azure.yaml")) {
    throw "This package already has deployment configuration. Use its existing azd project, or prepare a new package directory. Nothing was overwritten."
}
if (-not $PSCmdlet.ShouldProcess("$AgentName in $ProjectResourceId", "Create or update a hosted agent using the existing model '$ModelDeployment'")) {
    return
}

Push-Location $package
try {
    $ignorePath = Join-Path $package ".agentignore"
    $ignoreRules = [IO.File]::ReadAllText($ignorePath)
    & azd ai agent init --src . --kind hosted --protocol responses --deploy-mode code `
        --dep-resolution bundled --runtime dotnet_10 --entry-point MafHosted.dll `
        --project-id $ProjectResourceId --model-deployment $ModelDeployment --agent-name $AgentName --no-prompt
    if ($LASTEXITCODE -ne 0) { throw "Agent initialization failed. Deployment was not attempted." }
    [IO.File]::WriteAllText($ignorePath, $ignoreRules)
    & azd env set AZURE_AI_MODEL_DEPLOYMENT_NAME $ModelDeployment
    if ($LASTEXITCODE -ne 0) { throw "Model configuration failed. Deployment was not attempted." }
    & azd deploy --no-prompt
    if ($LASTEXITCODE -ne 0) { throw "Hosted deployment failed. Inspect the azd output; do not treat this as a live agent." }
    Write-Host "Deployment finished. Verify the remote agent version and invoke it before marking the lab complete."
}
finally {
    Pop-Location
}
