#!/usr/bin/env node
import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3001;
const SERVER_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : `http://localhost:${PORT}`;

// Load Descope credentials
const DESCOPE_PROJECT_ID = process.env.DESCOPE_PROJECT_ID;
const DESCOPE_MANAGEMENT_KEY = process.env.DESCOPE_MANAGEMENT_KEY;

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  credentials: true
}));

// MCP Tools (without authentication for testing)
const tools = {
  greet_user: {
    name: "greet_user",
    description: "Simple greeting tool",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Optional custom greeting message"
        }
      }
    }
  },
  
  get_current_time: {
    name: "get_current_time", 
    description: "Get the current date and time",
    inputSchema: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "Timezone (e.g., 'UTC', 'America/New_York')"
        }
      }
    }
  }
};

// OAuth Authorization endpoint
app.get('/oauth/authorize', (req, res) => {
  if (!DESCOPE_PROJECT_ID) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'DESCOPE_PROJECT_ID not configured'
    });
  }

  const { client_id, redirect_uri, state, code_challenge, code_challenge_method } = req.query;

  if (!client_id || !redirect_uri) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Redirect to Descope authentication
  const descopeAuthUrl = `https://auth.descope.io/${DESCOPE_PROJECT_ID}/oauth2/authorize` +
    `?client_id=${encodeURIComponent(client_id)}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&response_type=code` +
    `&scope=openid profile email` +
    (state ? `&state=${encodeURIComponent(state)}` : '') +
    (code_challenge ? `&code_challenge=${encodeURIComponent(code_challenge)}` : '') +
    (code_challenge_method ? `&code_challenge_method=${encodeURIComponent(code_challenge_method)}` : '');

  return res.redirect(302, descopeAuthUrl);
});

// OAuth Token endpoint
app.post('/oauth/token', async (req, res) => {
  if (!DESCOPE_PROJECT_ID) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'DESCOPE_PROJECT_ID not configured'
    });
  }

  const { code, client_id, redirect_uri, code_verifier } = req.body;

  if (!code || !client_id) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Exchange code for token with Descope
    const tokenResponse = await fetch(`https://auth.descope.io/${DESCOPE_PROJECT_ID}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id,
        redirect_uri,
        code_verifier
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(400).json({ error: 'Token exchange failed', details: tokenData });
    }

    return res.status(200).json(tokenData);

  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// MCP Server-Sent Events endpoint (with auth)
app.get('/sse', (req, res) => {
  if (!DESCOPE_PROJECT_ID || !DESCOPE_MANAGEMENT_KEY) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Environment variables not configured. Please set DESCOPE_PROJECT_ID and DESCOPE_MANAGEMENT_KEY.'
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required - missing bearer token. Please authenticate via OAuth first.',
      oauth: {
        authorize: `${SERVER_URL}/oauth/authorize`,
        token: `${SERVER_URL}/oauth/token`
      }
    });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Cache-Control'
  });

  const initialMessage = {
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {
      protocolVersion: "2025-03-26",
      serverInfo: {
        name: "Simple MCP with Auth",
        version: "1.0.0"
      },
      capabilities: {
        tools: Object.keys(tools)
      }
    }
  };

  res.write(`data: ${JSON.stringify(initialMessage)}\n\n`);

  req.on('close', () => {
    res.end();
  });
});

// Simple MCP Message endpoint (no auth)
app.post('/message', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== "2.0") {
    return res.json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid Request" },
      id
    });
  }

  try {
    let result;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: {
            name: "Simple MCP",
            version: "1.0.0"
          }
        };
        break;

      case 'tools/list':
        result = {
          tools: Object.values(tools)
        };
        break;

      case 'tools/call':
        const { name, arguments: args } = params;
        result = await handleToolCall(name, args || {});
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    res.json({
      jsonrpc: "2.0",
      result,
      id
    });

  } catch (error) {
    res.json({
      jsonrpc: "2.0", 
      error: {
        code: -32603,
        message: error.message
      },
      id
    });
  }
});

// Tool execution handler (no auth)
async function handleToolCall(toolName, args) {
  switch (toolName) {
    case 'greet_user':
      const customMessage = args.message || "Hello there!";
      return {
        content: [{
          type: "text",
          text: `${customMessage} 👋\n\nThis is a simple MCP server without authentication.`
        }]
      };

    case 'get_current_time':
      const timezone = args.timezone || 'UTC';
      const now = new Date();
      const timeString = timezone === 'UTC' 
        ? now.toISOString() 
        : now.toLocaleString('en-US', { timeZone: timezone });
      
      return {
        content: [{
          type: "text",
          text: `Current time: ${timeString} (${timezone})`
        }]
      };

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Simple MCP Server</title>
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
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Simple MCP Server</h1>
        <p>Basic MCP server without authentication for testing</p>
        
        <h3>Endpoints</h3>
        <div class="endpoint">SSE: ${SERVER_URL}/sse</div>
        <div class="endpoint">Message: ${SERVER_URL}/message</div>
        
        <p>Ready for Claude Web testing! 🚀</p>
    </div>
</body>
</html>`);
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'Simple MCP',
    version: '1.0.0',
    auth: 'none',
    endpoints: {
      sse: `${SERVER_URL}/sse`,
      message: `${SERVER_URL}/message`
    },
    timestamp: new Date().toISOString()
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Simple MCP Server running on port ${PORT}`);
    console.log(`📍 Server URL: ${SERVER_URL}`);
    console.log(`🔌 SSE Endpoint: ${SERVER_URL}/sse`);
    console.log(`💬 Message Endpoint: ${SERVER_URL}/message`);
    console.log(`✅ No Authentication Required`);
  });
}

export default app;