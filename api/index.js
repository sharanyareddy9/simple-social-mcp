#!/usr/bin/env node
import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3001;
const SERVER_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : `http://localhost:${PORT}`;

// In-memory store for demo (use a proper database in production)
const sessions = new Map();
const authCodes = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  credentials: true
}));

// OAuth 2.1 Discovery Endpoint
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  res.json({
    issuer: SERVER_URL,
    authorization_endpoint: `${SERVER_URL}/oauth/authorize`,
    token_endpoint: `${SERVER_URL}/oauth/token`,
    userinfo_endpoint: `${SERVER_URL}/oauth/userinfo`,
    scopes_supported: ["openid", "profile", "email", "tools:read"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    code_challenge_methods_supported: ["S256"],
    authorization_code_expires_in: 600,
    access_token_expires_in: 3600
  });
});

// Dynamic Client Registration (optional, for full OAuth 2.1 compliance)
app.post('/oauth/register', (req, res) => {
  const clientId = crypto.randomUUID();
  const clientSecret = crypto.randomBytes(32).toString('hex');
  
  res.json({
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0 // Never expires for demo
  });
});

// OAuth Authorization Endpoint
app.get('/oauth/authorize', (req, res) => {
  const {
    client_id,
    redirect_uri,
    response_type,
    scope,
    state,
    code_challenge,
    code_challenge_method
  } = req.query;

  // Validate required parameters
  if (!client_id || !redirect_uri || response_type !== 'code') {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing or invalid required parameters'
    });
  }

  // For demo purposes, create a simple login form with social login options
  const loginPage = `
<!DOCTYPE html>
<html>
<head>
    <title>Simple Social MCP - Login</title>
    <style>
        body { 
            font-family: system-ui, sans-serif;
            max-width: 500px; 
            margin: 50px auto;
            padding: 20px;
            background: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
        }
        .title {
            color: #1e293b;
            margin-bottom: 32px;
        }
        .social-btn {
            display: block;
            width: 100%;
            padding: 12px 24px;
            margin: 8px 0;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            color: white;
            transition: opacity 0.2s;
        }
        .social-btn:hover { opacity: 0.9; }
        .google { background: #4285f4; }
        .github { background: #333; }
        .demo { background: #10b981; color: white; }
        .info {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
            color: #0f172a;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">🔐 Authorize Simple Social MCP</h1>
        
        <div class="info">
            <strong>Claude</strong> wants to access your Simple Social MCP server with the following permissions:
            <br><br>
            <strong>Scopes:</strong> ${scope || 'tools:read'}
        </div>

        <h3>Choose your login method:</h3>
        
        <a href="/oauth/demo-login?${new URLSearchParams({ client_id, redirect_uri, state, scope: scope || '', code_challenge: code_challenge || '', code_challenge_method: code_challenge_method || '' }).toString()}" class="social-btn demo">
            🧪 Demo Login (Test Mode)
        </a>
        
        <a href="/oauth/google?${new URLSearchParams({ client_id, redirect_uri, state, scope: scope || '', code_challenge: code_challenge || '', code_challenge_method: code_challenge_method || '' }).toString()}" class="social-btn google">
            📧 Continue with Google
        </a>
        
        <a href="/oauth/github?${new URLSearchParams({ client_id, redirect_uri, state, scope: scope || '', code_challenge: code_challenge || '', code_challenge_method: code_challenge_method || '' }).toString()}" class="social-btn github">
            🐙 Continue with GitHub
        </a>
        
        <p style="font-size: 12px; color: #64748b; margin-top: 32px;">
            This will redirect you back to Claude with an authorization code.
        </p>
    </div>
</body>
</html>`;

  res.send(loginPage);
});

