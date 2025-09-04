#!/usr/bin/env node
import "dotenv/config";
import express from "express";
import cors from "cors";
import DescopeClient from "@descope/node-sdk";
import { z } from "zod";

const app = express();
const PORT = process.env.PORT || 3001;
const SERVER_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : `https://localhost:${PORT}`;

// Initialize Descope client
const descopeClient = DescopeClient({
  projectId: process.env.DESCOPE_PROJECT_ID,
  baseUrl: process.env.DESCOPE_BASE_URL,
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  credentials: true
}));

// Simple authentication middleware
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Authentication required - missing or invalid bearer token"
      },
      id: null
    });
  }

  const token = authHeader.substring(7);
  
  try {
    const authInfo = await descopeClient.validateSession(token);
    req.user = authInfo;
    next();
  } catch (error) {
    return res.status(401).json({
      jsonrpc: "2.0", 
      error: {
        code: -32001,
        message: `Authentication failed: ${error.message}`
      },
      id: null
    });
  }
};

// OAuth endpoints for social login
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  res.json({
    issuer: SERVER_URL,
    authorization_endpoint: `${SERVER_URL}/oauth/authorize`,
    token_endpoint: `${SERVER_URL}/oauth/token`,
    userinfo_endpoint: `${SERVER_URL}/oauth/userinfo`,
    scopes_supported: ["openid", "profile", "email", "tools:read"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    code_challenge_methods_supported: ["S256"]
  });
});

app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, scope, state, code_challenge, code_challenge_method } = req.query;
  
  // Redirect to Descope OAuth with social providers
  const descopeAuthUrl = `https://auth.descope.io/oauth2/v1/auth` +
    `?client_id=${process.env.DESCOPE_PROJECT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&response_type=code` +
    `&state=${state}` +
    `${code_challenge ? `&code_challenge=${code_challenge}` : ''}` +
    `${code_challenge_method ? `&code_challenge_method=${code_challenge_method}` : ''}`;
  
  res.redirect(descopeAuthUrl);
});

app.post('/oauth/token', async (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier } = req.body;
  
  try {
    // Exchange authorization code for access token using Descope
    const tokenResponse = await fetch('https://auth.descope.io/oauth2/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type,
        code,
        redirect_uri,
        client_id: process.env.DESCOPE_PROJECT_ID,
        client_secret: process.env.DESCOPE_ACCESS_KEY,
        ...(code_verifier && { code_verifier })
      })
    });
    
    const tokenData = await tokenResponse.json();
    res.json(tokenData);
  } catch (error) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: error.message
    });
  }
});

app.get('/oauth/userinfo', authenticate, (req, res) => {
  res.json({
    sub: req.user.userId,
    name: req.user.name || 'User',
    email: req.user.email,
    picture: req.user.picture,
    preferred_username: req.user.loginIds?.[0]
  });
});

// MCP Tools
const tools = {
  greet_user: {
    name: "greet_user",
    description: "Greet the authenticated user with their name",
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
  },
  
  simple_calculator: {
    name: "simple_calculator",
    description: "Perform basic arithmetic operations",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string", 
          enum: ["add", "subtract", "multiply", "divide"],
          description: "Arithmetic operation to perform"
        },
        a: {
          type: "number",
          description: "First number"
        },
        b: {
          type: "number", 
          description: "Second number"
        }
      },
      required: ["operation", "a", "b"]
    }
  }
};

