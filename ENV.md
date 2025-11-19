Environment variables used by the app

# Server Configuration
- PORT: Backend server port (default 4000)
- NODE_ENV: Environment (development/production)

# Database Configuration (Required for Knowledge Base)
- SUPABASE_URL: Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Supabase service role key

# OpenAI Configuration (Required for Knowledge Base)
- OPENAI_API_KEY: OpenAI API key for embeddings and text processing

# Groq Configuration (Optional - Alternative LLM provider)
- GROQ_API_KEY: Groq API key for LLM processing
- GROQ_LLM_MODEL: Groq model to use (default: llama-3.1-8b-instant)
- GROQ_TEMPERATURE: Temperature setting for Groq model (default: 0.1)
- GROQ_MAX_TOKENS: Maximum tokens for Groq model response (default: 150)

# Available Groq Production Models:
# - llama-3.1-8b-instant (131K context, 131K max tokens)
# - llama-3.3-70b-versatile (131K context, 32K max tokens)  
# - openai/gpt-oss-120b (131K context, 65K max tokens)
# - openai/gpt-oss-20b (131K context, 65K max tokens)

# Cerebras Configuration (Optional - Alternative LLM provider)
- CEREBRAS_API_KEY: Cerebras API key for LLM processing
- CEREBRAS_LLM_MODEL: Cerebras model to use (default: gpt-oss-120b)
- CEREBRAS_TEMPERATURE: Temperature setting for Cerebras model (default: 0.1)
- CEREBRAS_MAX_TOKENS: Maximum tokens for Cerebras model response (default: 250)

# Available Cerebras Models:
# - llama-3.3-70b (70B parameters, high quality)
# - gpt-oss-120b (120B parameters, OpenAI OSS model)
# - llama-4-scout-17b-16e-instruct (17B parameters, instruction-tuned)
# - llama-4-maverick-17b-128e-instruct (17B parameters, preview)
# - qwen-3-32b (32B parameters, multilingual)
# - qwen-3-235b-a22b-instruct-2507 (235B parameters, preview)
# - qwen-3-235b-a22b-thinking-2507 (235B parameters, reasoning, preview)
# - qwen-3-coder-480b (480B parameters, code generation, preview)

# AWS S3 Configuration (Optional - will fallback to local storage)
- AWS_ACCESS_KEY_ID: AWS access key ID
- AWS_SECRET_ACCESS_KEY: AWS secret access key
- AWS_REGION: AWS region (e.g., us-east-1)
- S3_BUCKET_NAME: S3 bucket name for file storage

# Redis Configuration (Optional - will process immediately if not provided)
- REDIS_URL: Redis connection URL (e.g., redis://localhost:6379)

# LiveKit Configuration
- LIVEKIT_URL: LiveKit server URL (e.g., ws://localhost:7880)
- LIVEKIT_API_KEY: LiveKit API key
- LIVEKIT_API_SECRET: LiveKit API secret

# Hume TTS Configuration (Optional - Text-to-Speech provider)
- HUME_API_KEY: Hume API key for TTS processing
- HUME_VOICE_NAME: Hume voice name (default: "Colton Rivers")
- HUME_VOICE_PROVIDER: Hume voice provider (default: "hume")
- HUME_DESCRIPTION: Voice description for acting instructions (default: "The voice exudes calm, serene, and peaceful qualities, like a gentle stream flowing through a quiet forest.")
- HUME_SPEED: Speaking rate adjustment (default: 1.0, range: 0.25-3.0)
- HUME_INSTANT_MODE: Enable ultra-low latency streaming (default: true)

# Frontend Configuration
- VITE_BACKEND_URL: Backend URL for frontend (default http://localhost:4000)
- VITE_LIVEKIT_URL: LiveKit URL for frontend
- VITE_SITE_URL: Site URL for email confirmation redirects (defaults to window.location.origin)

# Stripe Configuration (for payment processing)
- VITE_STRIPE_PUBLISHABLE_KEY: Stripe publishable key (starts with pk_test_)
- STRIPE_TEST_KEY: Stripe secret key (starts with sk_test_)

# Twilio Configuration
- TWILIO_ACCOUNT_SID: Twilio account SID
- TWILIO_AUTH_TOKEN: Twilio auth token
- TWILIO_PHONE_NUMBER: Twilio phone number


