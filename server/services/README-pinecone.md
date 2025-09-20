# Pinecone Index Service

This service provides functionality to create and manage user-specific Pinecone indexes for vector storage and similarity search.

## Features

- **User-specific indexes**: Each user gets their own isolated Pinecone index
- **Knowledge base namespaces**: Each knowledge base gets its own namespace within the user's index
- **Knowledge base assistants**: Each knowledge base gets its own Pinecone Assistant
- **Automatic index naming**: Converts user IDs to valid Pinecone index names
- **Automatic namespace creation**: Creates namespaces for each knowledge base
- **Automatic assistant creation**: Creates assistants for each knowledge base
- **Index management**: Create, check existence, get info, and delete indexes
- **Namespace management**: Create, list, get info, and delete namespaces
- **Assistant management**: Create, list, get info, and delete assistants
- **RESTful API**: Complete API endpoints for all operations
- **Error handling**: Comprehensive error handling and logging

## Setup

### 1. Install Dependencies

```bash
npm install @pinecone-database/pinecone
```

### 2. Environment Variables

Add to your `.env` file:

```env
PINECONE_API_KEY=your_pinecone_api_key_here
```

### 3. Get Pinecone API Key

1. Sign up at [Pinecone Console](https://app.pinecone.io/)
2. Create a new project
3. Get your API key from the project settings

## Usage

### Service Usage

```javascript
import PineconeIndexService from './services/pinecone-index-service.js';

const pineconeService = new PineconeIndexService();

// Create an index for a user
const result = await pineconeService.createUserIndex('user-123', {
  dimension: 1536, // OpenAI text-embedding-3-small
  metric: 'cosine',
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1'
    }
  }
});

// Check if index exists
const exists = await pineconeService.userIndexExists('user-123');

// Get index information
const indexInfo = await pineconeService.getUserIndex('user-123');

// Get index instance for operations
const indexInstance = await pineconeService.getUserIndexInstance('user-123');
```

### API Usage

#### Create Index
```bash
POST /api/v1/pinecone/index/create
Content-Type: application/json

{
  "userId": "user-123",
  "options": {
    "dimension": 1536,
    "metric": "cosine",
    "tags": {
      "user_id": "user-123",
      "environment": "production"
    }
  }
}
```

#### Check Index Existence
```bash
GET /api/v1/pinecone/index/user-123/exists
```

#### Get Index Information
```bash
GET /api/v1/pinecone/index/user-123
```

#### List All Indexes
```bash
GET /api/v1/pinecone/index/
```

#### Delete Index
```bash
DELETE /api/v1/pinecone/index/user-123
```

#### List Namespaces
```bash
GET /api/v1/pinecone/index/user-123/namespaces
```

#### Create Namespace
```bash
POST /api/v1/pinecone/index/user-123/namespace/kb-456
```

#### Get Namespace Info
```bash
GET /api/v1/pinecone/index/user-123/namespace/kb-456
```

#### Delete Namespace
```bash
DELETE /api/v1/pinecone/index/user-123/namespace/kb-456
```

#### List Assistants
```bash
GET /api/v1/pinecone/index/assistants
```

#### Create Assistant
```bash
POST /api/v1/pinecone/index/assistants
{
  "userId": "user-123",
  "knowledgeBaseId": "kb-456",
  "knowledgeBaseName": "My Knowledge Base",
  "options": {
    "instructions": "Custom instructions...",
    "region": "us"
  }
}
```

#### Get Assistant Info
```bash
GET /api/v1/pinecone/index/assistants/asst-123
```

#### Delete Assistant
```bash
DELETE /api/v1/pinecone/index/assistants/asst-123
```

## Index Configuration

### Default Configuration

```javascript
{
  dimension: 1536,           // OpenAI text-embedding-3-small
  metric: 'cosine',          // Similarity metric
  spec: {
    serverless: {
      cloud: 'aws',          // Cloud provider
      region: 'us-east-1'    // Region
    }
  },
  deletionProtection: 'disabled',
  tags: {
    user_id: userId,
    created_at: new Date().toISOString(),
    type: 'knowledge_base'
  }
}
```

### Supported Metrics

- `cosine` - Cosine similarity (default)
- `euclidean` - Euclidean distance
- `dotproduct` - Dot product

### Supported Clouds

- `aws` - Amazon Web Services
- `gcp` - Google Cloud Platform
- `azure` - Microsoft Azure

## Index Naming

User IDs are automatically converted to valid Pinecone index names:

- Converted to lowercase
- Invalid characters replaced with hyphens
- Must start and end with alphanumeric characters
- Maximum 45 characters
- Example: `user-123` → `user-123`

## Error Handling

The service includes comprehensive error handling:

- **Index already exists**: Returns existing index info
- **Invalid user ID**: Returns validation error
- **Pinecone API errors**: Properly formatted error responses
- **Network errors**: Retry logic and fallback handling

## Examples

See `server/examples/pinecone-index-example.js` for complete usage examples.

## Integration with Knowledge Base

This service is designed to work with your existing knowledge base system:

1. **Document Processing**: When documents are processed, create a user index
2. **Namespace Organization**: Each knowledge base gets its own namespace within the user's index
3. **Assistant Creation**: Each knowledge base gets its own Pinecone Assistant
4. **Vector Storage**: Store document embeddings in the appropriate namespace
5. **Semantic Search**: Query specific namespaces for relevant documents
6. **AI Assistance**: Use Pinecone Assistants for intelligent document interaction
7. **User Isolation**: Each user's data is completely isolated
8. **Knowledge Base Isolation**: Each knowledge base's vectors and assistants are isolated

## Next Steps

After creating indexes, namespaces, and assistants, you can:

1. **Store Vectors**: Use the index instance with specific namespaces to upsert document embeddings
2. **Query Vectors**: Perform similarity search within specific namespaces
3. **Update Vectors**: Modify or delete existing vectors in namespaces
4. **Metadata Filtering**: Use metadata to filter search results within namespaces
5. **Namespace Management**: Create, list, and manage namespaces for different knowledge bases
6. **Assistant Interaction**: Use Pinecone Assistants for intelligent document queries and responses
7. **Assistant Management**: Create, list, and manage assistants for different knowledge bases

## Monitoring

Monitor your indexes through:

- **Pinecone Console**: Visual monitoring and management
- **API Responses**: Status information in API responses
- **Logs**: Comprehensive logging for debugging
- **Metrics**: Track index usage and performance
