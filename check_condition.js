
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

    const conditionNode = workflows.nodes.find(n => n.id === 'fq74a');
    console.log('Condition Node Data:', JSON.stringify(conditionNode?.data, null, 2));
}

checkWorkflow();
