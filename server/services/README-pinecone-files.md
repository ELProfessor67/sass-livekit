# Pinecone File Upload Service

This service provides comprehensive file upload functionality for Pinecone Assistants, enabling users to upload documents to their knowledge bases where Pinecone will automatically process, chunk, embed, and index them for retrieval.

## Features

- **File Upload**: Upload files directly to Pinecone Assistants
- **Buffer Upload**: Upload files from memory buffers
- **Status Polling**: Monitor file processing status until completion
- **File Management**: List, get status, and delete files
- **Error Handling**: Robust error handling and validation
- **Database Integration**: Automatic saving of file metadata to database
- **File Type Validation**: Support for common document types
- **Size Limits**: Automatic file size validation

## Supported File Types

- PDF (.pdf) - up to 100MB
- Microsoft Word (.doc, .docx) - up to 10MB
- Plain Text (.txt) - up to 10MB
- HTML (.html) - up to 10MB
- Markdown (.md) - up to 10MB
- JSON (.json) - up to 10MB
- CSV (.csv) - up to 10MB

## Services

### PineconeFileService

Core service for interacting with Pinecone file upload API.

#### Methods

- `uploadFile(assistantName, filePath, metadata, options)` - Upload a file from disk
- `uploadFileFromBuffer(assistantName, fileBuffer, fileName, metadata, options)` - Upload a file from buffer
- `getFileStatus(assistantName, fileId)` - Get file processing status
- `listFiles(assistantName, options)` - List all files in an assistant
- `deleteFile(assistantName, fileId)` - Delete a file from an assistant
- `pollFileStatus(assistantName, fileId, options)` - Poll file status until ready/failed
- `uploadFileAndWait(assistantName, filePath, metadata, options)` - Upload and wait for processing

### PineconeFileHelper

High-level service that integrates file uploads with the knowledge base system.

#### Methods

- `uploadFileToKnowledgeBase(companyId, knowledgeBaseId, filePath, metadata, options)` - Upload file to KB
- `uploadFileBufferToKnowledgeBase(companyId, knowledgeBaseId, fileBuffer, fileName, metadata, options)` - Upload buffer to KB
- `uploadFileAndWait(companyId, knowledgeBaseId, filePath, metadata, options)` - Upload and wait for KB
- `getFileStatus(companyId, knowledgeBaseId, fileId)` - Get file status for KB
- `listFiles(companyId, knowledgeBaseId, options)` - List files in KB
- `deleteFile(companyId, knowledgeBaseId, fileId)` - Delete file from KB
- `pollFileStatus(companyId, knowledgeBaseId, fileId, options)` - Poll file status for KB

## API Endpoints

### File Upload

#### POST `/api/v1/pinecone/files/upload/:knowledgeBaseId`

Upload a file to a knowledge base.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: `file` (file), `metadata` (optional JSON string)

**Response:**
```json
{
  "success": true,
  "fileId": "file-123",
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "status": "uploaded",
  "uploadedAt": "2024-01-16T10:30:00Z"
}
```

#### POST `/api/v1/pinecone/files/upload-and-wait/:knowledgeBaseId`

Upload a file and wait for processing to complete.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: `file` (file), `metadata` (optional JSON string), `maxAttempts` (optional), `interval` (optional)

**Response:**
```json
{
  "success": true,
  "fileId": "file-123",
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "status": "uploaded",
  "fullyProcessed": true,
  "processingResult": {
    "success": true,
    "status": "ready",
    "attempts": 3
  },
  "uploadedAt": "2024-01-16T10:30:00Z"
}
```

### File Management

#### GET `/api/v1/pinecone/files/status/:knowledgeBaseId/:fileId`

Get file processing status.

**Response:**
```json
{
  "success": true,
  "fileId": "file-123",
  "fileName": "document.pdf",
  "status": "ready",
  "size": 1024000,
  "createdAt": "2024-01-16T10:30:00Z",
  "updatedAt": "2024-01-16T10:32:00Z",
  "metadata": {}
}
```

#### GET `/api/v1/pinecone/files/list/:knowledgeBaseId`

List all files in a knowledge base.

