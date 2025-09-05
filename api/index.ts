import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { descopeMcpAuthRouter, descopeMcpBearerAuth } from '@descope/mcp-express';
import { createServer } from './create-server.js';

// Initialize Express app for Vercel
const app = express();

// Middleware setup
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: '*',
    allowedHeaders: 'Authorization, Origin, Content-Type, Accept, mcp-protocol-version, *',
    credentials: true
}));

// Auth middleware - OAuth endpoints
app.use(descopeMcpAuthRouter());
app.use(['/api'], descopeMcpBearerAuth());

// Initialize MCP server and transport
const { server } = createServer();
const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless for serverless
});

// Connect server to transport
let serverInitialized = false;
const initializeServer = async () => {
    if (!serverInitialized) {
        try {
            await server.connect(transport);
            serverInitialized = true;
            console.log('✅ MCP Server connected successfully');
        } catch (error) {
            console.error('❌ Failed to connect MCP server:', error);
            throw error;
        }
    }
};

// Main handler function for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const SERVER_URL = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

    // Initialize server on first request
    await initializeServer();

    // Handle different routes
    const { url, method } = req;
    
    if (url === '/' && method === 'GET') {
        // Home page
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
        .env-status {
            background: ${process.env.DESCOPE_PROJECT_ID ? '#065f46' : '#dc2626'};
            color: ${process.env.DESCOPE_PROJECT_ID ? '#d1fae5' : '#fecaca'};
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
        
        <div class="env-status">
            ${process.env.DESCOPE_PROJECT_ID
                ? '✅ Descope Configuration: Ready'
                : '❌ Descope Configuration: Missing DESCOPE_PROJECT_ID'}
        </div>
        
        <h3>Endpoints</h3>
        <div class="endpoint">MCP: ${SERVER_URL}/api</div>
        <div class="endpoint">OAuth Discovery: ${SERVER_URL}/.well-known/oauth-authorization-server</div>
        <div class="endpoint">Authorization: ${SERVER_URL}/authorize</div>
        <div class="endpoint">Registration: ${SERVER_URL}/register</div>
        
        <h3>Setup Instructions</h3>
        <p>1. Set DESCOPE_PROJECT_ID and DESCOPE_MANAGEMENT_KEY in Vercel environment variables</p>
        <p>2. Configure your Descope project with social providers</p>
        <p>3. Use the MCP endpoint in Claude Web: ${SERVER_URL}/api</p>
        
        <p>Ready for Claude Web with social authentication! 🚀</p>
    </div>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
    }

    if (url === '/health' && method === 'GET') {
        // Health endpoint
        return res.json({
            status: 'healthy',
            server: 'Social MCP',
            version: '1.0.0',
            auth: 'descope-oauth',
            package: '@descope/mcp-express',
            environment: {
                descope_configured: !!process.env.DESCOPE_PROJECT_ID,
                vercel_url: process.env.VERCEL_URL || 'localhost'
            },
            endpoints: {
                mcp: `${SERVER_URL}/api`,
                oauth_discovery: `${SERVER_URL}/.well-known/oauth-authorization-server`,
                authorize: `${SERVER_URL}/authorize`,
                register: `${SERVER_URL}/register`
            },
            timestamp: new Date().toISOString()
        });
    }

    if (url === '/api' && method === 'POST') {
        // MCP endpoint
        console.log('Received MCP request:', req.body);
        try {
            // Create Express-like request/response objects for the transport
            const expressReq = {
                ...req,
                body: req.body,
                headers: req.headers,
                method: req.method,
                url: req.url
            } as any;

            const expressRes = {
                ...res,
                json: (data: any) => res.json(data),
                status: (code: number) => ({ json: (data: any) => res.status(code).json(data) }),
                send: (data: any) => res.send(data),
                setHeader: (name: string, value: string) => res.setHeader(name, value),
                headersSent: false
            } as any;

            await transport.handleRequest(expressReq, expressRes, req.body);
        } catch (error) {
            console.error('Error handling MCP request:', error);
            return res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
        return;
    }

    if (url === '/api' && method !== 'POST') {
        // Method not allowed for MCP endpoint
        return res.status(405).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Method not allowed. Use POST for MCP requests.'
            },
            id: null
        });
    }

    // Handle OAuth routes through Express app
    return new Promise((resolve) => {
        app(req as any, res as any, resolve);
    });
}