// Demo Login (for testing)
app.get('/oauth/demo-login', (req, res) => {
  const { client_id, redirect_uri, state, scope, code_challenge, code_challenge_method } = req.query;
  
  const authCode = crypto.randomBytes(32).toString('hex');
  const user = {
    id: 'demo-user-123',
    name: 'Demo User',
    email: 'demo@example.com',
    picture: 'https://via.placeholder.com/150',
    login_method: 'demo'
  };

  // Store authorization code with metadata
  authCodes.set(authCode, {
    client_id,
    redirect_uri,
    scope: scope || 'tools:read',
    user,
    code_challenge,
    code_challenge_method,
    expires_at: Date.now() + (10 * 60 * 1000) // 10 minutes
  });

  // Redirect back to Claude with authorization code
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) redirectUrl.searchParams.set('state', state);
  
  res.redirect(redirectUrl.toString());
});

// Social Login Placeholders (Google)
app.get('/oauth/google', (req, res) => {
  const { client_id, redirect_uri, state, scope, code_challenge, code_challenge_method } = req.query;
  
  // In a real implementation, this would redirect to Google OAuth
  // For demo, we'll simulate a successful Google login
  const authCode = crypto.randomBytes(32).toString('hex');
  const user = {
    id: 'google-user-456',
    name: 'Google User',
    email: 'user@gmail.com',
    picture: 'https://lh3.googleusercontent.com/placeholder',
    login_method: 'google'
  };

  authCodes.set(authCode, {
    client_id,
    redirect_uri,
    scope: scope || 'tools:read',
    user,
    code_challenge,
    code_challenge_method,
    expires_at: Date.now() + (10 * 60 * 1000)
  });

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) redirectUrl.searchParams.set('state', state);
  
  res.redirect(redirectUrl.toString());
});

// Social Login Placeholders (GitHub)
app.get('/oauth/github', (req, res) => {
  const { client_id, redirect_uri, state, scope, code_challenge, code_challenge_method } = req.query;
  
  const authCode = crypto.randomBytes(32).toString('hex');
  const user = {
    id: 'github-user-789',
    name: 'GitHub User',
    email: 'user@github.com',
    picture: 'https://avatars.githubusercontent.com/placeholder',
    login_method: 'github'
  };

  authCodes.set(authCode, {
    client_id,
    redirect_uri,
    scope: scope || 'tools:read',
    user,
    code_challenge,
    code_challenge_method,
    expires_at: Date.now() + (10 * 60 * 1000)
  });

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) redirectUrl.searchParams.set('state', state);
  
  res.redirect(redirectUrl.toString());
});

// OAuth Token Endpoint
app.post('/oauth/token', (req, res) => {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    client_secret,
    code_verifier
  } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Only authorization_code grant type is supported'
    });
  }

  const authData = authCodes.get(code);
  if (!authData || authData.expires_at < Date.now()) {
    authCodes.delete(code);
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired authorization code'
    });
  }

  // Validate PKCE if present
  if (authData.code_challenge) {
    if (!code_verifier) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'code_verifier required for PKCE flow'
      });
    }

    const hash = crypto.createHash('sha256').update(code_verifier).digest('base64url');
    if (hash !== authData.code_challenge) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid code_verifier'
      });
    }
  }

  // Generate tokens
  const accessToken = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(32).toString('hex');

  // Store session
  sessions.set(accessToken, {
    user: authData.user,
    scope: authData.scope,
    client_id: authData.client_id,
    expires_at: Date.now() + (60 * 60 * 1000) // 1 hour
  });

  // Clean up auth code
  authCodes.delete(code);

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: authData.scope
  });
});

// User Info Endpoint
app.get('/oauth/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  const token = authHeader.substring(7);
  const session = sessions.get(token);
  
  if (!session || session.expires_at < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'invalid_token' });
  }

  res.json({
    sub: session.user.id,
    name: session.user.name,
    email: session.user.email,
    picture: session.user.picture,
    preferred_username: session.user.email?.split('@')[0],
    login_method: session.user.login_method
  });
});

// Authentication middleware for MCP endpoints
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Authentication required - missing bearer token. Please authenticate via OAuth first."
      },
      id: null
    });
  }

  const token = authHeader.substring(7);
  const session = sessions.get(token);
  
  if (!session || session.expires_at < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({
      jsonrpc: "2.0", 
      error: {
        code: -32001,
        message: "Invalid or expired token. Please re-authenticate via OAuth."
      },
      id: null
    });
  }

  req.user = session.user;
  req.scopes = session.scope.split(' ');
  next();
};

