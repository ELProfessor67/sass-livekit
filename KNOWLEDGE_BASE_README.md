# Knowledge Base Implementation

This implementation provides a complete knowledge base system with document processing, text extraction, chunking, and embedding generation using OpenAI.

## Features Implemented

### 1. Document Upload & Storage
- Support for multiple file formats: PDF, DOCX, HTML, Markdown, TXT
- AWS S3 integration for file storage
- Database tracking of document metadata

### 2. Text Extraction
- **PDF**: Uses `pdfjs-dist` for digital PDFs and advanced layout
- **DOCX**: Uses `mammoth` for clean text extraction
- **HTML**: Uses `@extractus/article-extractor` for web pages, `cheerio` for general HTML
- **Markdown**: Uses `unified` + `remark-parse` for clean text conversion
- **Generic**: Uses `textract` for multi-format extraction
- **Text Cleaning**: Removes boilerplate, normalizes Unicode, cleans whitespace

### 3. Text Chunking
- Uses LangChain's `RecursiveCharacterTextSplitter`
- Configurable chunk size (default: 400 words)
- 15% overlap between chunks
- Section-aware chunking with heading detection
- Token-based sizing with `tiktoken`

### 4. Embedding Generation
- Uses OpenAI's `text-embedding-3-small` model
- Batch processing for efficiency
- Text normalization before embedding
- **Logging only** - embeddings are logged to console, not saved to database

## API Endpoints

### Test Endpoints (for development)

#### Health Check
```
GET /api/v1/kb-test/health
```

#### Process Text Directly
```
POST /api/v1/kb-test/test-text
Content-Type: application/json

{
  "text": "Your text content here...",
  "companyId": "your-company-id"
}
```

#### Process File Upload
```
POST /api/v1/kb-test/test-process
Content-Type: multipart/form-data

Form data:
- document: (file)
- companyId: "your-company-id"
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Add these to your `.env` file:
```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Run Database Migrations
```bash
# Apply the knowledge base migrations
# The migrations will create the necessary tables
```

### 4. Start the Server
```bash
npm run backend
```

### 5. Test the Functionality
```bash
node test-knowledge-base.js
```

## How It Works

### Processing Pipeline

1. **Upload**: Document is uploaded and stored in S3
2. **Extract**: Text is extracted using appropriate method based on file type
3. **Chunk**: Text is split into overlapping chunks using LangChain
4. **Embed**: Each chunk is converted to vector embeddings using OpenAI
5. **Log**: Embeddings are logged to console (not saved to database)

### Example Output

When processing a document, you'll see detailed logs like:

```
=== EMBEDDING OUTPUT ===
Document ID: doc-123
Total chunks: 3
Model used: text-embedding-3-small
Embedding dimension: 1536

--- Embedding Details ---

Chunk 1:
  Text preview: This is a sample document for testing the knowledge base...
  Word count: 45
  Vector dimension: 1536
  Vector preview: [0.0123, -0.0456, 0.0789, 0.0234, -0.0567, ...]
  Full vector length: 1536

Chunk 2:
  Text preview: The knowledge base system processes documents through...
  Word count: 52
  Vector dimension: 1536
  Vector preview: [0.0345, -0.0123, 0.0678, 0.0456, -0.0234, ...]
  Full vector length: 1536

=== END EMBEDDING OUTPUT ===
```

## File Structure

```
server/
├── services/
│   ├── enhanced-text-extraction-service.js    # Text extraction
│   ├── enhanced-chunking-service.js           # Text chunking
│   ├── openai-embedding-service.js            # Embedding generation
│   ├── knowledge-base-database-service.js     # Database operations
│   └── document-upload-service.js             # File upload handling
├── routes/
│   ├── knowledge-base.js                      # Main API routes
│   └── knowledge-base-test.js                 # Test endpoints
├── workers/
│   └── document-processor.js                  # Job queue processor
└── index.js                                   # Main server file

supabase/migrations/
├── 20250116000001_create_knowledge_base_tables.sql
└── 20250116000002_create_vector_search_function.sql
```

## Testing

The system includes comprehensive test endpoints that allow you to:

1. **Test text processing**: Send text directly without file upload
2. **Test file processing**: Upload files and process them through the pipeline
3. **View detailed logs**: All processing steps are logged with detailed information

## Next Steps

To extend this implementation:

1. **Add vector storage**: Implement pgvector or similar for storing embeddings
2. **Add search functionality**: Implement semantic search using vector similarity
3. **Add frontend integration**: Connect the existing knowledge base UI
4. **Add assistant integration**: Use embeddings to enhance AI assistant responses
5. **Add batch processing**: Process multiple documents in parallel

## Troubleshooting

### Common Issues

1. **OpenAI API errors**: Check your API key and rate limits
2. **File upload errors**: Verify AWS S3 credentials and bucket permissions
3. **Database errors**: Ensure Supabase is properly configured
4. **Memory issues**: Large files may require more memory for processing

### Debug Mode

Enable detailed logging by setting:
```env
DEBUG=knowledge-base:*
```

This will provide detailed logs for each processing step.
