
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkWorkflow() {
    const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', '6480e63d-7a78-401a-b876-752594610881')
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Workflow Nodes:', JSON.stringify(data.nodes, null, 2));

    const { data: delayed, error: delayedError } = await supabase
        .from('workflow_delayed_executions')
        .select('*')
        .eq('workflow_id', '6480e63d-7a78-401a-b876-752594610881');

    console.log('Delayed Executions:', JSON.stringify(delayed, null, 2));
}

checkWorkflow();
