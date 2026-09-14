'use server';

import { createClient } from "@/lib/supabase/server";

export async function saveViabilityStudy(data: {
    property_id?: string;
    property_unit_id?: string;
    title: string;
    builder_logo_url?: string;
    property_logo_url?: string;
    study_data: any;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
        if (!profile?.tenant_id) throw new Error('Perfil ou tenant não encontrado');

        const { data: study, error } = await supabase
            .from('viability_studies')
            .insert({
                tenant_id: profile.tenant_id,
                property_id: data.property_id || null,
                property_unit_id: data.property_unit_id || null,
                title: data.title,
                builder_logo_url: data.builder_logo_url || null,
                property_logo_url: data.property_logo_url || null,
                study_data: data.study_data,
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao salvar estudo:', error);
            throw new Error('Falha ao salvar o estudo no banco de dados.');
        }

        return { success: true, data: study };
    } catch (err: any) {
        console.error(err);
        return { success: false, error: err.message };
    }
}

export async function getViabilityStudy(id: string) {
    try {
        const supabase = await createClient();
        
        const { data, error } = await supabase
            .from('viability_studies')
            .select(`
                *,
                property:properties(id, title),
                unit:property_units(id, unit_number, valor_total)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        
        return { success: true, data };
    } catch (err: any) {
        console.error('Erro ao buscar estudo:', err);
        return { success: false, error: 'Erro ao carregar o estudo de viabilidade.' };
    }
}

export async function listViabilityStudies() {
    try {
        const supabase = await createClient();
        
        const { data, error } = await supabase
            .from('viability_studies')
            .select('id, title, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: 'Erro ao listar os estudos.' };
    }
}
