
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkWorkflow() {
    const { data: workflows } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', '6480e63d-7a78-401a-b876-752594610881')
        .single();

    if (!workflows) return;

    for (const n of workflows.nodes) {
        console.log('NODE_ID:' + n.id);
        console.log('NODE_TYPE:' + n.type);
        console.log('NODE_DATA:' + JSON.stringify(n.data));
    }
    for (const e of workflows.edges) {
        console.log('EDGE:' + e.source + '->' + e.target);
    }
}

checkWorkflow();
