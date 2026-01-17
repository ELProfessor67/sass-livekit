
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listData() {
    console.log('--- Assistants ---');
    const { data: assistants, error: aError } = await supabase.from('assistant').select('id, name, user_id').limit(5);
    if (aError) console.error(aError);
    else console.log(JSON.stringify(assistants, null, 2));

    console.log('--- Workflows ---');
    const { data: workflows, error: wError } = await supabase.from('workflows').select('id, name, user_id, trigger_event').limit(5);
    if (wError) console.error(wError);
    else console.log(JSON.stringify(workflows, null, 2));

    console.log('--- Assistant Workflows ---');
    const { data: aw, error: awError } = await supabase.from('assistant_workflows').select('*').limit(5);
    if (awError) console.error(awError);
    else console.log(JSON.stringify(aw, null, 2));
}

listData();
