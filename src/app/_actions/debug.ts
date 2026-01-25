'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function checkApprovalStatusColumn() {
    const supabase = createAdminClient()
    
    try {
        // Tentar buscar uma linha da tabela assets para ver as colunas
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .limit(1)

        if (error) {
            return { success: false, error: error.message }
        }

        // Se o erro do usuário for "Could not find the 'approval_status' column",
        // esta query deve falhar se executada com a coluna no select.
        // Mas o postgrest faz cache do esquema.
        
        return { success: true, columns: data && data.length > 0 ? Object.keys(data[0]) : 'no data' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function runMigrationFix() {
    const supabase = createAdminClient()
    
    try {
        // Tentar executar o SQL diretamente via RPC se houver uma função para isso,
        // ou via uma query que force a criação da coluna.
        // Como não temos acesso direto ao terminal psql aqui de forma fácil,
        // vamos tentar usar o service role para verificar se a coluna existe.
        
        // No Supabase, não há um comando direto via JS SDK para rodar ALTER TABLE arbitrário
        // a menos que haja uma function RPC definida.
        
        return { success: false, message: "Manual migration required via Supabase Dashboard SQL Editor" }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
