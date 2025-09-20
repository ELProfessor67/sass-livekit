# Pinecone Setup Guide

## Required Environment Variables

Add this to your `.env` file:

```env
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
```

## How to Get Pinecone Credentials

### 1. Create Pinecone Account
1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Sign up for a free account
3. Create a new project

### 2. Get API Key
1. In your Pinecone project dashboard
2. Go to "API Keys" section
3. Copy your API key

### 3. SDK Version
The latest Pinecone SDK (v6.x) automatically handles environment detection, so you only need the API key.

## Testing Your Setup

After setting up your environment variables, test the connection:

```bash
# Start your server
npm run backend

# The server should start without Pinecone errors
# Check the console for any Pinecone-related messages
```

## Troubleshooting

### Error: "The client configuration must have required property: environment"
- This error occurs with older Pinecone SDK versions (v1.x-v5.x)
- Make sure you have the latest version: `npm install @pinecone-database/pinecone@latest`
- The latest version (v6.x) only requires `apiKey`

### Error: "Invalid API key"
- Verify your `PINECONE_API_KEY` is correct
- Make sure there are no extra spaces or characters
- Check that the API key is from the correct Pinecone project

### Error: "Module not found" or import errors
- Make sure you've installed the package: `npm install @pinecone-database/pinecone`
- Restart your server after installation