**Query Parameters:**
- `limit` (optional): Maximum number of files to return
- `offset` (optional): Number of files to skip

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "file-123",
      "name": "document.pdf",
      "status": "ready",
      "size": 1024000,
      "created_at": "2024-01-16T10:30:00Z"
    }
  ],
  "total": 1
}
```

#### DELETE `/api/v1/pinecone/files/:knowledgeBaseId/:fileId`

Delete a file from a knowledge base.

**Response:**
```json
{
  "success": true,
  "fileId": "file-123",
  "deletedAt": "2024-01-16T10:35:00Z"
}
```

#### POST `/api/v1/pinecone/files/poll/:knowledgeBaseId/:fileId`

Poll file status until ready or failed.

**Request Body:**
```json
{
  "maxAttempts": 60,
  "interval": 5000
}
```

**Response:**
```json
{
  "success": true,
  "fileId": "file-123",
  "status": "ready",
  "message": "File is ready for use",
  "attempts": 3
}
```

## File Processing Status

Files go through the following statuses:

1. **uploaded** - File has been uploaded to Pinecone
2. **processing** - Pinecone is processing the file (chunking, embedding, indexing)
3. **ready** - File is fully processed and ready for use
4. **failed** - File processing failed
5. **error** - An error occurred during processing

## Configuration

### Environment Variables

- `PINECONE_API_KEY` - Your Pinecone API key

### File Size Limits

- PDF files: 100MB maximum
- Other file types: 10MB maximum
- Recommended: 1MB or less for faster processing

### Polling Configuration

- Default max attempts: 60 (5 minutes with 5-second intervals)
- Default interval: 5000ms (5 seconds)
- Configurable per request

## Database Schema

The service automatically saves file metadata to the `knowledge_documents` table:

```sql
ALTER TABLE knowledge_documents 
ADD COLUMN file_id TEXT,
ADD COLUMN pinecone_assistant_name TEXT,
ADD COLUMN file_type TEXT,
ADD COLUMN status TEXT DEFAULT 'uploaded',
ADD COLUMN metadata JSONB,
ADD COLUMN uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

## Error Handling

The service provides comprehensive error handling:

- **File validation**: File type and size validation
- **Upload errors**: Network and API errors during upload
- **Processing errors**: File processing failures
- **Timeout handling**: Polling timeout with configurable limits
- **Database errors**: Graceful handling of database save failures

## Usage Examples

### Basic File Upload

```javascript
import PineconeFileHelper from './services/pinecone-file-helper.js';

const fileHelper = new PineconeFileHelper();

// Upload a file
const result = await fileHelper.uploadFileToKnowledgeBase(
  'company-123',
  'kb-456',
  '/path/to/document.pdf',
  {
    title: 'Important Document',
    category: 'legal'
  }
);

if (result.success) {
  console.log('File uploaded:', result.fileId);
}
```

### Upload and Wait for Processing

```javascript
// Upload and wait for processing to complete
const result = await fileHelper.uploadFileAndWait(
  'company-123',
  'kb-456',
  '/path/to/document.pdf',
  { title: 'Important Document' },
  {
    maxAttempts: 24, // 2 minutes
    interval: 5000   // 5 seconds
  }
);

if (result.fullyProcessed) {
  console.log('File is ready for use!');
}
```

### File Management

```javascript
// List files
const files = await fileHelper.listFiles('company-123', 'kb-456');

// Get file status
const status = await fileHelper.getFileStatus('company-123', 'kb-456', 'file-123');

// Delete file
const deleted = await fileHelper.deleteFile('company-123', 'kb-456', 'file-123');
```

## Integration with Knowledge Base Creation

When a knowledge base is created, the system automatically:

1. Creates a Pinecone index for the user
2. Creates a namespace for the knowledge base
3. Creates a Pinecone Assistant for the knowledge base
4. Stores all metadata in the database

Files uploaded to the knowledge base are automatically associated with the correct Pinecone Assistant and stored in the appropriate namespace.

## Security Considerations

- File type validation prevents malicious file uploads
- File size limits prevent resource exhaustion
- User authentication required for all operations
- Company isolation ensures data privacy
- Temporary files are cleaned up automatically

## Performance Considerations

- Files are processed asynchronously by Pinecone
- Polling can be configured based on expected processing time
- Database operations are optimized with proper indexing
- File cleanup prevents disk space issues
- Batch operations available for multiple files

## Troubleshooting

### Common Issues

1. **File too large**: Check file size limits
2. **Invalid file type**: Ensure file type is supported
3. **Processing timeout**: Increase maxAttempts or interval
4. **Database errors**: Check Supabase connection and permissions
5. **Pinecone errors**: Verify API key and assistant exists

### Debugging

Enable detailed logging by setting log level to debug in your environment. The service logs all operations including:

- File upload attempts
- Status polling
- Database operations
- Error details
- Processing results

## Future Enhancements

- Batch file upload support
- File versioning
- Advanced metadata filtering
- File preview generation
- Integration with document processing pipelines
- Real-time status updates via WebSocket
