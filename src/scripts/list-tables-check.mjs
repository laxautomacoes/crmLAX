import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const { data, error } = await supabase
    .from('assets')
    .select('id, title')
    .limit(1)

  if (error) {
    console.error('Erro ao acessar assets:', error.message)
  } else {
    console.log('Sucesso! Consegui acessar a tabela assets. Dados:', data)
  }

  const { data: tables, error: tablesError } = await supabase
    .rpc('get_tables_list') // Caso exista uma RPC
    || await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public')

  if (tablesError) {
    // Fallback para query direta se permissão permitir
    const { data: tablesRaw, error: errRaw } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
    console.log('Acesso ao profiles confirmado.')
  } else {
    console.log('Tabelas encontradas:', tables.map(t => t.tablename).join(', '))
  }
}
check()
