import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { stripe } from './stripe.js';
import { AccessToken, RoomServiceClient, AgentDispatchClient } from 'livekit-server-sdk';
import { twilioAdminRouter } from './twilio-admin.js';
import { twilioUserRouter } from './twilio-user.js';
import { twilioSmsRouter } from './twilio-sms.js';
import { livekitSipRouter } from './livekit-sip.js';
import { livekitPerAssistantTrunkRouter } from './livekit-per-assistant-trunk.js';
import { livekitOutboundCallsRouter } from './livekit-outbound-calls.js';
import { recordingWebhookRouter } from './recording-webhook.js';
import { getCallRecordingInfo } from './twilio-trunk-service.js';
import smsWebhookRouter from './sms-webhook.js';
import { outboundCallsRouter } from './outbound-calls.js';
import { campaignManagementRouter } from './campaign-management.js';
import { csvManagementRouter } from './csv-management.js';
import { livekitRoomRouter } from './livekit-room.js';
import { campaignEngine } from './campaign-execution-engine.js';
import { connect } from '@ngrok/ngrok';
import knowledgeBaseRouter from './routes/knowledge-base.js';
import supportAccessRouter from './routes/supportAccess.js';
import minutesRouter from './routes/minutes.js';
import minutesPricingRouter from './routes/minutes-pricing.js';
import adminRouter from './routes/admin.js';
import whitelabelRouter from './routes/whitelabel.js';
import userRouter from './routes/user.js';
import { tenantMiddleware } from './middleware/tenantMiddleware.js';
import './workers/supportAccessCleanup.js';





const app = express();

