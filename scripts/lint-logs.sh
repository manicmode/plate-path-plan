#!/usr/bin/env bash
set -euo pipefail

paths=(
  "src/pages/Home.tsx"
  "src/pages/Coach.tsx"
  "src/pages/AIFitnessCoach.tsx"
  "src/components/coach/recovery/RecoveryAIChat.tsx"
  "src/components/FoodConfirmationCard.tsx"
  "src/components/HomeCtaTicker.tsx"
  "src/components/profile"
)

grep -R --line-number -E "console\.(log|info|debug)" -- "${paths[@]}" && {
  echo -e "\n❌ Found forbidden console logs above. Use warn/error or remove." >&2
  exit 1
} || {
  echo "✅ No forbidden console logs found."
}
