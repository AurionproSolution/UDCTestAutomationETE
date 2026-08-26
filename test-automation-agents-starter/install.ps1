# Install test-automation-agents-kit into a Playwright repo.
# Usage:
#   .\install.ps1 -TargetRepo "C:\path\to\your-playwright-repo"
#   .\install.ps1 -TargetRepo "C:\path\to\your-playwright-repo" -Upgrade

param(
    [Parameter(Mandatory = $true)]
    [string]$TargetRepo,

    [switch]$Upgrade
)

$ErrorActionPreference = "Stop"
$KitRoot = $PSScriptRoot

if (-not (Test-Path $TargetRepo)) {
    throw "Target repo not found: $TargetRepo"
}

$cursor = Join-Path $TargetRepo ".cursor"
$agents = Join-Path $cursor "agents"
$rules = Join-Path $cursor "rules"
$project = Join-Path $cursor "project"
$skills = Join-Path $cursor "skills\project-framework"
$blueprint = Join-Path $project "automation-blueprint.md"

@($cursor, $agents, $rules, $project, $skills) | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
}

# Agents and rules (always overwrite on install/upgrade)
Copy-Item (Join-Path $KitRoot "agents\*") $agents -Force
Copy-Item (Join-Path $KitRoot "rules\*") $rules -Force

# Blueprint template (only if missing — never overwrite team edits)
if (-not (Test-Path $blueprint)) {
    Copy-Item (Join-Path $KitRoot "templates\automation-blueprint.md") $blueprint
    Write-Host "Created $blueprint — fill in your project details."
} else {
    Write-Host "Kept existing blueprint: $blueprint"
}

# Framework skill template (only if missing)
$frameworkSkill = Join-Path $skills "SKILL.md"
if (-not (Test-Path $frameworkSkill)) {
    Copy-Item (Join-Path $KitRoot "templates\project-framework\SKILL.md") $frameworkSkill
    Write-Host "Created $frameworkSkill"
}

Write-Host ""
Write-Host "Agent kit installed to $TargetRepo"
Write-Host "Next steps:"
Write-Host "  1. Merge subagents.snippet.md into .cursor/subagents.json"
Write-Host "  2. Fill .cursor/project/automation-blueprint.md"
Write-Host "  3. Configure Atlassian MCP in Cursor"
Write-Host "  4. Read docs/AI-Test-Automation-Agents-Whitepaper.md (copy from kit repo docs/)"
if ($Upgrade) {
    Write-Host "(Upgrade mode: agents and rules refreshed; blueprint preserved.)"
}
