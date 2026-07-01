import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('leads')
    .update({ source: 'Parceria', lead_source: 'Parceria' })
    .eq('campaign', 'CR Ronaldo')
    .in('source', ['Indicação', 'Indicacao', 'indicação', 'indicacao']);

  if (error) {
    console.error("ERROR UPDATING LEADS:", error);
  } else {
    console.log("SUCCESS UPDATING LEADS:", data);
  }
}
run();
