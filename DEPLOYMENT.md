# Vercel Deployment Guide

## Fixed Issues

The following deployment issues have been resolved:

1. **Mixed TypeScript/JavaScript files** - Removed duplicate JS files, using TypeScript as source
2. **Missing dependencies** - Added `@descope/mcp-express`, `zod`, and TypeScript dev dependencies
3. **Incorrect build configuration** - Updated `vercel.json` with proper build commands
4. **No build process** - Added TypeScript compilation with `tsc`
5. **Serverless compatibility** - Modified server initialization for Vercel's serverless environment

## Deployment Steps

### 1. Environment Variables

Set these environment variables in your Vercel dashboard:

```bash
DESCOPE_PROJECT_ID=your_descope_project_id_here
DESCOPE_MANAGEMENT_KEY=your_descope_management_key_here
NODE_ENV=production
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

### 3. Verify Deployment

After deployment, your MCP server will be available at:

- **Main endpoint**: `https://your-app.vercel.app/`
- **SSE endpoint**: `https://your-app.vercel.app/sse`
- **Health check**: `https://your-app.vercel.app/health`
- **OAuth discovery**: `https://your-app.vercel.app/.well-known/oauth-authorization-server`

## Configuration Files

### vercel.json
- Configured with TypeScript build command
- Set to use Node.js 22.x runtime
- Proper routing for serverless functions

### package.json
- Added all required dependencies
- Updated build scripts for TypeScript compilation
- Set Node.js engine to 22.x for Vercel compatibility

### tsconfig.json
- Configured for ES2022 target with ESNext modules
- Proper module resolution for Node.js environment
- Excludes test files and compiled JavaScript

## Local Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev
```

## Troubleshooting

### Build Failures
- Ensure all TypeScript files compile without errors
- Check that all dependencies are properly installed
- Verify Node.js version compatibility (22.x)

### Runtime Errors
- Check environment variables are set correctly
- Verify Descope project configuration
- Check Vercel function logs for detailed error messages

### Authentication Issues
- Ensure DESCOPE_PROJECT_ID and DESCOPE_MANAGEMENT_KEY are set
- Verify Descope project is properly configured for OAuth
- Check that redirect URIs match your Vercel domain