#!/bin/bash

echo "Starting LiveKit Agent Setup..."
echo

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    python3 setup-livekit-agent.py
    echo
    echo "Please edit .env file with your actual credentials before continuing."
    echo "Press Enter to continue after editing .env..."
    read
fi

# Check if Python dependencies are installed
echo "Checking Python dependencies..."
cd livekit
python3 -c "import livekit, livekit.agents, livekit.plugins.openai, livekit.plugins.silero, supabase, dotenv" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing missing dependencies..."
    pip3 install livekit-agents livekit-plugins-openai livekit-plugins-silero supabase python-dotenv
fi

# Start the agent
echo
echo "Starting LiveKit Agent..."
echo "Press Ctrl+C to stop"
echo
python3 main.py
