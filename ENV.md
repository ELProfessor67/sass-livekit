Environment variables used by the app

# Server Configuration
- PORT: Backend server port (default 4000)
- NODE_ENV: Environment (development/production)

# Database Configuration (Required for Knowledge Base)
- SUPABASE_URL: Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Supabase service role key

# OpenAI Configuration (Required for Knowledge Base)
- OPENAI_API_KEY: OpenAI API key for embeddings and text processing

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

# Frontend Configuration
- VITE_BACKEND_URL: Backend URL for frontend (default http://localhost:4000)
- VITE_LIVEKIT_URL: LiveKit URL for frontend

# Stripe Configuration (for payment processing)
- VITE_STRIPE_PUBLISHABLE_KEY: Stripe publishable key (starts with pk_test_)
- STRIPE_TEST_KEY: Stripe secret key (starts with sk_test_)

# Twilio Configuration
- TWILIO_ACCOUNT_SID: Twilio account SID
- TWILIO_AUTH_TOKEN: Twilio auth token
- TWILIO_PHONE_NUMBER: Twilio phone number