// CRITICAL: Stripe webhook MUST be mounted FIRST, before ANY middleware
// This ensures it bypasses CORS, tenant middleware, and JSON parsing
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabaseAdmin) {
  console.warn('Supabase admin client not configured for Stripe webhooks');
}

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe webhook endpoint - mounted DIRECTLY on app BEFORE all middleware
// Use raw body parser that matches application/json (with or without charset)
app.post('/api/v1/stripe/webhook', express.raw({
  type: (req) => {
    const contentType = req.headers['content-type'] || '';
    return contentType.includes('application/json');
  }
}), async (req, res) => {
  console.log('[Stripe Webhook] ✅ Webhook route handler executing - bypassed ALL middleware');
  console.log('[Stripe Webhook] Request details:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    headers: {
      'stripe-signature': req.headers['stripe-signature'] ? 'present' : 'missing',
      'content-type': req.headers['content-type'],
    }
  });

  if (!stripeWebhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).send('Stripe webhook not configured');
  }

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
  } catch (err) {
    console.error('⚠️  Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Log all webhook events for debugging
    console.log(`[Stripe Webhook] Received event: ${event.type} (id: ${event.id})`);

    // Handle both payment_intent.succeeded and charge.updated events
    let metadata = {};
    let amountCents = 0;
    let currency = 'USD';
    let paymentIntentId = null;
    let chargeId = null;
    let shouldCredit = false;

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      metadata = paymentIntent.metadata || {};
      amountCents = Number(metadata.amount || paymentIntent.amount || 0);
      currency = (metadata.currency || paymentIntent.currency || 'usd').toUpperCase();
      paymentIntentId = paymentIntent.id;
      shouldCredit = paymentIntent.status === 'succeeded';

      console.log(`[Stripe Webhook] PaymentIntent metadata:`, JSON.stringify(metadata, null, 2));
    } else if (event.type === 'charge.updated' || event.type === 'charge.succeeded') {
      const charge = event.data.object;

      // Only process if charge succeeded
      if (charge.status !== 'succeeded' || !charge.paid) {
        console.log(`Charge ${charge.id} not succeeded (status: ${charge.status}, paid: ${charge.paid}), skipping`);
        return res.json({ received: true });
      }

      paymentIntentId = charge.payment_intent || null;
      chargeId = charge.id;

      // Try to get metadata from charge first
      metadata = charge.metadata || {};
      amountCents = Number(metadata.amount || charge.amount || 0);
      currency = (metadata.currency || charge.currency || 'usd').toUpperCase();

      console.log(`[Stripe Webhook] Charge metadata:`, JSON.stringify(metadata, null, 2));

      // If metadata is missing from charge (common with Stripe Connect), retrieve from PaymentIntent
      if ((!metadata.user_id || !metadata.minutes) && paymentIntentId) {
        try {
          console.log(`[Stripe Webhook] Metadata missing from charge, retrieving PaymentIntent ${paymentIntentId}`);
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (paymentIntent.metadata && Object.keys(paymentIntent.metadata).length > 0) {
            console.log(`[Stripe Webhook] Found metadata on PaymentIntent:`, JSON.stringify(paymentIntent.metadata, null, 2));
            // Merge PaymentIntent metadata with charge metadata (PaymentIntent takes precedence)
            metadata = { ...metadata, ...paymentIntent.metadata };
            // Update amount/currency from PaymentIntent if not in metadata
            if (!metadata.amount) {
              amountCents = paymentIntent.amount;
            }
            if (!metadata.currency) {
              currency = (paymentIntent.currency || 'usd').toUpperCase();
            }
          }
        } catch (retrieveError) {
          console.error(`[Stripe Webhook] Failed to retrieve PaymentIntent ${paymentIntentId}:`, retrieveError.message);
          // Continue with charge metadata even if retrieval fails
        }
      }

      shouldCredit = true;
    } else if (event.type === 'payment_intent.created') {
      // Acknowledge payment_intent.created events (no action needed, just log)
      const paymentIntent = event.data.object;
      console.log(`[Stripe Webhook] PaymentIntent created: ${paymentIntent.id} (status: ${paymentIntent.status})`);
      return res.json({ received: true, success: true });
    } else {
      // Other event types, just acknowledge
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}, acknowledging`);
      return res.json({ received: true, success: true });
    }

    if (!shouldCredit) {
      return res.json({ received: true });
    }

    const userId = metadata.user_id;
    const minutes = Number(metadata.minutes || 0);

    if (!supabaseAdmin) {
      console.error('Supabase admin client not available to process Stripe webhook');
      return res.status(500).send('Supabase not configured');
    }

    if (!userId || !minutes || minutes <= 0) {
      console.error('❌ [Stripe Webhook] CRITICAL: Missing required metadata for minutes credit', {
        eventType: event.type,
        paymentIntentId,
        chargeId,
        metadata,
        hasUserId: !!userId,
        hasMinutes: !!minutes,
        minutesValue: minutes,
      });
      // Don't return success - log as error so it's visible
      return res.status(400).json({
        received: true,
        error: 'Missing user_id or minutes in metadata',
        metadata
      });
    }

    console.log(`[Stripe Webhook] ✅ Processing: Crediting ${minutes} minutes to user ${userId} (${event.type})`);

    // Check if we've already processed this payment (idempotency)
    const paymentId = paymentIntentId || chargeId;
    if (paymentId) {
      const { data: existingPurchase } = await supabaseAdmin
        .from('minutes_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('notes', `Stripe ${paymentId.startsWith('pi_') ? 'PaymentIntent' : 'Charge'} ${paymentId}`)
        .maybeSingle();

      if (existingPurchase) {
        console.log(`[Stripe Webhook] ⚠️ Payment ${paymentId} already processed, skipping duplicate`);
        return res.json({ received: true, message: 'Already processed' });
      }
    }

    // Fetch current minutes_limit - use service role to bypass RLS
    console.log(`[Stripe Webhook] Looking up user ${userId}...`);
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, minutes_limit, tenant, role, slug_name')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('❌ [Stripe Webhook] Database error fetching user:', {
        userId,
        error: userError.message,
        code: userError.code,
        details: userError.details,
      });
      return res.status(500).json({
        received: true,
        error: 'Database error fetching user',
        userId
      });
    }

    if (!userData) {
      console.error('❌ [Stripe Webhook] User not found in database:', {
        userId,
        paymentIntentId,
        chargeId,
        metadata,
      });
      return res.status(404).json({
        received: true,
        error: `User ${userId} not found for minutes credit`,
        userId
      });
    }

    const tenant = userData.tenant || 'main';
    const isWhitelabelCustomer = tenant !== 'main' && userData.role !== 'admin' && !userData.slug_name;

    // For whitelabel customers: increase customer's minutes AND decrease admin's available minutes
    if (isWhitelabelCustomer) {
      console.log(`[Stripe Webhook] Whitelabel customer detected (tenant: ${tenant}), processing purchase...`);

      // Find the whitelabel admin (user with slug_name matching customer's tenant)
      const { data: whitelabelAdmin, error: adminError } = await supabaseAdmin
        .from('users')
        .select('id, minutes_limit, minutes_used, tenant, slug_name')
        .eq('slug_name', tenant)
        .eq('role', 'admin')
        .single();

      if (adminError || !whitelabelAdmin) {
        console.error('❌ [Stripe Webhook] Whitelabel admin not found for tenant:', tenant);
        return res.status(404).json({
          received: true,
          error: `Whitelabel admin not found for tenant ${tenant}`,
          userId
        });
      }

      // Check if admin has enough minutes available
      const adminAvailable = (whitelabelAdmin.minutes_limit || 0) - (whitelabelAdmin.minutes_used || 0);
      if (adminAvailable < minutes) {
        console.error('❌ [Stripe Webhook] Admin does not have enough minutes available:', {
          adminAvailable,
          requested: minutes,
          adminId: whitelabelAdmin.id
        });
        return res.status(400).json({
          received: true,
          error: `Admin does not have enough minutes available (${adminAvailable} available, ${minutes} requested)`,
          userId
        });
      }

      // 1. Increase customer's minutes_limit
      const customerCurrentLimit = userData.minutes_limit || 0;
      const customerNewLimit = customerCurrentLimit + minutes;

      const { error: customerUpdateError } = await supabaseAdmin
        .from('users')
        .update({ minutes_limit: customerNewLimit })
        .eq('id', userId);

      if (customerUpdateError) {
        console.error('❌ [Stripe Webhook] Error updating customer minutes:', customerUpdateError);
        return res.status(500).json({
          received: true,
          error: 'Failed to update customer minutes',
          userId
        });
      }

      // 2. Decrease admin's available minutes by increasing minutes_used
      const adminNewUsed = (whitelabelAdmin.minutes_used || 0) + minutes;

      const { error: adminUpdateError } = await supabaseAdmin
        .from('users')
        .update({ minutes_used: adminNewUsed })
        .eq('id', whitelabelAdmin.id);

      if (adminUpdateError) {
        console.error('❌ [Stripe Webhook] Error updating admin minutes_used:', adminUpdateError);
        // Rollback customer minutes if admin update fails
        await supabaseAdmin
          .from('users')
          .update({ minutes_limit: customerCurrentLimit })
          .eq('id', userId);
        return res.status(500).json({
          received: true,
          error: 'Failed to update admin minutes',
          userId
        });
      }

      console.log(`[Stripe Webhook] ✅ Customer ${userId} credited ${minutes} minutes (new balance: ${customerNewLimit})`);
      console.log(`[Stripe Webhook] ✅ Admin ${whitelabelAdmin.id} minutes_used increased by ${minutes} (new used: ${adminNewUsed})`);

      // Record purchase for customer (credit)
      // NOTE: Minutes were already added above (line 296), so we set payment_method to 'stripe_webhook'
      // to prevent the database trigger from adding minutes again
      const paymentIdentifier = paymentIntentId || chargeId || 'unknown';
      const paymentType = paymentIntentId ? 'PaymentIntent' : 'Charge';

      const { error: purchaseError } = await supabaseAdmin
        .from('minutes_purchases')
        .insert({
          user_id: userId, // Customer's purchase record
          minutes_purchased: minutes,
          amount_paid: amountCents / 100,
          currency,
          payment_method: 'stripe_webhook', // Use 'stripe_webhook' to indicate minutes were already added by webhook handler
          status: 'completed',
          notes: `Stripe ${paymentType} ${paymentIdentifier} (purchased from whitelabel admin ${whitelabelAdmin.slug_name})`,
        });

      if (purchaseError) {
        console.error('Error creating customer purchase record:', purchaseError);
      }

      // Record debit for admin (debit - minutes sold to customer)
      const { error: debitError } = await supabaseAdmin
        .from('minutes_purchases')
        .insert({
          user_id: whitelabelAdmin.id, // Admin's debit record
          minutes_purchased: minutes,
          amount_paid: amountCents / 100,
          currency,
          payment_method: 'whitelabel_customer_sale', // This identifies it as a debit - trigger should skip it
          status: 'completed',
          notes: `Sold ${minutes} minutes to customer ${userId} via Stripe ${paymentType} ${paymentIdentifier}`,
        });

      if (debitError) {
        console.error('Error creating admin debit record:', debitError);
      }

      return res.json({ received: true, success: true });
    }

    // Regular purchase flow (main tenant users or whitelabel admins)
    console.log(`[Stripe Webhook] ✅ User found: ${userId} (tenant: ${userData.tenant || 'main'})`);

    const currentLimit = userData.minutes_limit || 0;
    const newLimit = currentLimit + minutes;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ minutes_limit: newLimit })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating minutes_limit from Stripe webhook:', updateError);
      return res.status(500).send('Failed to update minutes');
    }

    console.log(`[Stripe Webhook] Successfully credited ${minutes} minutes. New balance: ${newLimit}`);

    // Record purchase in minutes_purchases
    // NOTE: Minutes were already added above (line 381), so we set payment_method to 'stripe_webhook'
    // to prevent the database trigger from adding minutes again (trigger only processes certain payment_methods)
    const paymentIdentifier = paymentIntentId || chargeId || 'unknown';
    const paymentType = paymentIntentId ? 'PaymentIntent' : 'Charge';

    const { error: purchaseError } = await supabaseAdmin
      .from('minutes_purchases')
      .insert({
        user_id: userId, // Fixed: was targetUserId (undefined)
        minutes_purchased: minutes,
        amount_paid: amountCents / 100,
        currency,
        payment_method: 'stripe_webhook', // Use 'stripe_webhook' to indicate minutes were already added by webhook handler
        status: 'completed',
        notes: `Stripe ${paymentType} ${paymentIdentifier}${isWhitelabelCustomer ? ` (purchased by customer ${userId})` : ''}`,
      });

    if (purchaseError) {
      console.error('Error creating minutes_purchases record from Stripe webhook:', purchaseError);
      // Non-fatal if minutes already credited
    } else {
      console.log(`[Stripe Webhook] Created purchase record for user ${userId}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error handling Stripe webhook event:', err);
    res.status(500).send('Webhook handler failed');
  }
});

