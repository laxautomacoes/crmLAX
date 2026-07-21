import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

async function run() {
  const { data, error } = await supabase.from('leads').select('id, partner_id, partners(name)').not('partner_id', 'is', null).limit(1)
  console.log('Error:', error?.message)
  console.log('Data:', JSON.stringify(data, null, 2))
}
run()
