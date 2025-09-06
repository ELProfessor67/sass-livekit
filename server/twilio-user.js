// server/twilio-user.js
import express from 'express';
import Twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import { createMainTrunkForUser } from './twilio-trunk-service.js';

export const twilioUserRouter = express.Router();

// Supabase client for user credentials
const supa = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Test endpoint to verify route is working
 * GET /api/v1/twilio/user/test
 */
twilioUserRouter.get('/test', (req, res) => {
  res.json({ success: true, message: 'Twilio user routes are working', timestamp: new Date().toISOString() });
});

/**
 * Get user's active Twilio credentials
 * GET /api/v1/twilio/user/credentials
 */
twilioUserRouter.get('/credentials', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID required' });
    }

    const { data, error } = await supa
      .from('user_twilio_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({ success: true, credentials: null });
      }
      throw error;
    }

    res.json({ success: true, credentials: data });
  } catch (error) {
    console.error('Error fetching user Twilio credentials:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch credentials' });
  }
});

/**
 * Get user's phone numbers using their credentials
 * GET /api/v1/twilio/user/phone-numbers
 */
twilioUserRouter.get('/phone-numbers', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID required' });
    }

    // Get user's active credentials
    const { data: credentials, error: credError } = await supa
      .from('user_twilio_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (credError) {
      if (credError.code === 'PGRST116') {
        console.log('No credentials found for user:', userId);
        return res.status(404).json({ success: false, message: 'No Twilio credentials found' });
      }
      console.error('Database error:', credError);
      return res.status(500).json({ success: false, message: 'Database error occurred' });
    }

    if (!credentials) {
      console.log('No credentials found for user:', userId);
      return res.status(404).json({ success: false, message: 'No Twilio credentials found' });
    }

    // Create Twilio client with user's credentials
    const twilio = Twilio(credentials.account_sid, credentials.auth_token);

    const all = await twilio.incomingPhoneNumbers.list({ limit: 1000 });

    const rows = all.map((n) => {
      const row = {
        sid: n.sid,
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName || '',
        voiceUrl: n.voiceUrl || '',
        voiceApplicationSid: n.voiceApplicationSid || '',
        trunkSid: n.trunkSid || null,
        mapped: false, // TODO: Check if mapped in user's phone_number table
      };
      return { ...row, usage: classifyUsage(row, credentials.trunk_sid) };
    });

    const unusedOnly = req.query.unused === '1';
    const strict = req.query.strict === '1';
    const filtered = unusedOnly
      ? rows.filter((n) => (strict ? isStrictlyUnused(n) : isUnusedForOurWebhook(n, credentials.trunk_sid)) && !n.mapped)
      : rows;

    res.json({ success: true, numbers: filtered });
  } catch (error) {
    console.error('Error fetching user phone numbers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch phone numbers' });
  }
});

/**
 * Attach phone number to user's trunk
 * POST /api/v1/twilio/user/trunk/attach
 */
twilioUserRouter.post('/trunk/attach', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID required' });
    }

    const { phoneSid } = req.body;
    if (!phoneSid) {
      return res.status(400).json({ success: false, message: 'Phone SID required' });
    }

    // Get user's active credentials
    const { data: credentials, error: credError } = await supa
      .from('user_twilio_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (credError) {
      if (credError.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'No Twilio credentials found' });
      }
      console.error('Database error:', credError);
      return res.status(500).json({ success: false, message: 'Database error occurred' });
    }

    if (!credentials) {
      return res.status(404).json({ success: false, message: 'No Twilio credentials found' });
    }

    // Create Twilio client with user's credentials
    const twilio = Twilio(credentials.account_sid, credentials.auth_token);

    // Attach phone number to user's trunk
    await twilio.incomingPhoneNumbers(phoneSid).update({
      trunkSid: credentials.trunk_sid,
    });

    res.json({ success: true, message: 'Phone number attached to trunk' });
  } catch (error) {
    console.error('Error attaching phone to trunk:', error);
    res.status(500).json({ success: false, message: 'Failed to attach phone to trunk' });
  }
});

/**
 * Create main trunk for user (auto-generated)
 * POST /api/v1/twilio/user/create-main-trunk
 */
twilioUserRouter.post('/create-main-trunk', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID required' });
    }

    const { accountSid, authToken, label } = req.body;
    if (!accountSid || !authToken || !label) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountSid, authToken, and label are required' 
      });
    }

    // Create main trunk for the user
    const trunkResult = await createMainTrunkForUser({
      accountSid,
      authToken,
      userId,
      label
    });

    if (!trunkResult.success) {
      return res.status(500).json({
        success: false,
        message: trunkResult.message || 'Failed to create main trunk'
      });
    }

    res.json({
      success: true,
      message: 'Main trunk created successfully',
      trunkSid: trunkResult.trunkSid,
      trunkName: trunkResult.trunkName
    });
  } catch (error) {
    console.error('Error creating main trunk:', error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to create main trunk: ${error.message}` 
    });
  }
});

/**
 * Create assistant-specific trunk for user
 * POST /api/v1/twilio/user/assistant-trunk
 */
twilioUserRouter.post('/assistant-trunk', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID required' });
    }

    const { assistantId, assistantName, phoneNumber } = req.body;
    if (!assistantId || !assistantName || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'assistantId, assistantName, and phoneNumber required' });
    }

    // Get user's active credentials
    const { data: credentials, error: credError } = await supa
      .from('user_twilio_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (credError) {
      if (credError.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'No Twilio credentials found' });
      }
      console.error('Database error:', credError);
      return res.status(500).json({ success: false, message: 'Database error occurred' });
    }

    if (!credentials) {
      return res.status(404).json({ success: false, message: 'No Twilio credentials found' });
    }

    // Create Twilio client with user's credentials
    const twilio = Twilio(credentials.account_sid, credentials.auth_token);

    // Create a new trunk for this assistant
    const trunkName = `assistant-${assistantId}-${phoneNumber.replace('+', '')}`;
    const trunk = await twilio.trunking.v1.trunks.create({
      friendlyName: trunkName,
    });

    res.json({ 
      success: true, 
      trunk: {
        sid: trunk.sid,
        friendlyName: trunk.friendlyName,
      }
    });
  } catch (error) {
    console.error('Error creating assistant trunk:', error);
    res.status(500).json({ success: false, message: 'Failed to create assistant trunk' });
  }
});

// Helper functions (copied from twilio-admin.js)
function classifyUsage(row, userTrunkSid) {
  const { voiceUrl, voiceApplicationSid, trunkSid } = row;
  
  if (isTwilioDemoUrl(voiceUrl)) return 'demo';
  if (trunkSid === userTrunkSid) return 'ours';
  if (trunkSid) return 'trunk';
  if (voiceApplicationSid) return 'app';
  if (voiceUrl && !isTwilioDemoUrl(voiceUrl)) return 'foreign';
  return 'unused';
}

function isTwilioDemoUrl(url = '') {
  const u = String(url).trim().toLowerCase();
  return u.startsWith('https://demo.twilio.com') || u.startsWith('http://demo.twilio.com');
}

function isStrictlyUnused(n) {
  return n.usage === 'unused';
}

function isUnusedForOurWebhook(n, userTrunkSid) {
  return n.usage === 'unused' || (n.usage === 'trunk' && n.trunkSid !== userTrunkSid);
}
