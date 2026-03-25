import { createLog } from './src/lib/utils/logging';
import { createAdminClient } from './src/lib/supabase/admin';

async function testLogging() {
    console.log('--- Iniciando Teste de Logging ---');
    
    // Simular um log
    console.log('1. Tentando criar um log de teste...');
    const result = await createLog({
        action: 'login',
        entityType: 'auth',
        details: { test: true, message: 'Teste de integração de logs' }
    });

    if (result.success) {
        console.log('✅ Log inserido com sucesso!');
    } else {
        console.error('❌ Erro ao inserir log:', result.error);
        if (result.error === 'User not authenticated') {
            console.log('ℹ️ Nota: O erro de autenticação é esperado se rodar fora de um contexto de Server Action com sessão.');
        }
    }

    // Verificar no banco (usando admin client)
    const supabase = createAdminClient();
    const { data: latestLogs, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('❌ Erro ao consultar logs no banco:', error);
    } else if (latestLogs && latestLogs.length > 0) {
        console.log('✅ Último log encontrado no banco:');
        console.log(JSON.stringify(latestLogs[0], null, 2));
    } else {
        console.log('ℹ️ Nenhum log encontrado na tabela system_logs.');
    }
}

testLogging();
