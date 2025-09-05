#!/usr/bin/env node
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { descopeMcpAuthRouter, descopeMcpBearerAuth } from "@descope/mcp-express";
import { createServer } from "./create-server.js";
// Environment setup
dotenv.config();
const PORT = process.env.PORT || 3001;
const SERVER_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${PORT}`;
// Initialize Express app
const app = express();
// Middleware setup
app.use(express.json());
app.use(cors({
    origin: "*",
    methods: '*',
    allowedHeaders: 'Authorization, Origin, Content-Type, Accept, mcp-protocol-version, *',
    credentials: true
}));
app.options("*", cors());
// Auth middleware - OAuth endpoints
app.use(descopeMcpAuthRouter());
app.use(["/sse"], descopeMcpBearerAuth());
// Initialize transport
const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // set to undefined for stateless servers
});
// MCP SSE endpoint
app.post('/sse', async (req, res) => {
    console.log('Received MCP request:', req.body);
    try {
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
});
// Method not allowed handlers for MCP endpoint
const methodNotAllowed = (req, res) => {
    console.log(`Received ${req.method} MCP request`);
    res.status(405).json({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    });
};
app.get('/sse', methodNotAllowed);
app.delete('/sse', methodNotAllowed);
// Home page
app.get('/', (req, res) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Social MCP Server</title>
    <style>
        body { 
            font-family: system-ui, sans-serif;
            max-width: 600px; 
            margin: 0 auto;
            padding: 40px 20px;
            background: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
        }
        .endpoint {
            background: #1e293b;
            color: #e2e8f0;
            padding: 16px;
            border-radius: 8px;
            font-family: monospace;
            margin: 8px 0;
        }
        .auth-info {
            background: #065f46;
            color: #d1fae5;
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 Social MCP Server</h1>
        <p>MCP server with Descope social authentication</p>
        
        <div class="auth-info">
            ✅ OAuth 2.1 + Social Login Enabled<br>
            Using Official @descope/mcp-express
        </div>
        
        <h3>Endpoints</h3>
        <div class="endpoint">SSE: ${SERVER_URL}/sse</div>
        <div class="endpoint">OAuth Discovery: ${SERVER_URL}/.well-known/oauth-authorization-server</div>
        <div class="endpoint">Authorization: ${SERVER_URL}/authorize</div>
        <div class="endpoint">Registration: ${SERVER_URL}/register</div>
        
        <p>Ready for Claude Web with social authentication! 🚀</p>
    </div>
</body>
</html>`;
    res.send(html);
});
// Health endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: 'Social MCP',
        version: '1.0.0',
        auth: 'descope-oauth',
        package: '@descope/mcp-express',
        endpoints: {
            sse: `${SERVER_URL}/sse`,
            oauth_discovery: `${SERVER_URL}/.well-known/oauth-authorization-server`,
            authorize: `${SERVER_URL}/authorize`,
            register: `${SERVER_URL}/register`
        },
        timestamp: new Date().toISOString()
    });
});
// Create and connect MCP server
const { server } = createServer();
// Server setup
const setupServer = async () => {
    try {
        await server.connect(transport);
        console.log('✅ MCP Server connected successfully');
    }
    catch (error) {
        console.error('❌ Failed to set up the MCP server:', error);
        throw error;
    }
};
// Initialize server setup
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    // Local development - start HTTP server
    setupServer()
        .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Social MCP Server running on port ${PORT}`);
            console.log(`📍 Server URL: ${SERVER_URL}`);
            console.log(`🔌 SSE Endpoint: ${SERVER_URL}/sse`);
            console.log(`🔒 OAuth Discovery: ${SERVER_URL}/.well-known/oauth-authorization-server`);
            console.log(`🔑 Authorization: ${SERVER_URL}/authorize`);
            console.log(`📝 Registration: ${SERVER_URL}/register`);
            console.log(`✅ Descope Authentication Enabled (@descope/mcp-express)`);
        });
    })
        .catch(error => {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    });
}
else {
    // Vercel deployment - just initialize the server
    setupServer().catch(error => {
        console.error('❌ Failed to set up the MCP server:', error);
    });
}
// Handle server shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down server...');
    try {
        console.log(`Closing transport`);
        await transport.close();
    }
    catch (error) {
        console.error(`Error closing transport:`, error);
    }
    try {
        await server.close();
        console.log('✅ Server shutdown complete');
    }
    catch (error) {
        console.error('Error closing server:', error);
    }
    process.exit(0);
});
export default app;
