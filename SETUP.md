# 🔒 Social MCP Server Setup Guide

This guide will help you set up the Social MCP Server with Descope authentication for use with Claude Web.

## 📋 Prerequisites

1. **Descope Account**: Sign up at [descope.com](https://descope.com)
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Claude Web Access**: Ensure you have access to Claude Web

## 🚀 Step 1: Descope Configuration

### 1.1 Create a Descope Project

1. Go to [Descope Console](https://app.descope.com)
2. Create a new project or select an existing one
3. Note your **Project ID** (found in Project Settings)

### 1.2 Generate Management Key

1. In Descope Console, go to **Company Settings** → **Management Keys**
2. Click **Generate New Key**
3. Give it a name like "MCP Server"
4. Copy the **Management Key** (keep it secure!)

### 1.3 Configure Social Providers

1. Go to **Authentication** → **Social** in Descope Console
2. Enable the social providers you want (Google, GitHub, Microsoft, etc.)
3. Configure each provider with your OAuth app credentials
4. Set redirect URLs to include your Vercel domain

### 1.4 Configure OAuth Settings

1. Go to **Authentication** → **OAuth**
2. Add your Vercel domain to **Allowed Origins**
3. Set **Redirect URIs** to include:
   - `https://your-app.vercel.app/callback`
   - `https://your-app.vercel.app/authorize`

## 🌐 Step 2: Vercel Deployment

### 2.1 Deploy to Vercel

1. Fork this repository to your GitHub account
2. Connect your GitHub account to Vercel
3. Import this project in Vercel
4. Deploy the project

### 2.2 Configure Environment Variables

In your Vercel project dashboard, go to **Settings** → **Environment Variables** and add:

```
DESCOPE_PROJECT_ID=your_project_id_here
DESCOPE_MANAGEMENT_KEY=your_management_key_here
```

### 2.3 Redeploy

After adding environment variables, trigger a new deployment to apply the changes.

## 🔧 Step 3: Claude Web Configuration

### 3.1 Get Your MCP Server URL

Your MCP server will be available at:
```
https://your-app.vercel.app/api
```

### 3.2 Add to Claude Web

1. Open Claude Web
2. Go to MCP Server settings
3. Add a new server with:
   - **Name**: Social MCP Server
   - **URL**: `https://your-app.vercel.app/api`
   - **Authentication**: OAuth 2.1

### 3.3 Authorize the Connection

1. Claude Web will redirect you to Descope for authentication
2. Choose your preferred social login method
3. Grant permissions to the MCP server
4. You'll be redirected back to Claude Web

## 🧪 Step 4: Testing

### 4.1 Verify Deployment

Visit your deployed app at `https://your-app.vercel.app` to see:
- ✅ Server status
- ✅ Descope configuration status
- 📋 Available endpoints

### 4.2 Test MCP Tools

In Claude Web, try using these MCP tools:
- `greet-user`: Simple greeting with authentication confirmation
- `get-current-time`: Get current time with timezone support
- `get-user-info`: Display authentication status

## 🔍 Troubleshooting

### Common Issues

1. **"Descope Configuration: Missing"**
   - Check that `DESCOPE_PROJECT_ID` is set in Vercel environment variables
   - Redeploy after adding environment variables

2. **OAuth Redirect Errors**
   - Verify redirect URIs in Descope Console match your Vercel domain
   - Check that social providers are properly configured

3. **MCP Connection Failed**
   - Ensure the MCP endpoint URL is correct: `https://your-app.vercel.app/api`
   - Check that the server is deployed and running

4. **Authentication Errors**
   - Verify `DESCOPE_MANAGEMENT_KEY` is correct and has proper permissions
   - Check Descope project settings and social provider configurations

### Debug Information

Visit `https://your-app.vercel.app/health` for detailed server status and configuration information.

## 📚 Additional Resources

- [Descope Documentation](https://docs.descope.com)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Vercel Deployment Guide](https://vercel.com/docs)

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Vercel function logs for error details
3. Verify all environment variables are correctly set
4. Ensure Descope project is properly configured

---

🎉 **Congratulations!** Your Social MCP Server with Descope authentication is now ready for use with Claude Web!