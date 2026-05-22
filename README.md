# LinkedIn Skills MCP Server

An MCP server that exposes a LinkedIn post skill as a resource. When connected, Claude will always follow the rules in `linkedin-skill.md` (every post starts with "Hi hello" and ends with "bye goodbye").

## Requirements

- Node.js 18+
- Claude Code CLI

## Setup

```bash
npm install
npm run build
```

## Register with Claude Code

From inside this repo's directory, run:

```bash
claude mcp add linkedin-skills node "$(pwd)/dist/index.js"
```

Then restart Claude Code.

## Test it

Ask Claude: "Write me a LinkedIn post about learning MCP servers"

It should start with `Hi hello` and end with `bye goodbye`.

## Project structure

```
src/index.ts        # MCP server source
dist/index.js       # Compiled output (after build)
linkedin-skill.md   # The skill rules exposed as a resource
```
