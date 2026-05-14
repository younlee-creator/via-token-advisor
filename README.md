# via-token-advisor

MCP server for the Via Design System — search tokens by intent, get recommendations for your use case, and verify you're using a token correctly.

## What it does

Designers and engineers often know *what* they want (a muted text color, a success background) but not *which* Via token to use — or whether the token they've already chosen is the right one. This advisor covers both gaps.

**Three MCP tools:**

- **`search_tokens`** — natural language search across color and typography tokens. Ask "what token should I use for helper text below an input?" and get ranked results with explanations.
- **`recommend_tokens`** — same as search but filtered to tokens explicitly marked as recommended (excludes deprecated and edge-case tokens).
- **`explain_token`** — given a token you already have, returns what it's for, what it's **not** for, what to pair it with, and what to use instead in different contexts. Use this mid-build to verify a token choice is correct before it becomes a pattern.

Tokens are ranked using a scoring model that weighs real component usage from Figma (high confidence) against description keywords and token names (lower confidence).

## Example queries

Once installed, you can ask your AI assistant things like:

**Finding the right token:**
- *"What token should I use for placeholder text in an input?"*
- *"Which token is right for a success banner background?"*
- *"What's the token for a link color?"*
- *"Show me tokens for text on a dark/inverse surface."*
- *"What's the right token for a disabled form field?"*

**Verifying a token you're already using:**
- *"Is text/secondary the right token for body copy?"*
- *"What's text/placeholder not for?"*
- *"Explain text/danger — when should I use it vs text/error?"*
- *"I'm using color-text-disabled for muted labels — is that correct?"*

## Token scope

Currently covers **semantic color tokens** and **typography styles**. Spacing, radius, border-width, and component construction tokens are out of scope for this version.

Component usage context (which tokens appear in which Via components) is sourced directly from Figma and covers: TextInput, Button, Badge, Select, Combobox, Checkbox, Chip, Banner, Callout, Info Sprinkle, Link, and Validation Checklist.

## Updating

**Adding or editing token descriptions and `notFor` rules:**

Edit `data/authored/color-semantic.descriptions.json`. Each token supports:
- `description` — what it's for (shown in all three tools)
- `notFor` — array of anti-patterns shown by `explain_token` (add these to any token that is commonly misused)

After editing:

```bash
# Regenerate token data
python3 scripts/generate-advisor-data.py

# Build
npm run build

# Bump version in package.json, then publish
npm publish --access public
```

Users will get the latest automatically on their next `npx` invocation since `@latest` is pinned.
