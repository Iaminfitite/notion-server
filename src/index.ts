import express from "express";
import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Initialize Notion client
const notion = new Client({
	auth: process.env.NOTION_API_KEY,
});

// Express app for Railway hosting
const app = express();
const PORT = process.env.PORT || 3000; // Railway dynamically assigns a port

app.use(express.json());

// Status endpoint to check if the server is running
app.get("/api/status", (req, res) => {
	res.json({ status: "Notion MCP Server is running", port: PORT });
});

// Tool definitions
const TOOL_DEFINITIONS = [
	{
		name: "search_pages",
		description: "Search through Notion pages",
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query",
				},
			},
			required: ["query"],
		},
	},
	{
		name: "read_page",
		description: "Read a Notion page's content",
		inputSchema: {
			type: "object",
			properties: {
				pageId: {
					type: "string",
					description: "ID of the page to read",
				},
			},
			required: ["pageId"],
		},
	},
];

// Initialize MCP server
const server = new Server(
	{
		name: "notion-server",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
	console.log("Tools requested by client");
	return { tools: TOOL_DEFINITIONS };
});

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
	const { name, arguments: args } = request.params;
	try {
		const handler = toolHandlers[name as keyof typeof toolHandlers];
		if (!handler) {
			throw new Error(`Unknown tool: ${name}`);
		}
		return await handler(args);
	} catch (error) {
		console.error(`Error executing tool ${name}:`, error);
		throw error;
	}
});

// Start Express Server
app.listen(PORT, async () => {
	console.log(`🚀 Notion MCP Server is running on port ${PORT}`);
});

export default app;
