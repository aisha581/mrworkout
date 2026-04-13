#!/bin/bash
# push_env_to_vercel.sh
# Reads .env.local and pushes every key to Vercel (production + preview + development).
# Run once after rotating your keys: bash scripts/push_env_to_vercel.sh

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Create it first."
  exit 1
fi

echo "Pushing env vars from $ENV_FILE to Vercel..."
echo ""

while IFS= read -r line || [ -n "$line" ]; do
  # Skip blank lines and comments
  [[ -z "$line" || "$line" =~ ^# ]] && continue

  KEY="${line%%=*}"
  VALUE="${line#*=}"

  # Skip placeholder values
  if [[ "$VALUE" == *"your_"* || "$VALUE" == "YOUR_"* ]]; then
    echo "  SKIP  $KEY (still a placeholder)"
    continue
  fi

  echo "  PUSH  $KEY"
  # Push to all three environments
  echo "$VALUE" | npx vercel env add "$KEY" production  --force 2>/dev/null
  echo "$VALUE" | npx vercel env add "$KEY" preview     --force 2>/dev/null
  echo "$VALUE" | npx vercel env add "$KEY" development --force 2>/dev/null

done < "$ENV_FILE"

echo ""
echo "Done. Run 'npx vercel env ls' to verify."
