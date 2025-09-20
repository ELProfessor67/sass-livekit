import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PineconeAssistantUploadService {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
  }

  /**
   * Upload a file directly to a Pinecone Assistant
   * @param {string} assistantName - The name of the assistant
   * @param {string} filePath - Path to the file to upload
   * @param {Object} metadata - Optional metadata for the file
   * @param {Object} options - Upload options (timeout, etc.)
   * @returns {Promise<Object>} Upload result with file ID and status
   */
  async uploadFileToAssistant(assistantName, filePath, metadata = {}, options = {}) {
    try {
      console.log(`Uploading file to Pinecone Assistant '${assistantName}': ${filePath}`);
      
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      
      // Check file size limits (Pinecone has limits)
      const maxFileSize = 100 * 1024 * 1024; // 100MB for PDFs, 10MB for others
      const fileExt = path.extname(filePath).toLowerCase();
      const isPdf = fileExt === '.pdf';
      const actualMaxSize = isPdf ? maxFileSize : maxFileSize / 10; // 10MB for non-PDFs
      
      if (fileSize > actualMaxSize) {
        throw new Error(`File too large: ${fileSize} bytes (max: ${actualMaxSize} bytes for ${isPdf ? 'PDF' : 'non-PDF'} files)`);
      }

      // Get assistant instance
      const assistant = this.pinecone.Assistant(assistantName);
      
      // Prepare upload options
      const uploadOptions = {
        path: filePath,
        ...options
      };

      // Add metadata if provided
      if (Object.keys(metadata).length > 0) {
        uploadOptions.metadata = metadata;
      }

      // Upload the file
      const response = await assistant.uploadFile(uploadOptions);
      
      console.log(`File uploaded successfully to assistant: ${response.id}`);
      
      return {
        success: true,
        fileId: response.id,
        fileName: path.basename(filePath),
        fileSize: fileSize,
        status: 'uploaded',
        metadata: metadata,
        uploadedAt: new Date().toISOString(),
        assistantName: assistantName
      };

    } catch (error) {
      console.error(`Error uploading file to assistant '${assistantName}':`, error);
      return {
        success: false,
        error: error.message,
        fileName: path.basename(filePath),
        assistantName: assistantName
      };
    }
  }

  /**
   * Upload a file from a buffer to a Pinecone Assistant
   * @param {string} assistantName - The name of the assistant
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {string} fileName - Name of the file
   * @param {Object} metadata - Optional metadata for the file
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with file ID and status
   */
  async uploadFileFromBuffer(assistantName, fileBuffer, fileName, metadata = {}, options = {}) {
    try {
      console.log(`Uploading file buffer to Pinecone Assistant '${assistantName}': ${fileName}`);
      
      // Check file size limits
      const fileSize = fileBuffer.length;
      const fileExt = path.extname(fileName).toLowerCase();
      const isPdf = fileExt === '.pdf';
      const maxFileSize = isPdf ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for PDFs, 10MB for others
      
      if (fileSize > maxFileSize) {
        throw new Error(`File too large: ${fileSize} bytes (max: ${maxFileSize} bytes for ${isPdf ? 'PDF' : 'non-PDF'} files)`);
      }

      // For Node.js SDK, we need to write to a temporary file first
      // since the SDK doesn't have uploadBytesStream method like Python
      const tempDir = path.join(__dirname, '../../uploads/temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${fileName}`);
      
      try {
        // Write buffer to temporary file
        fs.writeFileSync(tempFilePath, fileBuffer);
        
        // Upload the temporary file
        const result = await this.uploadFileToAssistant(assistantName, tempFilePath, metadata, options);
        
        // Clean up temporary file
        fs.unlinkSync(tempFilePath);
        
        return result;
        
      } catch (error) {
        // Clean up temporary file on error
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        throw error;
      }

    } catch (error) {
      console.error(`Error uploading file buffer to assistant '${assistantName}':`, error);
      return {
        success: false,
        error: error.message,
        fileName: fileName,
        assistantName: assistantName
      };
    }
  }

  /**
   * Get file status from Pinecone Assistant
   * @param {string} assistantName - The name of the assistant
   * @param {string} fileId - The file ID to check
   * @returns {Promise<Object>} File status information
   */
  async getFileStatus(assistantName, fileId) {
    try {
      console.log(`Getting file status for '${fileId}' in assistant '${assistantName}'`);
      
      const assistant = this.pinecone.Assistant(assistantName);
      const fileInfo = await assistant.describeFile(fileId);
      
      return {
        success: true,
        fileId: fileInfo.id,
        fileName: fileInfo.name,
        status: fileInfo.status,
        size: fileInfo.size,
        createdAt: fileInfo.created_at,
        updatedAt: fileInfo.updated_at,
        metadata: fileInfo.metadata || {}
      };

    } catch (error) {
      console.error(`Error getting file status for '${fileId}':`, error);
      return {
        success: false,
        error: error.message,
        fileId: fileId
      };
    }
  }

  /**
   * Poll file status until ready or failed
   * @param {string} assistantName - The name of the assistant
   * @param {string} fileId - The file ID to poll
   * @param {Object} options - Polling options (maxAttempts, interval)
   * @returns {Promise<Object>} Final file status
   */
  async pollFileStatus(assistantName, fileId, options = {}) {
    const maxAttempts = options.maxAttempts || 60; // 5 minutes with 5-second intervals
    const interval = options.interval || 5000; // 5 seconds
    let attempts = 0;

    console.log(`Polling file status for '${fileId}' in assistant '${assistantName}'`);

    while (attempts < maxAttempts) {
      try {
        const statusResult = await this.getFileStatus(assistantName, fileId);
        
        if (!statusResult.success) {
          return statusResult;
        }

        const status = statusResult.status;
        console.log(`File '${fileId}' status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);

        // Check if file is ready (Pinecone uses "Available" status)
        if (status === 'ready' || status === 'Available') {
          return {
            success: true,
            fileId: fileId,
            status: 'ready',
            message: 'File is ready for use',
            attempts: attempts + 1
          };
        }

        // Check if file failed
        if (status === 'failed' || status === 'error') {
          return {
            success: false,
            fileId: fileId,
            status: status,
            error: 'File processing failed',
            attempts: attempts + 1
          };
        }

        // Wait before next attempt
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }

      } catch (error) {
        console.error(`Error polling file status (attempt ${attempts + 1}):`, error);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        } else {
          return {
            success: false,
            fileId: fileId,
            error: error.message,
            attempts: attempts
          };
        }
      }
    }

    return {
      success: false,
      fileId: fileId,
      error: 'File processing timeout - maximum attempts reached',
      attempts: attempts
    };
  }

  /**
   * Upload file and wait for processing to complete
   * @param {string} assistantName - The name of the assistant
   * @param {string} filePath - Path to the file to upload
   * @param {Object} metadata - Optional metadata for the file
   * @param {Object} options - Upload and polling options
   * @returns {Promise<Object>} Complete upload and processing result
   */
  async uploadFileAndWait(assistantName, filePath, metadata = {}, options = {}) {
    try {
      console.log(`Uploading file and waiting for processing: ${filePath}`);
      
      // Upload the file
      const uploadResult = await this.uploadFileToAssistant(assistantName, filePath, metadata, options);
      
      if (!uploadResult.success) {
        return uploadResult;
      }

      // Poll for completion
      const pollResult = await this.pollFileStatus(assistantName, uploadResult.fileId, options);
      
      return {
        ...uploadResult,
        processingResult: pollResult,
        fullyProcessed: pollResult.success && pollResult.status === 'ready'
      };

    } catch (error) {
      console.error(`Error in uploadFileAndWait:`, error);
      return {
        success: false,
        error: error.message,
        fileName: path.basename(filePath)
      };
    }
  }

  /**
   * List all files in an assistant
   * @param {string} assistantName - The name of the assistant
   * @param {Object} options - List options (limit, offset, etc.)
   * @returns {Promise<Object>} List of files
   */
  async listFiles(assistantName, options = {}) {
    try {
      console.log(`Listing files for assistant '${assistantName}'`);
      
      const assistant = this.pinecone.Assistant(assistantName);
      const files = await assistant.listFiles(options);
      
      return {
        success: true,
        files: files.data || [],
        total: files.total || 0
      };

    } catch (error) {
      console.error(`Error listing files for assistant '${assistantName}':`, error);
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }

  /**
   * Delete a file from an assistant
   * @param {string} assistantName - The name of the assistant
   * @param {string} fileId - The file ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(assistantName, fileId) {
    try {
      console.log(`Deleting file '${fileId}' from assistant '${assistantName}'`);
      
      const assistant = this.pinecone.Assistant(assistantName);
      await assistant.deleteFile(fileId);
      
      return {
        success: true,
        fileId: fileId,
        deletedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error deleting file '${fileId}':`, error);
      return {
        success: false,
        error: error.message,
        fileId: fileId
      };
    }
  }
}

export default PineconeAssistantUploadService;
