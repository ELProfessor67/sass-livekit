import express from 'express';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import { SMSAssistantService } from './services/sms-assistant-service.js';
import { SMSDatabaseService } from './services/sms-database-service.js';
import { SMSAIService } from './services/sms-ai-service.js';

const router = express.Router();

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const smsDatabaseService = new SMSDatabaseService(supabase);
const smsAIService = new SMSAIService();
const smsAssistantService = new SMSAssistantService(smsDatabaseService, smsAIService, null); // Pass null since we'll create client per request

// SMS Webhook Handler
router.post('/webhook/sms', async (req, res) => {
  try {
    console.log('Received SMS webhook:', req.body);
    
    const { From: fromNumber, To: toNumber, Body: messageBody, MessageSid: messageSid } = req.body;
    
    if (!fromNumber || !toNumber || !messageBody) {
      console.error('Missing required SMS parameters');
      return res.status(400).send('Missing required parameters');
    }

    // Process the SMS
    await smsAssistantService.processIncomingSMS({
      fromNumber,
      toNumber,
      messageBody,
      messageSid
    });

    // Respond to Twilio with empty response (no further action needed)
    res.status(200).send('SMS processed');
    
  } catch (error) {
    console.error('Error processing SMS:', error);
    res.status(500).send('Error processing SMS');
  }
});

// Health check endpoint
router.get('/webhook/sms/health', (req, res) => {
  res.status(200).json({ status: 'SMS webhook is running' });
});

// Test SMS endpoint
router.post('/test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'phoneNumber and message are required' 
      });
    }

    const result = await smsAssistantService.testSMS(phoneNumber, message);
    res.json(result);
    
  } catch (error) {
    console.error('Error testing SMS:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error testing SMS',
      error: error.message 
    });
  }
});

export default router;
