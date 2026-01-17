// server/workers/sms-scheduling-worker.js
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

class SMSSchedulingWorker {
    constructor() {
        this.isRunning = false;
        this.checkInterval = 60000; // Check every 60 seconds
        this.timer = null;
    }

    /**
     * Start the worker
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[SMS Worker] Starting scheduled SMS worker...');

        this.processPendingSMS();

        this.timer = setInterval(() => {
            this.processPendingSMS();
        }, this.checkInterval);
    }

    /**
     * Stop the worker
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        console.log('[SMS Worker] Scheduled SMS worker stopped');
    }

    /**
     * Process all pending SMS messages that are due
     */
    async processPendingSMS() {
        try {
            const now = new Date().toISOString();

            // Get pending messages that are due
            const { data: pendingMessages, error } = await supabase
                .from('scheduled_sms')
                .select('*')
                .eq('status', 'pending')
                .lte('scheduled_for', now)
                .limit(10); // Process in batches

            if (error) {
                console.error('[SMS Worker] Error fetching pending SMS:', error);
                return;
            }

            if (!pendingMessages || pendingMessages.length === 0) {
                return;
            }

            console.log(`[SMS Worker] Found ${pendingMessages.length} scheduled SMS to send`);

            for (const msg of pendingMessages) {
                await this.sendScheduledSMS(msg);
            }
        } catch (err) {
            console.error('[SMS Worker] Unexpected error in processPendingSMS:', err);
        }
    }

    /**
     * Send a single scheduled SMS
     */
    async sendScheduledSMS(msg) {
        try {
            console.log(`[SMS Worker] Sending scheduled SMS ${msg.id} to ${msg.to_number}`);

            // 1. Mark as processing to avoid duplicate sending
            await supabase
                .from('scheduled_sms')
                .update({ status: 'processing', updated_at: new Date().toISOString() })
                .eq('id', msg.id);

            // 2. Get user's Twilio credentials
            const { data: credentials, error: credError } = await supabase
                .from('user_twilio_credentials')
                .select('*')
                .eq('user_id', msg.user_id)
                .eq('is_active', true)
                .single();

            if (credError || !credentials) {
                throw new Error(`Twilio credentials not found for user ${msg.user_id}`);
            }

            // 3. Send via Twilio
            const client = twilio(credentials.account_sid, credentials.auth_token);

            const response = await client.messages.create({
                body: msg.body,
                from: msg.from_number,
                to: msg.to_number
            });

            console.log(`[SMS Worker] SMS sent successfully. SID: ${response.sid}`);

            // 4. Update status to sent
            await supabase
                .from('scheduled_sms')
                .update({
                    status: 'sent',
                    updated_at: new Date().toISOString()
                })
                .eq('id', msg.id);

            // 5. Optionally also record in sms_messages table for history
            await supabase
                .from('sms_messages')
                .insert({
                    message_sid: response.sid,
                    user_id: msg.user_id,
                    to_number: msg.to_number,
                    from_number: msg.from_number,
                    body: msg.body,
                    direction: 'outbound',
                    status: response.status,
                    date_created: new Date().toISOString()
                });

        } catch (err) {
            console.error(`[SMS Worker] Error sending SMS ${msg.id}:`, err);

            // Update status to failed
            await supabase
                .from('scheduled_sms')
                .update({
                    status: 'failed',
                    error_message: err.message,
                    retry_count: (msg.retry_count || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', msg.id);
        }
    }
}

export const smsSchedulingWorker = new SMSSchedulingWorker();
