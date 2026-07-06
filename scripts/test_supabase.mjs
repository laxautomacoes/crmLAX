import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Using Supabase URL:', supabaseUrl)
  
  // 1. Testar conexão básica e ver perfis
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, full_name, tenant_id, role')
    .limit(5)

  if (pError) {
    console.error('Failed to fetch profiles:', pError)
  } else {
    console.log('Profiles found:', profiles)
  }

  // 2. Testar contagem de estágios
  const { data: stages, error: sError } = await supabase
    .from('lead_stages')
    .select('id, name, tenant_id')

  if (sError) {
    console.error('Failed to fetch lead_stages:', sError)
  } else {
    console.log(`Lead stages found (${stages?.length || 0}):`, stages)
  }

  // 3. Testar contagem de leads
  const { count: leadsCount, error: lError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  if (lError) {
    console.error('Failed to fetch leads:', lError)
  } else {
    console.log('Total leads count in database:', leadsCount)
  }
}

testConnection()
