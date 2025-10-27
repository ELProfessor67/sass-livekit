# Web Call Setup Guide

## Issue: Agent Not Joining Web Calls

The LiveKit agent worker must be running separately to join web calls. Follow these steps:

## Step 1: Start the Agent Worker

The agent worker is a Python process that listens for LiveKit room events and joins when dispatched.

### Option A: Run with CLI (Development)
```bash
cd sass-livekit/livekit

# Install dependencies first
pip install -r requirements.txt

# Run the agent worker
livekit-agents dev main.py
```

### Option B: Run with Python directly
```bash
cd sass-livekit/livekit

# Install dependencies first
pip install -r requirements.txt

# Run the agent worker
python main.py dev
```

## Step 2: Required Environment Variables

Create a `.env` file in the `sass-livekit/livekit/` directory with:

```env
# LiveKit Configuration
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Agent Configuration
LK_AGENT_NAME=ai

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE=your-service-role-key

# OpenAI Configuration
OPENAI_API_KEY=your-openai-key

# Optional: Other LLM providers
GROQ_API_KEY=your-groq-key
DEEPGRAM_API_KEY=your-deepgram-key
ELEVENLABS_API_KEY=your-elevenlabs-key
```

## Step 3: Verify the Setup

1. **Start the backend server:**
   ```bash
   cd sass-livekit/server
   npm start
   ```

2. **Start the agent worker** (in a separate terminal):
   ```bash
   cd sass-livekit/livekit
   livekit-agents dev main.py
   ```
   
   You should see output like:
   ```
   🤖 Agent name: ai
   Listening for jobs on ws://localhost:7880...
   ```

3. **Start the frontend:**
   ```bash
   cd sass-livekit
   npm run dev
   ```

## Step 4: Test Web Call

1. Navigate to `/assistants` in your browser
2. Click on an assistant card to open details
3. Click **"Start Call"** button
4. Click **"Start Call"** on the VoiceAgent page
5. The agent should join automatically within a few seconds

## Troubleshooting

### Agent Not Joining?

1. **Check if agent is running:**
   Look for agent worker output showing it's listening for jobs

2. **Check LiveKit connection:**
   ```bash
   # In the agent worker terminal, you should see connection logs
   ```

3. **Check room creation:**
   ```bash
   # Check backend server logs for:
   # "Room 'room-name' created with agent dispatch"
   ```

4. **Verify agent name:**
   The agent name in your environment should match what's being dispatched (default: "ai")

5. **Check room metadata:**
   The room should have metadata with `source: "web"` and `assistantId`

### Common Issues

- **"No agent found"**: Agent worker is not running
- **"Connection timeout"**: LiveKit server is not accessible
- **"Authentication failed"**: API key/secret mismatch
- **"Room not found"**: Room wasn't created before dispatch

## How It Works

1. User clicks "Start Call" → Frontend creates token with `dispatch` metadata
2. Backend creates LiveKit room with metadata including `assistantId`
3. Backend calls LiveKit dispatch API to trigger agent to join
4. Agent worker receives dispatch event and joins the room
5. Agent loads assistant configuration from database
6. Agent connects audio and starts conversation

## Development Mode

For development, you can also use:
```bash
# Development mode with hot reload
livekit-agents dev main.py --log-level debug
```

This will show detailed logs of all agent activity including room joins and dispatch events.
