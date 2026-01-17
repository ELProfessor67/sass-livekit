
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

    console.log('--- NODES ---');
    workflows.nodes.forEach(n => {
        console.log(`Node|${n.id}|${n.type}|${JSON.stringify(n.data)}`);
    });
    console.log('--- EDGES ---');
    workflows.edges.forEach(e => {
        console.log(`Edge|${e.source}|->|${e.target}|${JSON.stringify(e.data)}`);
    });
}

checkWorkflow();