console.log('[Server] ✅ Stripe webhook handler mounted at /api/v1/stripe/webhook (BEFORE all middleware)');

// Now apply global middleware AFTER Stripe webhook
app.use(cors());
app.use(express.urlencoded({ extended: false }));

// JSON body parser must come AFTER the Stripe webhook handler
// This ensures Stripe webhooks get raw body for signature verification
app.use(express.json());

// Apply tenant middleware to all routes (webhook router mounted above should bypass this)
app.use(tenantMiddleware);
console.log('[Server] Tenant middleware applied');

app.use('/api/v1/twilio', twilioAdminRouter);
app.use('/api/v1/twilio/user', twilioUserRouter);
app.use('/api/v1/twilio/sms', twilioSmsRouter);
app.use('/api/v1/livekit', livekitSipRouter);
app.use('/api/v1/livekit', livekitPerAssistantTrunkRouter);
app.use('/api/v1/livekit', livekitOutboundCallsRouter);
app.use('/api/v1/recording', recordingWebhookRouter);
app.use('/api/v1/sms', smsWebhookRouter);
app.use('/api/v1/outbound-calls', outboundCallsRouter);
app.use('/api/v1/campaigns', campaignManagementRouter);
app.use('/api/v1/csv', csvManagementRouter);
app.use('/api/v1/livekit', livekitRoomRouter);
app.use('/api/v1/knowledge-base', knowledgeBaseRouter);
app.use('/api/v1/support-access', supportAccessRouter);
app.use('/api/v1/minutes', minutesRouter);
app.use('/api/v1', minutesPricingRouter); // Minutes pricing routes (includes /admin/minutes-pricing and /minutes-pricing)
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/whitelabel', whitelabelRouter);
app.use('/api/v1/user', userRouter);
console.log('Knowledge base routes registered at /api/v1/knowledge-base');
console.log('Support access routes registered at /api/v1/support-access');
console.log('Minutes routes registered at /api/v1/minutes');
console.log('Minutes pricing routes registered at /api/v1/minutes-pricing and /api/v1/admin/minutes-pricing');
console.log('Admin routes registered at /api/v1/admin');
console.log('White label routes registered at /api/v1/whitelabel');
console.log('User routes registered at /api/v1/user');

