#!/usr/bin/env python3
"""
Comprehensive test script for Cerebras integration
This script tests all aspects of Cerebras integration including API connectivity,
model availability, configuration, and LiveKit integration.
"""

import asyncio
import os
import sys
import logging
from dotenv import load_dotenv
from typing import Dict, List, Any

# Add the livekit directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

# Import required modules
try:
    import openai as cerebras_client
    CEREBRAS_AVAILABLE = True
except ImportError:
    CEREBRAS_AVAILABLE = False
    cerebras_client = None

from config.settings import CerebrasConfig
from livekit.plugins import openai as lk_openai

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CerebrasIntegrationTester:
    """Comprehensive tester for Cerebras integration"""
    
    def __init__(self):
        self.api_key = os.getenv("CEREBRAS_API_KEY")
        self.config = CerebrasConfig.from_env()
        self.available_models = []
        self.test_results = {}
        
    async def test_environment_setup(self) -> bool:
        """Test if environment is properly configured"""
        logger.info("🔧 Testing environment setup...")
        
        issues = []
        
        # Check if OpenAI client is available
        if not CEREBRAS_AVAILABLE:
            issues.append("OpenAI client not available (required for Cerebras)")
        
        # Check API key
        if not self.api_key:
            issues.append("CEREBRAS_API_KEY not set in environment")
        
        # Check configuration
        if not self.config.api_key:
            issues.append("CerebrasConfig.api_key is empty")
        
        if issues:
            logger.error("❌ Environment setup issues:")
            for issue in issues:
                logger.error(f"   - {issue}")
            return False
        
        logger.info("✅ Environment setup is correct")
        return True
    
    async def test_api_connectivity(self) -> bool:
        """Test basic API connectivity"""
        logger.info("🌐 Testing Cerebras API connectivity...")
        
        if not self.api_key:
            logger.error("❌ No API key available for testing")
            return False
        
        try:
            client = cerebras_client.OpenAI(
                api_key=self.api_key,
                base_url="https://api.cerebras.ai/v1"
            )
            
            # Test with a simple models list request
            models = client.models.list()
            logger.info(f"✅ API connectivity successful - {len(models.data)} models available")
            return True
            
        except Exception as e:
            logger.error(f"❌ API connectivity failed: {str(e)}")
            return False
    
    async def test_model_availability(self) -> bool:
        """Test availability of Cerebras models"""
        logger.info("🤖 Testing model availability...")
        
        if not self.api_key:
            logger.error("❌ No API key available for testing")
            return False
        
        try:
            client = cerebras_client.OpenAI(
                api_key=self.api_key,
                base_url="https://api.cerebras.ai/v1"
            )
            
            # Get available models
            models_response = client.models.list()
            self.available_models = [model.id for model in models_response.data]
            
            logger.info(f"📋 Available models: {', '.join(self.available_models)}")
            
            # Test specific models from our configuration
            test_models = [
                "llama3.1-8b",
                "llama-3.3-70b", 
                "gpt-oss-120b",
                "qwen-3-32b"
            ]
            
            available_test_models = []
            for model in test_models:
                if model in self.available_models:
                    available_test_models.append(model)
                    logger.info(f"✅ Model {model} is available")
                else:
                    logger.warning(f"⚠️  Model {model} is not available")
            
            if not available_test_models:
                logger.error("❌ None of the test models are available")
                return False
            
            logger.info(f"✅ Model availability test passed - {len(available_test_models)} test models available")
            return True
            
        except Exception as e:
            logger.error(f"❌ Model availability test failed: {str(e)}")
            return False
    
    async def test_chat_completion(self) -> bool:
        """Test chat completion functionality"""
        logger.info("💬 Testing chat completion...")
        
        if not self.api_key:
            logger.error("❌ No API key available for testing")
            return False
        
        try:
            client = cerebras_client.OpenAI(
                api_key=self.api_key,
                base_url="https://api.cerebras.ai/v1"
            )
            
            # Use the first available model for testing
            test_model = self.available_models[0] if self.available_models else "llama3.1-8b"
            
            logger.info(f"🧪 Testing with model: {test_model}")
            
            completion = client.chat.completions.create(
                model=test_model,
                messages=[
                    {"role": "user", "content": "Hello! Please respond with 'Cerebras integration test successful'"}
                ],
                max_completion_tokens=50,
                temperature=0.1
            )
            
            response_text = completion.choices[0].message.content
            logger.info(f"✅ Chat completion successful: {response_text}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Chat completion test failed: {str(e)}")
            return False
    
    async def test_livekit_integration(self) -> bool:
        """Test LiveKit integration with Cerebras"""
        logger.info("🎯 Testing LiveKit integration...")
        
        if not self.api_key:
            logger.error("❌ No API key available for testing")
            return False
        
        try:
            # Test creating LiveKit LLM with Cerebras
            test_model = self.available_models[0] if self.available_models else "llama3.1-8b"
            
            llm = lk_openai.LLM(
                model=test_model,
                api_key=self.api_key,
                base_url="https://api.cerebras.ai/v1",
                temperature=0.1,
                parallel_tool_calls=False,
                tool_choice="auto",
            )
            
            logger.info(f"✅ LiveKit LLM created successfully with model: {test_model}")
            logger.info("✅ LiveKit integration test passed")
            return True
            
        except Exception as e:
            logger.error(f"❌ LiveKit integration test failed: {str(e)}")
            return False
    
    async def test_configuration_validation(self) -> bool:
        """Test configuration validation"""
        logger.info("⚙️  Testing configuration validation...")
        
        try:
            # Test default configuration
            config = CerebrasConfig.from_env()
            
            # Validate configuration values
            assert config.llm_model == "llama3.1-8b", f"Expected default model 'llama3.1-8b', got '{config.llm_model}'"
            assert config.temperature == 0.1, f"Expected default temperature 0.1, got {config.temperature}"
            assert config.max_tokens == 250, f"Expected default max_tokens 250, got {config.max_tokens}"
            
            logger.info("✅ Configuration validation passed")
            logger.info(f"   - Default model: {config.llm_model}")
            logger.info(f"   - Default temperature: {config.temperature}")
            logger.info(f"   - Default max_tokens: {config.max_tokens}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Configuration validation failed: {str(e)}")
            return False
    
    async def run_all_tests(self) -> Dict[str, bool]:
        """Run all integration tests"""
        logger.info("🚀 Starting comprehensive Cerebras integration tests")
        logger.info("=" * 60)
        
        tests = [
            ("Environment Setup", self.test_environment_setup),
            ("API Connectivity", self.test_api_connectivity),
            ("Model Availability", self.test_model_availability),
            ("Chat Completion", self.test_chat_completion),
            ("LiveKit Integration", self.test_livekit_integration),
            ("Configuration Validation", self.test_configuration_validation),
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            logger.info(f"\n📋 Running {test_name} test...")
            try:
                result = await test_func()
                results[test_name] = result
            except Exception as e:
                logger.error(f"❌ {test_name} test crashed: {str(e)}")
                results[test_name] = False
        
        return results
    
    def print_summary(self, results: Dict[str, bool]):
        """Print test summary"""
        logger.info("\n" + "=" * 60)
        logger.info("📊 CEREBRAS INTEGRATION TEST SUMMARY")
        logger.info("=" * 60)
        
        passed = sum(results.values())
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            logger.info(f"{test_name:.<30} {status}")
        
        logger.info("-" * 60)
        logger.info(f"Overall: {passed}/{total} tests passed")
        
        if passed == total:
            logger.info("🎉 All tests passed! Cerebras integration is fully working.")
        else:
            logger.info("⚠️  Some tests failed. Please check the issues above.")
        
        logger.info("\n📋 Available Models:")
        for model in self.available_models:
            logger.info(f"   - {model}")
        
        logger.info("\n🔧 Configuration:")
        logger.info(f"   - API Key: {'✅ Set' if self.api_key else '❌ Not set'}")
        logger.info(f"   - Default Model: {self.config.llm_model}")
        logger.info(f"   - Temperature: {self.config.temperature}")
        logger.info(f"   - Max Tokens: {self.config.max_tokens}")

async def main():
    """Main test function"""
    tester = CerebrasIntegrationTester()
    results = await tester.run_all_tests()
    tester.print_summary(results)
    
    # Return exit code based on results
    if all(results.values()):
        sys.exit(0)  # All tests passed
    else:
        sys.exit(1)  # Some tests failed

if __name__ == "__main__":
    asyncio.run(main())
