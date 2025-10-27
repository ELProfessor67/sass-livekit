"""
Configuration for REST API LLM handling
This file contains settings and utilities for managing REST API vs WebSocket LLM connections
"""

import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class RestAPIConfig:
    """Configuration class for REST API LLM handling"""
    
    def __init__(self):
        self.use_rest_api = os.getenv("USE_REST_API", "false").lower() == "true"
        self.rest_api_models = [
            "gpt-4.1",
            "gpt-4.1-mini",
            "gpt-4o-mini",
            "gpt-4o", 
            "gpt-4",
            "gpt-3.5-turbo"
        ]
        self.rest_api_timeout = int(os.getenv("REST_API_TIMEOUT", "30"))
        self.rest_api_max_retries = int(os.getenv("REST_API_MAX_RETRIES", "3"))
        self.rest_api_base_url = os.getenv("REST_API_BASE_URL", "https://api.openai.com/v1")
        
    def should_use_rest_api(self, model: str) -> bool:
        """Check if a model should use REST API instead of WebSocket"""
        return self.use_rest_api and model in self.rest_api_models
    
    def get_model_config(self, model: str) -> Dict[str, Any]:
        """Get configuration for a specific model"""
        return {
            "model": model,
            "use_rest_api": self.should_use_rest_api(model),
            "timeout": self.rest_api_timeout,
            "max_retries": self.rest_api_max_retries,
            "base_url": self.rest_api_base_url
        }
    
    def log_config(self):
        """Log current configuration"""
        logger.info("REST_API_CONFIG | use_rest_api=%s | models=%s | timeout=%s | max_retries=%s", 
                   self.use_rest_api, self.rest_api_models, self.rest_api_timeout, self.rest_api_max_retries)

# Global configuration instance
rest_config = RestAPIConfig()

def get_rest_config() -> RestAPIConfig:
    """Get the global REST API configuration"""
    return rest_config

def is_rest_model(model: str) -> bool:
    """Check if a model should use REST API"""
    return rest_config.should_use_rest_api(model)

def get_model_config(model: str) -> Dict[str, Any]:
    """Get configuration for a specific model"""
    return rest_config.get_model_config(model)