// MCP Server-Sent Events endpoint
app.get('/sse', authenticate, (req, res) => {
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
        name: "Simple Social MCP",
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

// MCP Message endpoint
app.post('/message', authenticate, async (req, res) => {
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
            name: "Simple Social MCP",
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
        result = await handleToolCall(name, args || {}, req.user);
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

// Tool execution handler
async function handleToolCall(toolName, args, user) {
  switch (toolName) {
    case 'greet_user':
      const customMessage = args.message || `Hello, ${user.name || 'there'}!`;
      return {
        content: [{
          type: "text",
          text: `${customMessage} You're authenticated as: ${user.email}`
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

    case 'simple_calculator':
      const { operation, a, b } = args;
      let result;
      
      switch (operation) {
        case 'add': result = a + b; break;
        case 'subtract': result = a - b; break;
        case 'multiply': result = a * b; break;
        case 'divide': 
          if (b === 0) throw new Error("Division by zero");
          result = a / b; 
          break;
        default: throw new Error(`Unknown operation: ${operation}`);
      }
      
      return {
        content: [{
          type: "text",
          text: `${a} ${operation} ${b} = ${result}`
        }]
      };

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Home page
app.get('/', (req, res) => {
  const homePage = `
<!DOCTYPE html>
<html>
<head>
    <title>Simple Social MCP Server</title>
    <style>
        body { 
            font-family: system-ui, sans-serif;
            max-width: 800px; 
            margin: 0 auto;
            padding: 40px 20px;
            background: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 16px;
            text-align: center;
        }
        .subtitle {
            color: #64748b;
            text-align: center;
            margin-bottom: 32px;
        }
        .feature {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin: 16px 0;
            border-left: 4px solid #3b82f6;
        }
        .endpoint {
            background: #1e293b;
            color: #e2e8f0;
            padding: 16px;
            border-radius: 8px;
            font-family: monospace;
            margin: 8px 0;
        }
        .tools-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
            margin: 24px 0;
        }
        .tool {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 16px;
            border-radius: 8px;
        }
        .tool h4 {
            margin: 0 0 8px 0;
            color: #1e293b;
        }
        .tool p {
            margin: 0;
            color: #64748b;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">🔐 Simple Social MCP</h1>
        <p class="subtitle">Model Context Protocol Server with Social Login</p>
        
        <div class="feature">
            <h3>🌟 Features</h3>
            <ul>
                <li>Social login via Descope (Google, GitHub, etc.)</li>
                <li>OAuth 2.1 compliant authentication</li>
                <li>Simple utility tools for Claude</li>
                <li>Vercel-ready serverless deployment</li>
            </ul>
        </div>

        <h3>🔗 MCP Endpoints</h3>
        <div class="endpoint">SSE: ${SERVER_URL}/sse</div>
        <div class="endpoint">Message: ${SERVER_URL}/message</div>
        <div class="endpoint">OAuth: ${SERVER_URL}/.well-known/oauth-authorization-server</div>

        <h3>🛠️ Available Tools</h3>
        <div class="tools-grid">
            <div class="tool">
                <h4>greet_user</h4>
                <p>Greet the authenticated user with their name</p>
            </div>
            <div class="tool">
                <h4>get_current_time</h4>
                <p>Get current date and time in specified timezone</p>
            </div>
            <div class="tool">
                <h4>simple_calculator</h4>
                <p>Perform basic arithmetic operations</p>
            </div>
        </div>

        <div style="text-align: center; margin-top: 32px; color: #64748b;">
            <p>Ready to connect with Claude Web! 🚀</p>
        </div>
    </div>
</body>
</html>`;
  
  res.send(homePage);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'Simple Social MCP',
    version: '1.0.0',
    endpoints: {
      sse: `${SERVER_URL}/sse`,
      message: `${SERVER_URL}/message`,
      oauth: `${SERVER_URL}/.well-known/oauth-authorization-server`
    },
    timestamp: new Date().toISOString()
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Simple Social MCP Server running on port ${PORT}`);
    console.log(`📍 Server URL: ${SERVER_URL}`);
    console.log(`🔌 SSE Endpoint: ${SERVER_URL}/sse`);
    console.log(`💬 Message Endpoint: ${SERVER_URL}/message`);
    console.log(`🔑 OAuth: ${SERVER_URL}/.well-known/oauth-authorization-server`);
  });
}

export default app;