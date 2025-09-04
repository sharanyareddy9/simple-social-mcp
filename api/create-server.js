import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
export const createServer = () => {
    // Create server instance
    const server = new McpServer({
        name: "Social MCP",
        version: "1.0.0",
    });
    // Register social MCP tools
    server.tool("greet-user", "Simple greeting tool with social authentication", {
        message: z.string().optional().describe("Optional custom greeting message"),
    }, async ({ message }) => {
        const customMessage = message || "Hello there!";
        return {
            content: [{
                    type: "text",
                    text: `${customMessage} 👋\\n\\nThis is a social MCP server with Descope authentication using the official @descope/mcp-express package!`
                }]
        };
    });
    server.tool("get-current-time", "Get the current date and time", {
        timezone: z.string().optional().describe("Timezone (e.g., 'UTC', 'America/New_York')"),
    }, async ({ timezone }) => {
        const tz = timezone || 'UTC';
        const now = new Date();
        const timeString = tz === 'UTC'
            ? now.toISOString()
            : now.toLocaleString('en-US', { timeZone: tz });
        return {
            content: [{
                    type: "text",
                    text: `Current time: ${timeString} (${tz})\\n\\n🔒 Authenticated via Descope social login!`
                }]
        };
    });
    server.tool("get-user-info", "Get information about the authenticated user", {}, async () => {
        return {
            content: [{
                    type: "text",
                    text: `🔒 User successfully authenticated via Descope OAuth 2.1!\\n\\nThis MCP server supports social login with providers like Google, GitHub, Microsoft, and more through Descope.\\n\\nThe authentication is handled automatically by the @descope/mcp-express middleware.`
                }]
        };
    });
    return { server };
};
