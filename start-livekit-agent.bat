@echo off
echo Starting LiveKit Agent Setup...
echo.

REM Check if .env file exists
if not exist .env (
    echo Creating .env file...
    python setup-livekit-agent.py
    echo.
    echo Please edit .env file with your actual credentials before continuing.
    echo Press any key to continue after editing .env...
    pause >nul
)

REM Check if Python dependencies are installed
echo Checking Python dependencies...
cd livekit
python -c "import livekit, livekit.agents, livekit.plugins.openai, livekit.plugins.silero, supabase, dotenv" 2>nul
if errorlevel 1 (
    echo Installing missing dependencies...
    pip install livekit-agents livekit-plugins-openai livekit-plugins-silero supabase python-dotenv
)

REM Start the agent
echo.
echo Starting LiveKit Agent...
echo Press Ctrl+C to stop
echo.
python main.py
