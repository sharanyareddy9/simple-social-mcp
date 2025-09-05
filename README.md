# Simple Social MCP Server

A lightweight Model Context Protocol (MCP) server designed for Claude Web integration with Vercel deployment.

## ✅ Status: Fixed & Working

The MCP server endpoints are now **fully functional** after resolving the 500 FUNCTION_INVOCATION_FAILED error with a simplified, serverless-compatible implementation.

## Features

- 🚀 **Serverless Ready**: Optimized for Vercel deployment
- 🛠️ **MCP Protocol**: Full JSON-RPC 2.0 implementation
- 🔧 **Simple Tools**: Basic user interaction capabilities
- 📱 **Claude Web Compatible**: Direct integration support
- ✅ **500 Error Fixed**: Lightweight implementation without complex dependencies

## Available Tools

- **`greet-user`**: Personalized greeting
  ```json
  { "name": "Alice" }
  ```

- **`get-current-time`**: Server timestamp
  ```json
  {}
  ```

## Quick Deploy

1. **Fork & Deploy**
   ```bash
   git clone https://github.com/sharanyareddy9/simple-social-mcp.git
   cd simple-social-mcp
   npm install
   npx vercel --prod
   ```

2. **Use in Claude Web**
   - **MCP Endpoint**: `https://your-app.vercel.app/api`
   - No authentication required for basic functionality

## Endpoints

- **MCP**: `POST /api` - JSON-RPC 2.0 MCP protocol
- **Health**: `GET /health` - Server status check
- **Home**: `GET /` - Server information page

## Connect to Claude Web

Add this configuration to your Claude Web MCP settings:

```json
{
  "name": "Simple Social MCP",
  "endpoint": "https://your-app.vercel.app/api"
}
```

## Local Development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in your Descope credentials
3. Run locally: `npm run dev`
4. Visit `http://localhost:3001`

## Environment Variables

- `DESCOPE_PROJECT_ID`: Your Descope project ID
- `DESCOPE_ACCESS_KEY`: Your Descope access key  
- `DESCOPE_BASE_URL`: Descope base URL (default: https://auth.descope.io)

## Architecture

- **Serverless**: Built for Vercel serverless functions
- **Authentication**: OAuth 2.1 with Descope social providers
- **Transport**: Server-Sent Events for real-time MCP communication
- **Tools**: Simple utility functions demonstrating MCP capabilities

## License

MIT# simple-social-mcp
