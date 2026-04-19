'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AIPrompt = {
    id: string;
    tenant_id: string | null;
    name: string;
    system_prompt: string;
    ai_provider: 'openai' | 'gemini';
    created_at: string;
    updated_at: string;
};

export async function getAIPrompts(tenantId?: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    let query = supabase.from('ai_prompts').select('*').order('created_at', { ascending: false });

    if (tenantId) {
        query = query.eq('tenant_id', tenantId);
    } else {
        query = query.is('tenant_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data as AIPrompt[];
}

export async function saveAIPrompt(data: { id?: string; name: string; system_prompt: string; ai_provider: 'openai' | 'gemini'; tenant_id?: string | null }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    if (data.id) {
        const { error } = await supabase
            .from('ai_prompts')
            .update({
                name: data.name,
                system_prompt: data.system_prompt,
                ai_provider: data.ai_provider,
            })
            .eq('id', data.id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('ai_prompts')
            .insert({
                name: data.name,
                system_prompt: data.system_prompt,
                ai_provider: data.ai_provider,
                tenant_id: data.tenant_id || null,
            });
        if (error) throw error;
    }

    revalidatePath('/settings/ias');
    revalidatePath('/superadmin/ai');
    return { success: true };
}

export async function deleteAIPrompt(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { error } = await supabase.from('ai_prompts').delete().eq('id', id);
    if (error) throw error;
    
    revalidatePath('/settings/ias');
    revalidatePath('/superadmin/ai');
    return { success: true };
}

export async function enhancePromptWithAI(currentPrompt: string, provider: 'openai' | 'gemini') {
    if (!currentPrompt || currentPrompt.length < 5) {
        throw new Error("Prompt muito curto para ser melhorado.");
    }

    const INSTRUCTION = `
Atue como um Engenheiro de Prompt especialista em Marketing Imobiliário.
Melhore o seguinte rascunho de prompt do usuário. 
Sua resposta deve conter APENAS o prompt melhorado, sem enrolação.
Mantenha o foco em criar imagens/textos realistas, de alto padrão, focados em venda e lifestyle. O prompt final deve ser em português.

RASCUNHO DO USUÁRIO:
${currentPrompt}
`;

    try {
        if (provider === 'gemini') {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(INSTRUCTION);
            return { enhancedPrompt: result.response.text().trim() };
        } else {
            const OpenAI = (await import('openai')).default;
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: INSTRUCTION }],
                temperature: 0.7,
            });
            return { enhancedPrompt: response.choices[0].message?.content?.trim() || currentPrompt };
        }
    } catch (e: any) {
        console.error("Erro ao melhorar prompt:", e);
        throw new Error(e.message || "Erro desconhecido ao melhorar prompt");
    }
}