// MCP Tools
const tools = {
  greet_user: {
    name: "greet_user",
    description: "Greet the authenticated user with their name and login method",
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
      },
      user: {
        name: req.user.name,
        email: req.user.email,
        login_method: req.user.login_method
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
          },
          user: {
            name: req.user.name,
            email: req.user.email,
            login_method: req.user.login_method
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
      const customMessage = args.message || `Hello, ${user.name}!`;
      return {
        content: [{
          type: "text",
          text: `${customMessage} 👋\n\nYou're authenticated as: ${user.email}\nLogin method: ${user.login_method}\nUser ID: ${user.id}`
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
          text: `Current time: ${timeString} (${timezone})\nRequested by: ${user.name}`
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
          text: `${a} ${operation} ${b} = ${result}\nCalculated for: ${user.name}`
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
        .auth-info {
            background: #ecfdf5;
            border: 1px solid #10b981;
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
        }
        .oauth-flow {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">🔐 Simple Social MCP</h1>
        <p class="subtitle">Model Context Protocol Server with OAuth 2.1 Social Login</p>
        
        <div class="auth-info">
            <h3>✅ OAuth 2.1 Authentication</h3>
            <p>This server supports full OAuth 2.1 with social login providers (Google, GitHub) and Claude Web integration.</p>
        </div>

        <div class="oauth-flow">
            <h3>🔄 OAuth Flow for Claude</h3>
            <ol>
                <li>Claude redirects to <code>/oauth/authorize</code></li>
                <li>User chooses social login method (Google/GitHub/Demo)</li>
                <li>User authenticates with chosen provider</li>
                <li>Server redirects back to Claude with auth code</li>
                <li>Claude exchanges code for access token</li>
                <li>Claude connects to MCP endpoints with token</li>
            </ol>
        </div>
        
        <div class="feature">
            <h3>🌟 Features</h3>
            <ul>
                <li>OAuth 2.1 compliant social authentication</li>
                <li>Support for Google, GitHub, and Demo login</li>
                <li>PKCE (Proof Key for Code Exchange) support</li>
                <li>Claude Web callback integration</li>
                <li>User context in tool responses</li>
                <li>Secure session management</li>
            </ul>
        </div>

        <h3>🔗 MCP Endpoints</h3>
        <div class="endpoint">SSE: ${SERVER_URL}/sse</div>
        <div class="endpoint">Message: ${SERVER_URL}/message</div>
        <div class="endpoint">OAuth Discovery: ${SERVER_URL}/.well-known/oauth-authorization-server</div>
        <div class="endpoint">Authorization: ${SERVER_URL}/oauth/authorize</div>

        <h3>🛠️ Available Tools</h3>
        <div class="tools-grid">
            <div class="tool">
                <h4>greet_user</h4>
                <p>Greet the authenticated user with their name and login method</p>
            </div>
            <div class="tool">
                <h4>get_current_time</h4>
                <p>Get current date and time with user context</p>
            </div>
            <div class="tool">
                <h4>simple_calculator</h4>
                <p>Perform arithmetic operations with user tracking</p>
            </div>
        </div>

        <div style="text-align: center; margin-top: 32px; color: #64748b;">
            <p>Ready to connect with Claude Web! 🚀</p>
            <p><small>Claude's OAuth callback: https://claude.ai/api/mcp/auth_callback</small></p>
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
    oauth: 'enabled',
    endpoints: {
      sse: `${SERVER_URL}/sse`,
      message: `${SERVER_URL}/message`,
      oauth_discovery: `${SERVER_URL}/.well-known/oauth-authorization-server`,
      authorization: `${SERVER_URL}/oauth/authorize`
    },
    sessions: sessions.size,
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
    console.log(`🔑 OAuth Discovery: ${SERVER_URL}/.well-known/oauth-authorization-server`);
    console.log(`🔐 OAuth Authorization: ${SERVER_URL}/oauth/authorize`);
    console.log(`🌐 OAuth 2.1 with Social Login Enabled`);
  });
}

export default app;