import { SupportAccessService } from '../lib/supportAccessService.js';

const supportAccessService = SupportAccessService.getInstance();

// Start cleanup every 5 minutes
setInterval(async () => {
  try {
    const cleanedCount = await supportAccessService.cleanupExpiredSessions();
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired support access sessions`);
    }
  } catch (error) {
    console.error('Error in support access cleanup:', error);
  }
}, 5 * 60 * 1000); // 5 minutes

console.log('🔄 Support access cleanup job started (every 5 minutes)');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, stopping support access cleanup job...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, stopping support access cleanup job...');
  process.exit(0);
});
