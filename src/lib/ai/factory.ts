import { getAIModel } from "./gemini";
import { openai } from "./openai";
import { createClient } from "../supabase/server";

export type AIProviderName = 'gemini' | 'openai';

interface AIResult {
    text: string;
    usage: {
        total_tokens: number;
    };
    model: string;
}

export async function getAIConfig(tenantId: string): Promise<{ provider: AIProviderName, model: string }> {
    const supabase = await createClient();
    
    const { data: tenant } = await supabase
        .from('tenants')
        .select('plan_type')
        .eq('id', tenantId)
        .single();
        
    if (!tenant) return { provider: 'gemini', model: 'gemini-1.5-pro' };

    const { data: limit } = await supabase
        .from('plan_limits')
        .select('ai_provider, ai_model')
        .eq('plan_type', tenant.plan_type)
        .single();
        
    // Forçar uso do modelo mais avançado se o banco de dados retornar modelos antigos ou com typo
    let resolvedModel = limit?.ai_model || (limit?.ai_provider === 'openai' ? 'gpt-4o' : 'gemini-3.1-pro-preview');
    
    // Atualiza automaticamente typos ou modelos antigos para o topo de linha
    if (resolvedModel === 'gemini-3-flash' || resolvedModel === 'gemini-1.5-flash' || resolvedModel === 'gemini-pro') {
        resolvedModel = 'gemini-3.1-pro-preview'; // Modelo de altíssima performance no momento
    }

    return {
        provider: (limit?.ai_provider as AIProviderName) || 'gemini',
        model: resolvedModel
    };
}

export async function runAI(tenantId: string, prompt: string): Promise<AIResult> {
    const { provider, model: modelName } = await getAIConfig(tenantId);

    if (provider === 'openai') {
        const response = await openai.chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });

        return {
            text: response.choices[0].message.content || '',
            usage: {
                total_tokens: response.usage?.total_tokens || 0,
            },
            model: modelName
        };
    } else {
        const model = getAIModel(modelName);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        return {
            text: response.text(),
            usage: {
                total_tokens: response.usageMetadata?.totalTokenCount || 0,
            },
            model: modelName
        };
    }
}
