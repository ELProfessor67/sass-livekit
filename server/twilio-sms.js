import 'dotenv/config';
import express from 'express';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import { SMSAssistantService } from './services/sms-assistant-service.js';
import { SMSDatabaseService } from './services/sms-database-service.js';
import { SMSAIService } from './services/sms-ai-service.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize SMS services
const smsDatabaseService = new SMSDatabaseService(supabase);
const smsAIService = new SMSAIService();
const smsAssistantService = new SMSAssistantService(smsDatabaseService, smsAIService, null); // Pass null since we'll create client per request

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'SMS router is working!' });
});

/**
 * Send SMS message using Twilio
 * POST /api/v1/twilio/sms/send
 */
router.post('/send', async (req, res) => {
  try {
    console.log('SMS send request received:', {
      body: req.body,
      headers: req.headers
    });

    const { 
      accountSid, 
      authToken, 
      to, 
      from, 
      body, 
      conversationId,
      userId 
    } = req.body;

    if (!accountSid || !authToken || !to || !body) {
      console.log('Missing required fields:', { accountSid: !!accountSid, authToken: !!authToken, to, from, body });
      return res.status(400).json({
        success: false,
        message: 'accountSid, authToken, to, and body are required'
      });
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Get user's actual Twilio phone number from database
    let fromNumber = from;
    if (!from || from === '+1234567890' || from === '') {
      try {
        const { data: phoneNumbers, error: phoneError } = await supabase
          .from('phone_number')
          .select('number')
          .eq('status', 'active')
          .limit(1);

        if (phoneError) {
          console.error('Error fetching user phone numbers:', phoneError);
        } else if (phoneNumbers && phoneNumbers.length > 0) {
          fromNumber = phoneNumbers[0].number;
          console.log('Using phone number from database:', fromNumber);
        } else {
          // Fallback: get first available phone number from Twilio
          const twilioNumbers = await client.incomingPhoneNumbers.list({ limit: 1 });
          if (twilioNumbers.length > 0) {
            fromNumber = twilioNumbers[0].phoneNumber;
            console.log('Using first Twilio phone number:', fromNumber);
          }
        }
      } catch (dbError) {
        console.error('Error fetching phone number from database:', dbError);
      }
    }

    // Send SMS message
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to,
      // Only add statusCallback if we have a public URL
      ...((process.env.NGROK_URL || (process.env.BACKEND_URL && !process.env.BACKEND_URL.includes('localhost'))) && {
        statusCallback: `${process.env.NGROK_URL || process.env.BACKEND_URL}/api/v1/twilio/sms/status-callback`,
        statusCallbackEvent: ['sent', 'delivered', 'failed', 'undelivered']
      })
    });

    // Store message in database
    try {
      const { error: insertError } = await supabase
        .from('sms_messages')
        .insert({
          message_sid: message.sid,
          user_id: userId,
          to_number: to,
          from_number: fromNumber,
          body,
          direction: 'outbound',
          status: message.status,
          date_created: message.dateCreated || new Date().toISOString(),
          date_sent: message.dateSent || null,
          date_updated: message.dateUpdated || new Date().toISOString()
        });

      if (insertError) {
        console.error('Error storing SMS message:', insertError);
      }
    } catch (dbError) {
      console.error('Database error storing SMS message:', dbError);
    }

    res.json({
      success: true,
      message: 'SMS sent successfully',
      data: {
        messageSid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated
      }
    });

  } catch (error) {
    console.error('Error sending SMS:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status
    });

    // Handle specific Twilio errors
    let userMessage = error.message || 'Failed to send SMS';
    let statusCode = 500;

    if (error.code === 21408) {
      userMessage = 'SMS sending is not enabled for this region. Please enable international SMS in your Twilio account or use a different phone number.';
      statusCode = 400;
    } else if (error.code === 21211) {
      userMessage = 'Invalid phone number format. Please check the phone number.';
      statusCode = 400;
    } else if (error.code === 21610) {
      userMessage = 'The "From" phone number is not a valid Twilio phone number.';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code
    });
  }
});

/**
 * Get SMS messages for a conversation
 * GET /api/v1/twilio/sms/conversation/:conversationId
 */
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { accountSid, authToken } = req.query;

    if (!accountSid || !authToken) {
      return res.status(400).json({
        success: false,
        message: 'accountSid and authToken are required'
      });
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Get messages from database for this phone number
    const { data: messages, error } = await supabase
      .from('sms_messages')
      .select('*')
      .or(`to_number.eq.${conversationId.replace('conv_', '')},from_number.eq.${conversationId.replace('conv_', '')}`)
      .order('date_created', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    res.json({
      success: true,
      data: messages.map(msg => ({
        messageSid: msg.message_sid,
        to: msg.to_number,
        from: msg.from_number,
        body: msg.body,
        direction: msg.direction,
        status: msg.status,
        dateCreated: msg.date_created,
        dateSent: msg.date_sent,
        dateUpdated: msg.date_updated,
        errorCode: msg.error_code,
        errorMessage: msg.error_message,
        numSegments: msg.num_segments,
        price: msg.price,
        priceUnit: msg.price_unit
      }))
    });

  } catch (error) {
    console.error('Error fetching SMS messages:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch SMS messages'
    });
  }
});

/**
 * Webhook endpoint for incoming SMS messages
 * POST /api/v1/twilio/sms/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const {
      MessageSid,
      From,
      To,
      Body,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
      NumSegments,
      Price,
      PriceUnit,
      DateCreated,
      DateSent,
      DateUpdated
    } = req.body;

    console.log('🔔 SMS WEBHOOK TRIGGERED:', {
      MessageSid,
      From,
      To,
      Body: Body?.substring(0, 100) + '...',
      MessageStatus,
      ErrorCode,
      ErrorMessage,
      DateCreated,
      DateSent,
      DateUpdated
    });

    // Process the SMS using our new SMS assistant service
    try {
      await smsAssistantService.processIncomingSMS({
        fromNumber: From,
        toNumber: To,
        messageBody: Body,
        messageSid: MessageSid
      });

      // Respond to Twilio with empty response (no further action needed)
      res.status(200).send('SMS processed');
      
    } catch (error) {
      console.error('Error processing SMS:', error);
      res.status(500).send('Error processing SMS');
    }

  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process SMS webhook'
    });
  }
});

/**
 * Status callback endpoint for SMS delivery status
 * POST /api/v1/twilio/sms/status-callback
 */
router.post('/status-callback', async (req, res) => {
  try {
    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
      To,
      From,
      Body,
      DateCreated,
      DateSent,
      DateUpdated
    } = req.body;

    console.log('SMS status callback:', {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage
    });

    // Update message status in database
    try {
      const { error: updateError } = await supabase
        .from('sms_messages')
        .update({
          status: MessageStatus,
          error_code: ErrorCode,
          error_message: ErrorMessage,
          date_sent: DateSent || null,
          date_updated: DateUpdated || new Date().toISOString()
        })
        .eq('message_sid', MessageSid);

      if (updateError) {
        console.error('Error updating SMS message status:', updateError);
      }
    } catch (dbError) {
      console.error('Database error updating SMS message status:', dbError);
    }

    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  } catch (error) {
    console.error('Error processing SMS status callback:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process status callback'
    });
  }
});

export { router as twilioSmsRouter };
