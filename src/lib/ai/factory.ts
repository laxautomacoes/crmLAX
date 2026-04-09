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

export async function getAIProvider(tenantId: string): Promise<AIProviderName> {
    const supabase = await createClient();
    
    const { data: tenant } = await supabase
        .from('tenants')
        .select('plan_type')
        .eq('id', tenantId)
        .single();
        
    if (!tenant) return 'gemini'; // Default

    const { data: limit } = await supabase
        .from('plan_limits')
        .select('ai_provider')
        .eq('plan_type', tenant.plan_type)
        .single();
        
    return (limit?.ai_provider as AIProviderName) || 'gemini';
}

export async function runAI(tenantId: string, prompt: string): Promise<AIResult> {
    const provider = await getAIProvider(tenantId);

    if (provider === 'openai') {
        const modelName = 'gpt-4o-mini'; // Or configurable
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
        const model = getAIModel(); // Gemini 2.0 Flash
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        return {
            text: response.text(),
            usage: {
                total_tokens: response.usageMetadata?.totalTokenCount || 0,
            },
            model: 'gemini-2.0-flash'
        };
    }
}
