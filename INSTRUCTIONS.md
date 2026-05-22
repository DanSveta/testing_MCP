# LinkedIn MCP - Setup Instructions for Claude Code

## What this is
An MCP server that exposes a LinkedIn post skill as a resource.
When connected, Claude will always follow the rules in `linkedin-skill.md`.

## Setup Steps

1. Install dependencies:
```
npm install
```

2. Build the TypeScript:
```
npm run build
```

3. Register the MCP server with Claude Code:
```
claude mcp add linkedin-skills node dist/index.js
```

4. Restart Claude Code — it will now automatically load the skill on startup.

## Test it
Ask Claude: "Write me a LinkedIn post about learning MCP servers"
It should start with "Hi hello" and end with "bye goodbye"

## To share with others (deploy)
- Push this project to GitHub
- Deploy to Railway or Render
- Share the URL — others paste it in Claude.ai under Settings > MCP
