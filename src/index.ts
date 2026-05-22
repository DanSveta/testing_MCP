import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";

const SKILL_FILE = path.resolve(__dirname, "..", "linkedin-skill.md");
const RESOURCE_URI = "resource://linkedin-skill/rules";
const PORT = parseInt(process.env.PORT ?? "3000", 10);

function createServer(): Server {
  const server = new Server(
    { name: "linkedin-skills", version: "1.0.0" },
    { capabilities: { resources: {}, prompts: {} } }
  );

  // Resource: exposes the raw markdown file
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: RESOURCE_URI,
        name: "LinkedIn Post Skill",
        description:
          "Rules and structure for writing LinkedIn posts",
        mimeType: "text/markdown",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri !== RESOURCE_URI) {
      throw new Error(`Unknown resource: ${request.params.uri}`);
    }
    const content = fs.readFileSync(SKILL_FILE, "utf-8");
    return {
      contents: [{ uri: RESOURCE_URI, mimeType: "text/markdown", text: content }],
    };
  });

  // Prompt: injects the rules directly into the conversation
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "write-linkedin-post",
        description:
          "Write a LinkedIn post following the required rules (starts with 'Hi hello', ends with 'bye goodbye')",
        arguments: [
          {
            name: "topic",
            description: "What the post should be about",
            required: true,
          },
        ],
      },
    ],
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (request.params.name !== "write-linkedin-post") {
      throw new Error(`Unknown prompt: ${request.params.name}`);
    }
    const rules = fs.readFileSync(SKILL_FILE, "utf-8");
    const topic = request.params.arguments?.topic ?? "a professional topic";
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use these rules to write a LinkedIn post about: ${topic}\n\n${rules}`,
          },
        },
      ],
    };
  });

  return server;
}

async function main() {
  // Use 0.0.0.0 so Railway can route traffic in
  const app = createMcpExpressApp({ host: "0.0.0.0" });

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — no session tracking needed
    });
    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  // Health check for Railway
  app.get("/", (_req, res) => {
    res.json({ status: "ok", server: "linkedin-skills MCP" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LinkedIn Skills MCP server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
