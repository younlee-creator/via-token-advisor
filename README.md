# Via Token Advisor

MCP server and web app for the Via Design System — search tokens by intent, get recommendations for your use case, and verify you're using a token correctly.

## Try it

**[Web app →](https://younlee-creator.github.io/via-token-advisor/)**
Browse the full token catalog, search by intent, or paste CSS to audit hardcoded hex values.

**[Repo →](https://github.com/younlee-creator/via-token-advisor)**
Source code and token data.

**[Project brief →](https://github.com/younlee-creator/via-token-advisor/blob/main/doc/project-brief.md)**
Background, use cases, lessons learned, and further ideas.

---

## MCP setup

The MCP server lets you query tokens directly from your AI assistant using natural language.

### Cursor

Add to your `~/.cursor/mcp.json` (or open **Cursor Settings → MCP → Add Server**):

```json
{
  "mcpServers": {
    "via-token-advisor": {
      "command": "npx",
      "args": ["-y", "via-token-advisor"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "via-token-advisor": {
      "command": "npx",
      "args": ["-y", "via-token-advisor"]
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to your `.vscode/mcp.json` in the workspace, or your user `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "via-token-advisor": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "via-token-advisor"]
      }
    }
  }
}
```

After adding, restart your agent/IDE and confirm the server connects. No token or auth required.

---

## What it does

Designers and engineers often know *what* they want (a muted text color, a success background) but not *which* Via token to use — or whether the token they've already chosen is the right one. This advisor covers both gaps.

**Three tools:**

- **`search_tokens`** — natural language search across color and typography tokens. Ask "what token should I use for helper text below an input?" and get ranked results with explanations.
- **`recommend_tokens`** — same as search but filtered to tokens explicitly marked as recommended (excludes deprecated and edge-case tokens).
- **`explain_token`** — given a token you already have, returns what it's for, what it's **not** for, what to pair it with, and what to use instead in different contexts.

Tokens are ranked using a scoring model that weighs real component usage from Figma (high confidence) against description keywords and token names (lower confidence).

## Example queries

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

## Pairing with Via MCP

| Question type | Use |
|--------------|-----|
| "Which token should I use for X?" | via-token-advisor |
| "How do I use the TextInput component?" | Via MCP |

---

## Updating

**Adding or editing token descriptions and `notFor` rules:**

Edit `data/authored/color-semantic.descriptions.json`. Each token supports:
- `description` — what it's for (shown in all three tools)
- `notFor` — array of anti-patterns shown by `explain_token` (add these to any token that is commonly misused)

After editing:

```bash
# Regenerate token data
python3 scripts/generate-advisor-data.py

# Build MCP server
npm run build

# Build web app
cd web && npm run build

# Bump version in package.json, then publish
npm publish --access public
```

**Web app** is automatically deployed to GitHub Pages on every push to `main` that touches `web/` or `data/generated/`.
