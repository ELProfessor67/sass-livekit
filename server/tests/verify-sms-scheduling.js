// server/tests/verify-sms-scheduling.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { smsSchedulingWorker } from '../workers/sms-scheduling-worker.js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
    console.log('--- SMS Scheduling Verification ---');

    // 1. Get a valid user
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

    if (userError || !users || users.length === 0) {
        console.error('No users found to test with');
        return;
    }

    const userId = users[0].id;
    console.log(`Using user ID: ${userId}`);

    // 2. Insert a test record with a past time
    const testSms = {
        user_id: userId,
        to_number: '+1234567890',
        from_number: '+0987654321',
        body: 'Test scheduled SMS verification',
        scheduled_for: new Date(Date.now() - 10000).toISOString(), // 10 seconds ago
        status: 'pending'
    };

    const { data: inserted, error: insertError } = await supabase
        .from('scheduled_sms')
        .insert(testSms)
        .select()
        .single();

    if (insertError) {
        console.error('Error inserting test SMS:', insertError);
        return;
    }

    console.log(`Inserted test SMS: ${inserted.id}`);

    // 3. Run the worker processing
    console.log('Running worker processing...');
    await smsSchedulingWorker.processPendingSMS();

    // 4. Check status
    const { data: updated, error: fetchError } = await supabase
        .from('scheduled_sms')
        .select('status, error_message')
        .eq('id', inserted.id)
        .single();

    if (fetchError) {
        console.error('Error fetching updated SMS:', fetchError);
        return;
    }

    console.log(`Updated status: ${updated.status}`);
    if (updated.status === 'failed') {
        console.log(`Error message: ${updated.error_message}`);
    }

    if (updated.status === 'sent' || (updated.status === 'failed' && updated.error_message.includes('Twilio credentials not found'))) {
        console.log('✅ Verification successful (status changed as expected)');
    } else {
        console.log('❌ Verification failed (status did not change as expected)');
    }
}

verify().catch(console.error);
