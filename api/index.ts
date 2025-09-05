import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple JSON-RPC MCP server implementation
interface MCPRequest {
    jsonrpc: string;
    method: string;
    params?: any;
    id: string | number | null;
}

interface MCPResponse {
    jsonrpc: string;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
    id: string | number | null;
}

// Helper function to handle MCP requests
function handleMCPRequest(body: MCPRequest): MCPResponse {
    const { method, params, id } = body;

    switch (method) {
        case 'initialize':
            return {
                jsonrpc: '2.0',
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: {
                            listChanged: true
                        }
                    },
                    serverInfo: {
                        name: 'simple-social-mcp',
                        version: '1.0.0'
                    }
                },
                id
            };

        case 'tools/list':
            return {
                jsonrpc: '2.0',
                result: {
                    tools: [
                        {
                            name: 'greet-user',
                            description: 'Greet the authenticated user',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'User name to greet'
                                    }
                                }
                            }
                        },
                        {
                            name: 'get-current-time',
                            description: 'Get the current server time',
                            inputSchema: {
                                type: 'object',
                                properties: {}
                            }
                        }
                    ]
                },
                id
            };

        case 'notifications/initialized':
            // Client has completed initialization
            return {
                jsonrpc: '2.0',
                result: {},
                id
            };

        case 'tools/call':
            const { name, arguments: args } = params || {};
            
            switch (name) {
                case 'greet-user':
                    return {
                        jsonrpc: '2.0',
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: `Hello ${args?.name || 'there'}! Welcome to the Simple Social MCP Server! 👋`
                                }
                            ]
                        },
                        id
                    };
                
                case 'get-current-time':
                    return {
                        jsonrpc: '2.0',
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: `Current server time: ${new Date().toISOString()}`
                                }
                            ]
                        },
                        id
                    };
                
                default:
                    return {
                        jsonrpc: '2.0',
                        error: {
                            code: -32601,
                            message: `Unknown tool: ${name}`
                        },
                        id
                    };
            }

        default:
            return {
                jsonrpc: '2.0',
                error: {
                    code: -32601,
                    message: `Method not found: ${method}`
                },
                id
            };
    }
}

// Main handler function for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const SERVER_URL = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

    // Handle different routes
    const { url, method } = req;
    
    if (url === '/' && method === 'GET') {
        // Home page
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Simple Social MCP Server</title>
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
        .status {
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
        <h1>🚀 Simple Social MCP Server</h1>
        <p>Basic MCP server for Claude Web integration</p>
        
        <div class="status">
            ✅ Server Status: Running<br>
            ✅ MCP Protocol: Supported
        </div>
        
        <h3>Endpoints</h3>
        <div class="endpoint">MCP (SSE): ${SERVER_URL}/sse</div>
        <div class="endpoint">MCP (HTTP): ${SERVER_URL}/api</div>
        <div class="endpoint">Health: ${SERVER_URL}/health</div>
        
        <h3>Available Tools</h3>
        <p>• greet-user - Greet the user</p>
        <p>• get-current-time - Get server time</p>
        
        <h3>Claude Web Integration</h3>
        <p>Use SSE endpoint: <strong>${SERVER_URL}/sse</strong></p>
        
        <p>Ready for Claude Web! 🎉</p>
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
            server: 'Simple Social MCP',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            endpoints: {
                mcp: `${SERVER_URL}/api`,
                health: `${SERVER_URL}/health`
            }
        });
    }

    if (url === '/sse' && method === 'GET') {
        // SSE endpoint for Claude Web MCP integration
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

        // Send initial connection event
        res.write('event: message\n');
        res.write('data: {"jsonrpc":"2.0","method":"server/ready","params":{}}\n\n');

        // Keep connection alive
        const keepAlive = setInterval(() => {
            res.write('event: ping\n');
            res.write('data: {}\n\n');
        }, 30000);

        // Handle client disconnect
        req.on('close', () => {
            clearInterval(keepAlive);
        });

        return;
    }

    if (url === '/sse' && method === 'POST') {
        // Handle MCP requests over SSE
        try {
            const body = req.body as MCPRequest;
            console.log('Received SSE MCP request:', body);

            if (!body || !body.method) {
                return res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32600,
                        message: 'Invalid Request'
                    },
                    id: body?.id || null
                });
            }

            const response = handleMCPRequest(body);
            return res.json(response);

        } catch (error) {
            console.error('Error handling SSE MCP request:', error);
            return res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error'
                },
                id: req.body?.id || null
            });
        }
    }

    if (url === '/api' && method === 'POST') {
        // MCP endpoint - handle JSON-RPC requests
        try {
            const body = req.body as MCPRequest;
            console.log('Received MCP request:', body);

            if (!body || !body.method) {
                return res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32600,
                        message: 'Invalid Request'
                    },
                    id: body?.id || null
                });
            }

            const response = handleMCPRequest(body);
            return res.json(response);

        } catch (error) {
            console.error('Error handling MCP request:', error);
            return res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error'
                },
                id: req.body?.id || null
            });
        }
    }

    if ((url === '/api' || url === '/sse') && method !== 'POST' && method !== 'GET') {
        // Method not allowed for MCP endpoints
        return res.status(405).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Method not allowed. Use POST for MCP requests or GET for SSE.'
            },
            id: null
        });
    }

    // Default 404 for unknown routes
    return res.status(404).json({
        error: 'Not Found',
        message: `Route ${method} ${url} not found`
    });
}