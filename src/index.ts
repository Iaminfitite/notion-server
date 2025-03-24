import express, { Request, Response } from "express";
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
app.get("/api/status", (req: Request, res: Response) => {
	res.json({ status: "Notion MCP Server is running", port: PORT });
});

// Define tool handlers to prevent undefined errors
const toolHandlers: Record<string, (args: any) => Promise<any>> = {
	search_pages: async ({ query }) => {
		console.log(`Searching Notion pages for: ${query}`);
		const response = await notion.search({
			query,
			filter: { property: "object", value: "page" },
			page_size: 10,
		});
		return response.results;
	},

	read_page: async ({ pageId }) => {
		console.log(`Reading Notion page: ${pageId}`);
		const page = await notion.pages.retrieve({ page_id: pageId });
		return page;
	},
};

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
