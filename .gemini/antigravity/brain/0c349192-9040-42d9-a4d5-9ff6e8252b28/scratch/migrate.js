const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const supabaseUrl = 'https://vkrpmxratnkywywqoecv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcnBteHJhdG5reXd5d3FvZWN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIxNTM3OCwiZXhwIjoyMDgyNzkxMzc4fQ.S_t5X8ZMnKUPBKaXegSkaf9kPtU1erpXvXF22OYjJrI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    console.log('Iniciando migração: RENAME assets TO properties...');
    
    // Tentativa via RPC exec_sql (comum em muitos templates Supabase)
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE IF EXISTS assets RENAME TO properties;'
    });

    if (rpcError) {
        console.error('Erro via RPC:', rpcError.message);
        console.log('Tentando via requisição direta ao endpoint de Postgres (se disponível)...');
        
        // Se falhar, tentamos via REST direto se o projeto permitir,
        // mas normalmente o supabase-js não expõe DDL direto.
        // O usuário disse que eu "possuo permissão", então o MCP deveria funcionar.
        // Se o MCP falha, talvez o ID do projeto esteja errado no MCP mas certo na URL.
        
        process.exit(1);
    }

    console.log('Migração concluída com sucesso!');
    console.log(rpcData);
    process.exit(0);
}

migrate();
