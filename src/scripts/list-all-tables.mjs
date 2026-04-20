import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function listAllTables() {
  const { data, error } = await supabase
    .from('pg_catalog.pg_tables')
    .select('tablename, schemaname')
    .filter('schemaname', 'eq', 'public')

  if (error) {
    // If pg_catalog is restricted, try information_schema via RPC or just listing public tables
    console.error('Erro ao acessar pg_catalog:', error.message)
    
    // Try listing common tables one by one to verify access
    const commonTables = ['profiles', 'assets', 'tenants', 'leads', 'notifications', 'ai_prompts', 'integrations'];
    console.log('\nValidando acesso às tabelas principais via PostgREST:')
    for (const table of commonTables) {
      const { count, error: err } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (err) {
        console.log(`- ${table}: ERRO (${err.message})`);
      } else {
        console.log(`- ${table}: OK (Registros: ${count})`);
      }
    }
  } else {
    console.log('--- LISTA DE TODAS AS TABELAS (Schema: public) ---')
    data.forEach(t => console.log(`- ${t.tablename}`))
    console.log('------------------------------------------------')
  }
}

listAllTables()
