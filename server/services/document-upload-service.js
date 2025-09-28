import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

class DocumentUploadService {
  constructor(databaseService) {
    this.databaseService = databaseService;
    
    // Using local storage only (S3 functionality removed)
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    console.log('Using local storage for file uploads');
    
    // Configure multer for file uploads
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/html',
          'text/markdown',
          'text/plain'
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only PDF, DOC, DOCX, HTML, MD, TXT allowed.'), false);
        }
      }
    });
  }

  async uploadDocument(file, companyId, userId, contentMetadata = {}) {
    try {
      const docId = uuidv4();
      const fileExtension = path.extname(file.originalname);
      const fileName = `${docId}${fileExtension}`;
      
      // Save to local storage
      const localFilePath = path.join(this.uploadsDir, fileName);
      fs.writeFileSync(localFilePath, file.buffer);
      const filePath = localFilePath;

      // Prepare document data with metadata
      const documentData = {
        doc_id: docId,
        company_id: companyId,
        filename: fileName,
        original_filename: file.originalname,
        file_size: file.size,
        file_path: filePath,
        // Add content metadata
        content_name: contentMetadata.content_name,
        content_description: contentMetadata.content_description,
        content_type: contentMetadata.content_type || 'document'
      };

      // Save to database
      const document = await this.databaseService.createDocument(documentData);

      // Queue for processing
      await this.queueDocumentProcessing(docId);

      return document;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  async queueDocumentProcessing(docId) {
    try {
      // Check if Redis is configured
      if (process.env.REDIS_URL) {
        // Using Redis/Bull for job queue
        const Queue = (await import('bull')).default;
        const documentQueue = new Queue('document processing', process.env.REDIS_URL);
        
        await documentQueue.add('process-document', { docId }, {
          attempts: 3,
          backoff: 'exponential',
          delay: 1000
        });
      } else {
        // Fallback: Process immediately without queue
        console.log('Redis not configured, processing document immediately');
        const DocumentProcessor = (await import('../workers/document-processor.js')).default;
        const processor = new DocumentProcessor();
        // Process in background without blocking
        setImmediate(() => {
          processor.processDocument(docId).catch(error => {
            console.error('Error processing document:', error);
          });
        });
      }
    } catch (error) {
      console.error('Error queuing document processing:', error);
      // Fallback: Process immediately
      try {
        const DocumentProcessor = (await import('../workers/document-processor.js')).default;
        const processor = new DocumentProcessor();
        setImmediate(() => {
          processor.processDocument(docId).catch(error => {
            console.error('Error processing document:', error);
          });
        });
      } catch (fallbackError) {
        console.error('Error in fallback processing:', fallbackError);
      }
    }
  }

  // Get multer middleware for Express
  getUploadMiddleware() {
    return this.upload.single('document');
  }
}

export default DocumentUploadService;
