'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createStage(tenantId: string, name: string) {
    const supabase = await createClient();

    // Pegar o último order_index
    const { data: lastStage } = await supabase
        .from('lead_stages')
        .select('order_index')
        .eq('tenant_id', tenantId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

    const nextOrder = lastStage ? lastStage.order_index + 1 : 0;

    const { data, error } = await supabase
        .from('lead_stages')
        .insert({
            tenant_id: tenantId,
            name,
            order_index: nextOrder
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/leads');
    return { success: true, data };
}

export async function updateStageName(stageId: string, name: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('lead_stages')
        .update({ name })
        .eq('id', stageId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/leads');
    return { success: true };
}

export async function deleteStage(stageId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('lead_stages')
        .delete()
        .eq('id', stageId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/leads');
    return { success: true };
}

const DEFAULT_STAGES = [
    'Novo',
    'Em Atendimento',
    'Atendimento',
    'Visita',
    'Negociação',
    'Venda Feita',
    'Venda Efetivada',
    'Venda Perdida',
    'Perdido'
];

export async function getStages(tenantId: string) {
    const supabase = await createClient();

    let { data: stages, error } = await supabase
        .from('lead_stages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('order_index', { ascending: true });

    if (error) return { success: false, error: error.message };

    // Se não houver estágios, criar o conjunto padrão
    if (!stages || stages.length === 0) {
        const stagesToInsert = DEFAULT_STAGES.map((name, index) => ({
            tenant_id: tenantId,
            name,
            order_index: index
        }));

        const { data: newStages, error: insertError } = await supabase
            .from('lead_stages')
            .insert(stagesToInsert)
            .select();

        if (insertError) {
            // Se houver erro de conflito de unicidade (código 23505), 
            // significa que outro processo já criou os estágios
            // Neste caso, buscamos os estágios novamente
            if (insertError.code === '23505') {
                console.log('Estágios já foram criados por outro processo, buscando novamente...');
                const { data: existingStages, error: refetchError } = await supabase
                    .from('lead_stages')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('order_index', { ascending: true });

                if (refetchError) {
                    console.error('Erro ao buscar estágios existentes:', refetchError);
                    return { success: false, error: refetchError.message };
                }

                stages = existingStages;
            } else {
                console.error('Erro ao criar estágios padrão:', insertError);
                return { success: false, error: insertError.message };
            }
        } else {
            stages = newStages;
        }
    }

    return { success: true, data: stages };
}

export async function duplicateStage(tenantId: string, stageId: string) {
    const supabase = await createClient();

    // 1. Buscar estágio original
    const { data: stage } = await supabase
        .from('lead_stages')
        .select('*')
        .eq('id', stageId)
        .single();

    if (!stage) return { success: false, error: 'Estágio não encontrado' };

    // 2. Buscar todos os estágios para verificar nomes existentes
    const { data: allStages } = await supabase
        .from('lead_stages')
        .select('name')
        .eq('tenant_id', tenantId);

    // 3. Gerar nome com sufixo incremental
    const baseName = stage.name.replace(/ \(Cópia \d+\)$/, '');
    let copyNumber = 1;
    let newName = `${baseName} (Cópia ${copyNumber})`;

    const existingNames = (allStages as any[])?.map((s) => s.name) || [];

    while (existingNames.includes(newName)) {
        copyNumber++;
        newName = `${baseName} (Cópia ${copyNumber})`;
    }

    // 4. Criar nova cópia
    return await createStage(tenantId, newName);
}