// Recording routes (matching voiceagents pattern exactly)

// Get recording information for a call
app.get('/api/v1/call/:callSid/recordings', async (req, res) => {
  try {
    const { callSid } = req.params;
    const { accountSid, authToken } = req.query;

    if (!accountSid || !authToken) {
      return res.status(400).json({
        success: false,
        message: 'accountSid and authToken are required'
      });
    }

    const result = await getCallRecordingInfo({ accountSid, authToken, callSid });
    res.json(result);
  } catch (error) {
    console.error('Error getting call recording info:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Proxy endpoint to serve recording audio files with authentication
app.get('/api/v1/call/recording/:recordingSid/audio', async (req, res) => {
  try {
    const { recordingSid } = req.params;
    const { accountSid, authToken } = req.query;

    // Decode URL-encoded parameters
    const decodedAccountSid = decodeURIComponent(accountSid);
    const decodedAuthToken = decodeURIComponent(authToken);

    if (!decodedAccountSid || !decodedAuthToken) {
      return res.status(400).json({
        success: false,
        message: 'accountSid and authToken are required'
      });
    }

    // Construct the Twilio recording URL
    const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${decodedAccountSid}/Recordings/${recordingSid}.wav`;

    // Debug: Log credential info
    console.log('Audio request debug:', {
      recordingSid,
      accountSid: decodedAccountSid,
      accountSidLength: decodedAccountSid?.length,
      authTokenLength: decodedAuthToken?.length,
      authTokenPreview: decodedAuthToken?.substring(0, 10) + '...',
      recordingUrl
    });

    // Make authenticated request to Twilio
    const response = await fetch(recordingUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${decodedAccountSid}:${decodedAuthToken}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch recording from Twilio:', response.status, response.statusText);

      // Get the error response body for better debugging
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error('Twilio error response:', errorBody);
      } catch (e) {
        console.error('Could not read error response body');
      }

      return res.status(response.status).json({
        success: false,
        message: `Failed to fetch recording: ${response.statusText}`,
        error: errorBody
      });
    }

    // Get the audio data as a buffer
    const audioBuffer = await response.arrayBuffer();

    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Send the audio data
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('Error proxying recording audio:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});





const PORT = process.env.PORT || 4000;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * Dispatch an agent to a LiveKit room
 * POST /api/v1/livekit/dispatch
 */
app.post('/api/v1/livekit/dispatch', async (req, res) => {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST;

    const { roomName, agentName = 'ai', metadata = {} } = req.body;

    if (!roomName) {
      return res.status(400).json({
        success: false,
        message: 'roomName is required'
      });
    }

    console.log(`Dispatching agent '${agentName}' to room '${roomName}'`);

    // Create or update room with agent dispatch metadata
    const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

    try {
      // Update room metadata to include agent dispatch information
      await roomService.updateRoomMetadata(roomName, JSON.stringify({
        agentName,
        ...metadata,
        source: 'web',
        dispatched: true,
      }));

      console.log(`Agent '${agentName}' dispatched to room '${roomName}'`);

      res.json({
        success: true,
        message: `Agent ${agentName} dispatched to room ${roomName}`,
        roomName,
        agentName,
      });
    } catch (error) {
      // If room doesn't exist, create it
      await roomService.createRoom({
        name: roomName,
        metadata: JSON.stringify({
          agentName,
          ...metadata,
          source: 'web',
          dispatched: true,
        }),
      });

      console.log(`Created new room '${roomName}' and dispatched agent '${agentName}'`);

      res.json({
        success: true,
        message: `Room created and agent ${agentName} dispatched`,
        roomName,
        agentName,
      });
    }

  } catch (err) {
    console.error('Error dispatching agent:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to dispatch agent',
      error: err.message
    });
  }
});

app.post('/api/v1/livekit/create-token', async (req, res) => {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST;

    const { roomName, identity: requestedIdentity, metadata = {}, dispatch, roomConfig } = req.body;

    // Use provided room name or generate one
    const room = roomName || `room-${Math.random().toString(36).slice(2, 8)}`;
    const identity = requestedIdentity || `web-${Math.random().toString(36).slice(2, 8)}`;

    console.log('Creating LiveKit token:', { room, identity, hasDispatch: !!dispatch });

    // If dispatch is requested, create room with agent configuration
    if (dispatch || roomConfig) {
      const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

      try {
        // Prepare room metadata with assistant configuration
        const assistantId = metadata.assistantId || dispatch?.metadata?.assistantId;
        const roomMetadata = {
          ...metadata,
          assistantId,
          source: 'web',
          callType: 'web',
          agentName: dispatch?.agentName || 'ai',
        };

        // Create room with agent dispatch metadata
        await roomService.createRoom({
          name: room,
          metadata: JSON.stringify(roomMetadata),
        });

        console.log(`✅ Room '${room}' created with agent dispatch metadata`);

        // Wait a moment for room to be fully created before dispatching
        await new Promise(resolve => setTimeout(resolve, 500));

        // Dispatch agent using AgentDispatchClient (same as voiceagents)
        try {
          // Convert WebSocket URL to HTTP/HTTPS for API calls
          let httpUrl = livekitUrl;
          if (livekitUrl.startsWith('wss://')) {
            httpUrl = livekitUrl.replace('wss://', 'https://');
          } else if (livekitUrl.startsWith('ws://')) {
            httpUrl = livekitUrl.replace('ws://', 'http://');
          }

          console.log(`🤖 Dispatching agent to room '${room}' via ${httpUrl}`);

          // Create AgentDispatchClient (same pattern as voiceagents)
          const agentDispatchClient = new AgentDispatchClient(
            httpUrl,
            apiKey,
            apiSecret
          );

          const agentName = dispatch?.agentName || 'ai';
          const agentMetadata = {
            agentId: assistantId,
            callType: 'web',
            roomName: room,
            source: 'web',
            ...(dispatch?.metadata || {}),
          };

          console.log(`📤 Dispatching agent with params:`, {
            room,
            agentName,
            metadata: agentMetadata
          });

          const dispatchResult = await agentDispatchClient.createDispatch(
            room,
            agentName,
            {
              metadata: JSON.stringify(agentMetadata),
            }
          );

          console.log('✅ Agent dispatched successfully:', JSON.stringify(dispatchResult, null, 2));

        } catch (dispatchError) {
          console.error('❌ Failed to dispatch agent:', dispatchError.message);
          console.error('❌ Dispatch error details:', dispatchError);
          console.error('❌ Full error:', JSON.stringify(dispatchError, Object.getOwnPropertyNames(dispatchError), 2));
          // Continue anyway - user can still connect
        }

      } catch (roomError) {
        // Room might already exist, continue
        console.warn(`Room creation note: ${roomError.message}`);
      }
    }

    // Create access token
    const grant = {
      room,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      metadata: JSON.stringify(metadata),
    });
    at.addGrant(grant);
    const jwt = await at.toJwt();

    res.json({
      success: true,
      message: 'Token created successfully',
      result: { identity, accessToken: jwt },
    });
  } catch (err) {
    console.error('Error creating LiveKit token:', err);
    res.status(500).json({ success: false, message: 'Failed to create token', error: err.message });
  }
});

// Minimal Cal.com setup endpoint: creates an event type and returns its id/slug
app.post('/api/v1/calendar/setup', async (req, res) => {
  try {
    const {
      cal_api_key,
      cal_event_type_slug,
      cal_timezone = 'UTC',
      cal_event_title = 'Assistant Meeting',
      cal_event_length = 30,
    } = req.body || {};

    if (!cal_api_key || !cal_event_type_slug) {
      return res.status(400).json({ success: false, message: 'cal_api_key and cal_event_type_slug are required' });
    }

    const slug = String(cal_event_type_slug)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'voice-agent-meeting';

    const resp = await fetch('https://api.cal.com/v2/event-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cal_api_key}`,
      },
      body: JSON.stringify({
        title: cal_event_title || 'Assistant Meeting',
        slug,
        length: Number(cal_event_length) || 30,
        timeZone: cal_timezone || 'UTC',
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      // Bubble up Cal.com error for easier debugging
      return res.status(resp.status).json({ success: false, message: 'Cal.com error', error: data });
    }

    const id = data?.data?.id || data?.id || data?.eventType?.id;
    const retSlug = data?.data?.slug || data?.slug || slug;

    return res.json({ success: true, eventTypeId: String(id), eventTypeSlug: String(retSlug) });
  } catch (err) {
    console.error('Calendar setup failed', err);
    return res.status(500).json({ success: false, message: 'Calendar setup failed' });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);

  // Start campaign execution engine
  campaignEngine.start();
  console.log('🚀 Campaign execution engine started');

  // Start ngrok tunnel for Twilio webhooks
  if (process.env.NGROK_AUTHTOKEN) {
    try {
      const listener = await connect({
        addr: PORT,
        authtoken_from_env: true
      });

      console.log(`🌐 ngrok tunnel established at: ${listener.url()}`);
      console.log(`📱 Use this URL for Twilio webhooks: ${listener.url()}/api/v1/twilio/sms/webhook`);
      console.log(`📞 Use this URL for Twilio status callbacks: ${listener.url()}/api/v1/twilio/sms/status-callback`);

      // Store the ngrok URL for use in SMS sending
      process.env.NGROK_URL = listener.url();

      // SMS webhooks are configured automatically when phone numbers are assigned to assistants

    } catch (error) {
      console.error('❌ Failed to start ngrok tunnel:', error.message);
      console.log('💡 Make sure NGROK_AUTHTOKEN is set in your .env file');
    }
  } else {
    console.log('⚠️  NGROK_AUTHTOKEN not set - webhooks will not work with localhost');
    console.log('💡 Add NGROK_AUTHTOKEN to your .env file to enable ngrok tunnel');

    // SMS webhooks are configured automatically when phone numbers are assigned to assistants
  }
});


