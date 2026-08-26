#!/usr/bin/env bash
# Install test-automation-agents-kit into a Playwright repo.
# Usage:
#   ./install.sh /path/to/your-playwright-repo
#   ./install.sh /path/to/your-playwright-repo --upgrade

set -euo pipefail

TARGET_REPO="${1:-}"
UPGRADE="${2:-}"

if [[ -z "$TARGET_REPO" ]]; then
  echo "Usage: $0 <target-repo-path> [--upgrade]" >&2
  exit 1
fi

if [[ ! -d "$TARGET_REPO" ]]; then
  echo "Target repo not found: $TARGET_REPO" >&2
  exit 1
fi

KIT_ROOT="$(cd "$(dirname "$0")" && pwd)"
CURSOR="$TARGET_REPO/.cursor"
AGENTS="$CURSOR/agents"
RULES="$CURSOR/rules"
PROJECT="$CURSOR/project"
SKILLS="$CURSOR/skills/project-framework"
BLUEPRINT="$PROJECT/automation-blueprint.md"

mkdir -p "$AGENTS" "$RULES" "$PROJECT" "$SKILLS"

cp -f "$KIT_ROOT/agents/"* "$AGENTS/"
cp -f "$KIT_ROOT/rules/"* "$RULES/"

if [[ ! -f "$BLUEPRINT" ]]; then
  cp "$KIT_ROOT/templates/automation-blueprint.md" "$BLUEPRINT"
  echo "Created $BLUEPRINT — fill in your project details."
else
  echo "Kept existing blueprint: $BLUEPRINT"
fi

FRAMEWORK_SKILL="$SKILLS/SKILL.md"
if [[ ! -f "$FRAMEWORK_SKILL" ]]; then
  cp "$KIT_ROOT/templates/project-framework/SKILL.md" "$FRAMEWORK_SKILL"
  echo "Created $FRAMEWORK_SKILL"
fi

echo ""
echo "Agent kit installed to $TARGET_REPO"
echo "Next steps:"
echo "  1. Merge subagents.snippet.md into .cursor/subagents.json"
echo "  2. Fill .cursor/project/automation-blueprint.md"
echo "  3. Configure Atlassian MCP in Cursor"
echo "  4. Read docs/AI-Test-Automation-Agents-Whitepaper.md"
if [[ "$UPGRADE" == "--upgrade" ]]; then
  echo "(Upgrade mode: agents and rules refreshed; blueprint preserved.)"
fi
