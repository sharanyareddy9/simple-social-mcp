import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

// Create Express app for Vercel
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Environment validation
function validateEnvironment() {
  const required = ['DESCOPE_PROJECT_ID', 'DESCOPE_MANAGEMENT_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  return {
    isValid: missing.length === 0,
    missing,
    config: {
      projectId: process.env.DESCOPE_PROJECT_ID,
      managementKey: process.env.DESCOPE_MANAGEMENT_KEY ? '***' : undefined,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  };
}

// Simple in-memory storage for demo
const storage = {
  users: new Map(),
  posts: new Map(),
  sessions: new Map()
};

// Initialize demo data
function initializeDemoData() {
  const users = [
    { id: "user-001", name: "Alice Johnson", email: "alice@example.com", bio: "Tech enthusiast" },
    { id: "user-002", name: "Bob Smith", email: "bob@example.com", bio: "Coffee lover" },
    { id: "user-003", name: "Carol Davis", email: "carol@example.com", bio: "Travel blogger" }
  ];

  const posts = [
    { id: "post-001", userId: "user-001", content: "Just deployed my first MCP server!", timestamp: new Date(), likes: 5 },
    { id: "post-002", userId: "user-002", content: "Beautiful sunset today ☀️", timestamp: new Date(), likes: 12 },
    { id: "post-003", userId: "user-003", content: "Exploring the mountains this weekend", timestamp: new Date(), likes: 8 }
  ];

  users.forEach(user => storage.users.set(user.id, user));
  posts.forEach(post => storage.posts.set(post.id, post));

  console.log('✅ Demo data initialized with 3 users and 3 posts');
}

// Initialize data
initializeDemoData();

// Status endpoint
app.get('/', (req, res) => {
  const env = validateEnvironment();
  res.json({
    status: 'ok',
    service: 'Simple Social MCP Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env,
    endpoints: {
      status: '/',
      users: '/users',
      posts: '/posts',
      mcp_oauth: '/oauth2/token',
      mcp_query: '/mcp/social/query'
    }
  });
});

// Social media endpoints
app.get('/users', (req, res) => {
  const users = Array.from(storage.users.values());
  res.json(users);
});

app.get('/posts', (req, res) => {
  const posts = Array.from(storage.posts.values()).map(post => {
    const user = storage.users.get(post.userId);
    return {
      ...post,
      author: user ? user.name : 'Unknown User'
    };
  });
  res.json(posts);
});

app.post('/posts', (req, res) => {
  const { userId, content } = req.body;
  
  if (!userId || !content) {
    return res.status(400).json({ error: 'userId and content required' });
  }

  const user = storage.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const post = {
    id: `post-${Date.now()}`,
    userId,
    content,
    timestamp: new Date(),
    likes: 0
  };

  storage.posts.set(post.id, post);
  
  res.status(201).json({
    ...post,
    author: user.name
  });
});

// MCP OAuth2 endpoint (for Claude Web authentication)
app.post('/oauth2/token', (req, res) => {
  try {
    console.log('🔑 MCP OAuth2 Token Request');
    
    // Check Basic Auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Basic authentication required'
      });
    }
    
    // Decode Basic Auth
    const base64 = authHeader.replace('Basic ', '');
    const credentials = Buffer.from(base64, 'base64').toString('ascii');
    const [clientId, clientSecret] = credentials.split(':');
    
    // Validate client credentials
    const validClientId = process.env.MCP_CLIENT_ID || 'simple_social_mcp_001';
    const validClientSecret = process.env.MCP_CLIENT_SECRET || 'simple_social_secret_2024';
    
    if (clientId !== validClientId || clientSecret !== validClientSecret) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
    }
    
    const { grant_type } = req.body;
    
    // Validate grant type
    if (grant_type !== 'client_credentials') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only client_credentials grant type supported'
      });
    }
    
    // Generate access token
    const accessToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    console.log('✅ Generated MCP access token');
    
    return res.status(200).json({
      token_type: 'Bearer',
      access_token: accessToken,
      expires_in: 86400,
      scope: 'social:read social:write'
    });
    
  } catch (error) {
    console.error('❌ OAuth Token Error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
});

// MCP Social Query endpoint (for Claude Web to call)
app.post('/mcp/social/query', (req, res) => {
  try {
    console.log('🔍 MCP Social Query Request');
    console.log('📋 Request body:', req.body);
    
    // Check Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Bearer token required'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token:', token.substring(0, 20) + '...');
    
    const { query, type } = req.body;
    
    console.log('🔍 Query:', query);
    console.log('🔍 Type:', type);
    
    let result;
    
    if (type === 'users' || (query && query.toLowerCase().includes('user'))) {
      // Return users
      const users = Array.from(storage.users.values());
      result = {
        type: 'users',
        data: users,
        count: users.length
      };
    } else if (type === 'posts' || (query && query.toLowerCase().includes('post'))) {
      // Return posts with author info
      const posts = Array.from(storage.posts.values()).map(post => {
        const user = storage.users.get(post.userId);
        return {
          ...post,
          author: user ? user.name : 'Unknown User'
        };
      });
      result = {
        type: 'posts',
        data: posts,
        count: posts.length
      };
    } else {
      // Return both users and posts
      const users = Array.from(storage.users.values());
      const posts = Array.from(storage.posts.values()).map(post => {
        const user = storage.users.get(post.userId);
        return {
          ...post,
          author: user ? user.name : 'Unknown User'
        };
      });
      
      result = {
        type: 'all',
        data: {
          users,
          posts
        },
        count: {
          users: users.length,
          posts: posts.length
        }
      };
    }
    
    console.log(`✅ Returning social data: ${JSON.stringify(result).substring(0, 100)}...`);
    
    return res.status(200).json({
      success: true,
      result,
      query,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ MCP Query Error:', error);
    return res.status(500).json({
      error: 'server_error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'vercel',
    users: storage.users.size,
    posts: storage.posts.size
  });
});

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Export for Vercel
export default app;