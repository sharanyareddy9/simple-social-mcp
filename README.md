# Simple Social MCP Server

A lightweight Model Context Protocol (MCP) server with social login integration, designed for Claude Web. Built with Descope authentication and deployable on Vercel.

## Features

- 🔐 Social login via Descope (Google, GitHub, etc.)
- 🌐 OAuth 2.1 compliant authentication
- 🛠️ Simple utility tools for Claude
- 🚀 Vercel-ready serverless deployment
- 📡 Server-Sent Events (SSE) transport

## Available Tools

- **greet_user**: Greet the authenticated user with their name
- **get_current_time**: Get current date and time in specified timezone  
- **simple_calculator**: Perform basic arithmetic operations

## Quick Setup

### 1. Setup Descope

1. Create a free account at [Descope](https://descope.io)
2. Create a new project and note your Project ID
3. Generate an Access Key in the project settings
4. Configure social providers (Google, GitHub, etc.) in the authentication methods

### 2. Deploy to Vercel

1. Clone this repository
2. Deploy to Vercel: `vercel deploy`
3. Set environment variables in Vercel dashboard:
   - `DESCOPE_PROJECT_ID`: Your Descope project ID
   - `DESCOPE_ACCESS_KEY`: Your Descope access key

### 3. Connect to Claude Web

Once deployed, your MCP server will be available at:
- **SSE Endpoint**: `https://your-app.vercel.app/sse`
- **OAuth Metadata**: `https://your-app.vercel.app/.well-known/oauth-authorization-server`

Add this configuration to your Claude Web MCP settings:

```json
{
  "name": "Simple Social MCP",
  "endpoint": "https://your-app.vercel.app/sse",
  "auth": {
    "type": "oauth",
    "authorization_url": "https://your-app.vercel.app/oauth/authorize",
    "token_url": "https://your-app.vercel.app/oauth/token",
    "client_id": "claude-web",
    "scopes": ["openid", "profile", "email", "tools:read"]
  }
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
