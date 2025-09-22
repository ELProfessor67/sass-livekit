"""
LiveKit Voice Agent - Main Entry Point

This is the main entry point for the LiveKit voice agent system.
It initializes the system and starts processing calls.
"""

import logging
import os
from livekit import agents

from config.settings import get_settings
from core.call_processor import CallProcessor
from utils.logging_config import setup_logging


async def entrypoint(ctx: agents.JobContext):
    """
    Main entry point for LiveKit agent jobs.
    
    Args:
        ctx: LiveKit job context
    """
    # Get settings and setup logging
    settings = get_settings()
    setup_logging(settings.log_level)
    
    logger = logging.getLogger(__name__)
    logger.info(f"AGENT_START | room={ctx.room.name} | job_id={ctx.job.id}")
    
    try:
        # Initialize call processor
        processor = CallProcessor()
        
        # Process the call
        await processor.process_call(ctx)
        
    except Exception as e:
        logger.error(f"AGENT_ERROR | room={ctx.room.name} | error={str(e)}", exc_info=True)
        raise


def prewarm(proc: agents.JobProcess):
    """
    Prewarm the agent process.
    
    Args:
        proc: LiveKit job process
    """
    try:
        from livekit.plugins import silero
        proc.userdata["vad"] = silero.VAD.load()
        logging.info("VAD_PREWARMED | Silero VAD loaded successfully")
    except Exception as e:
        logging.error(f"VAD_PREWARM_ERROR | error={str(e)}", exc_info=True)


if __name__ == "__main__":
    # Check required environment variables
    required_vars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("Please set these variables in your .env file or environment")
        exit(1)
    
    # Start the agent
    agents.run(entrypoint, prewarm=prewarm)
