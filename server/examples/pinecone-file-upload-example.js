import PineconeFileHelper from '../services/pinecone-file-helper.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Example usage of Pinecone file upload functionality
async function demonstrateFileUpload() {
  console.log('🚀 Pinecone File Upload Example');
  console.log('================================');

  const fileHelper = new PineconeFileHelper();
  
  // Example data
  const companyId = 'example-company-123';
  const knowledgeBaseId = 'example-kb-456';
  const testFilePath = path.join(__dirname, '../test-documents/sample.txt');

  try {
    // 1. Upload a file to knowledge base
    console.log('\n📁 Uploading file to knowledge base...');
    const uploadResult = await fileHelper.uploadFileToKnowledgeBase(
      companyId,
      knowledgeBaseId,
      testFilePath,
      {
        title: 'Sample Document',
        category: 'test',
        uploadedBy: 'example-user'
      }
    );

    if (uploadResult.success) {
      console.log('✅ File uploaded successfully!');
      console.log(`   File ID: ${uploadResult.fileId}`);
      console.log(`   File Name: ${uploadResult.fileName}`);
      console.log(`   File Size: ${uploadResult.fileSize} bytes`);
      console.log(`   Status: ${uploadResult.status}`);

      // 2. Check file status
      console.log('\n📊 Checking file status...');
      const statusResult = await fileHelper.getFileStatus(companyId, knowledgeBaseId, uploadResult.fileId);
      
      if (statusResult.success) {
        console.log('✅ File status retrieved!');
        console.log(`   Status: ${statusResult.status}`);
        console.log(`   Created: ${statusResult.createdAt}`);
        console.log(`   Updated: ${statusResult.updatedAt}`);
      } else {
        console.log('❌ Failed to get file status:', statusResult.error);
      }

      // 3. List all files in knowledge base
      console.log('\n📋 Listing files in knowledge base...');
      const listResult = await fileHelper.listFiles(companyId, knowledgeBaseId);
      
      if (listResult.success) {
        console.log('✅ Files listed successfully!');
        console.log(`   Total files: ${listResult.total}`);
        listResult.files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name} (${file.status})`);
        });
      } else {
        console.log('❌ Failed to list files:', listResult.error);
      }

      // 4. Poll file status until ready (optional)
      console.log('\n⏳ Polling file status until ready...');
      const pollResult = await fileHelper.pollFileStatus(companyId, knowledgeBaseId, uploadResult.fileId, {
        maxAttempts: 12, // 1 minute with 5-second intervals
        interval: 5000
      });

      if (pollResult.success) {
        console.log('✅ File processing completed!');
        console.log(`   Final status: ${pollResult.status}`);
        console.log(`   Attempts: ${pollResult.attempts}`);
      } else {
        console.log('❌ File processing failed or timed out:', pollResult.error);
      }

    } else {
      console.log('❌ File upload failed:', uploadResult.error);
    }

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Example of uploading file and waiting for processing
async function demonstrateUploadAndWait() {
  console.log('\n🚀 Pinecone Upload and Wait Example');
  console.log('====================================');

  const fileHelper = new PineconeFileHelper();
  
  const companyId = 'example-company-123';
  const knowledgeBaseId = 'example-kb-456';
  const testFilePath = path.join(__dirname, '../test-documents/sample.pdf');

  try {
    console.log('\n📁 Uploading file and waiting for processing...');
    const result = await fileHelper.uploadFileAndWait(
      companyId,
      knowledgeBaseId,
      testFilePath,
      {
        title: 'Sample PDF Document',
        category: 'test',
        priority: 'high'
      },
      {
        maxAttempts: 24, // 2 minutes with 5-second intervals
        interval: 5000
      }
    );

    if (result.success) {
      console.log('✅ File upload and processing completed!');
      console.log(`   File ID: ${result.fileId}`);
      console.log(`   File Name: ${result.fileName}`);
      console.log(`   Fully Processed: ${result.fullyProcessed}`);
      console.log(`   Processing Status: ${result.processingResult?.status}`);
    } else {
      console.log('❌ File upload and processing failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Upload and wait example failed:', error);
  }
}

// Example of file management operations
async function demonstrateFileManagement() {
  console.log('\n🚀 Pinecone File Management Example');
  console.log('====================================');

  const fileHelper = new PineconeFileHelper();
  
  const companyId = 'example-company-123';
  const knowledgeBaseId = 'example-kb-456';

  try {
    // List files
    console.log('\n📋 Listing files...');
    const listResult = await fileHelper.listFiles(companyId, knowledgeBaseId);
    
    if (listResult.success && listResult.files.length > 0) {
      const fileToDelete = listResult.files[0];
      console.log(`   Found ${listResult.files.length} files`);
      console.log(`   First file: ${fileToDelete.name} (${fileToDelete.id})`);

      // Delete a file
      console.log('\n🗑️  Deleting file...');
      const deleteResult = await fileHelper.deleteFile(companyId, knowledgeBaseId, fileToDelete.id);
      
      if (deleteResult.success) {
        console.log('✅ File deleted successfully!');
        console.log(`   Deleted file ID: ${deleteResult.fileId}`);
      } else {
        console.log('❌ Failed to delete file:', deleteResult.error);
      }
    } else {
      console.log('   No files found in knowledge base');
    }

  } catch (error) {
    console.error('❌ File management example failed:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('⚠️  This is an example script. Make sure you have:');
  console.log('   1. Set PINECONE_API_KEY in your environment');
  console.log('   2. Created a test knowledge base');
  console.log('   3. Have test documents in the test-documents folder');
  console.log('   4. Updated the companyId and knowledgeBaseId variables');
  console.log('\nTo run the examples:');
  console.log('   node server/examples/pinecone-file-upload-example.js');
  
  // Uncomment to run examples
  // demonstrateFileUpload();
  // demonstrateUploadAndWait();
  // demonstrateFileManagement();
}

export {
  demonstrateFileUpload,
  demonstrateUploadAndWait,
  demonstrateFileManagement
};
