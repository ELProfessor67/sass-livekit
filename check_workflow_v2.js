
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkWorkflow() {
    const { data: assistant, error: assistantError } = await supabase
        .from('assistant')
        .select('*')
        .eq('id', 'd4fe5051-ffc7-4440-85c8-9be424229ff8')
        .single();

    console.log('Assistant ID:', assistant?.id);

    const { data: workflows, error: workflowError } = await supabase
        .from('assistant_workflows')
        .select(`
            workflow_id,
            workflow:workflows!workflow_id(*)
        `)
        .eq('assistant_id', 'd4fe5051-ffc7-4440-85c8-9be424229ff8');

    if (!workflows || workflows.length === 0) {
        console.log('No workflows linked to this assistant.');
        return;
    }

    for (const w of workflows) {
        console.log('--- Workflow:', w.workflow.name, '(', w.workflow_id, ') ---');
        console.log('Active:', w.workflow.is_active);
        w.workflow.nodes.forEach(n => {
            console.log(`Node: ID=${n.id}, Type=${n.type}, Event=${n.data?.event || 'N/A'}, Label=${n.data?.label || 'N/A'}`);
        });
    }
}

checkWorkflow();
