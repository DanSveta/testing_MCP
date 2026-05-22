import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
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

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: RESOURCE_URI,
        name: "LinkedIn Post Skill",
        description: "Rules and structure for writing LinkedIn posts",
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

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "write-linkedin-post",
        description:
          "Write a LinkedIn post that starts with 'Hi hello' and ends with 'bye goodbye'",
        arguments: [
          { name: "topic", description: "What the post should be about", required: true },
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
  const app = express();
  app.use(express.json());

  // Track active SSE transports by sessionId so POST /messages can route correctly
  const transports = new Map<string, SSEServerTransport>();

  // Client connects here to open the SSE stream
  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);

    res.on("close", () => {
      transports.delete(transport.sessionId);
    });

    const server = createServer();
    await server.connect(transport);
  });

  // Client POSTs MCP messages here (sessionId appended to query string by the transport)
  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  // Health check
  app.get("/", (_req, res) => {
    res.json({ status: "ok", server: "linkedin-skills MCP", transport: "SSE" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LinkedIn Skills MCP server (SSE) running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
