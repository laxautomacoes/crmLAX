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
        
    if (!tenant) return { provider: 'gemini', model: 'gemini-2.5-flash' };

    const { data: limit } = await supabase
        .from('plan_limits')
        .select('ai_provider, ai_model')
        .eq('plan_type', tenant.plan_type)
        .single();
        
    // Forçar uso do modelo mais avançado se o banco de dados retornar modelos antigos ou com typo
    let resolvedModel = limit?.ai_model || (limit?.ai_provider === 'openai' ? 'gpt-4o' : 'gemini-3.1-pro-preview');
    
    // Atualiza automaticamente typos ou modelos antigos para o topo de linha
    // Atualiza modelos depreciados/antigos automaticamente
    const DEPRECATED_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    if (DEPRECATED_MODELS.includes(resolvedModel)) {
        resolvedModel = 'gemini-2.5-flash'; // Substituição custo-eficiente para modelos depreciados
    }

    return {
        provider: (limit?.ai_provider as AIProviderName) || 'gemini',
        model: resolvedModel
    };
}

async function fetchImageAsInlinePart(url: string) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return {
            inlineData: {
                data: base64,
                mimeType: contentType
            }
        };
    } catch (error) {
        console.error('Erro ao converter imagem para base64 para o Gemini:', error);
        return null;
    }
}

export async function runAI(tenantId: string, prompt: string, imageUrls?: string[]): Promise<AIResult> {
    const { provider, model: modelName } = await getAIConfig(tenantId);

    if (provider === 'openai') {
        const content: any[] = [{ type: 'text', text: prompt }];
        if (imageUrls && imageUrls.length > 0) {
            imageUrls.forEach(url => {
                const isImage = /\.(jpg|jpeg|png|webp|gif|heic|heif)(\?.*)?$/i.test(url) || url.includes('/images/') || url.includes('marketing-studio') || url.includes('crm-attachments');
                if (isImage) {
                    content.push({
                        type: 'image_url',
                        image_url: { url }
                    });
                }
            });
        }

        const response = await openai.chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content }],
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
        const parts: any[] = [prompt];

        if (imageUrls && imageUrls.length > 0) {
            for (const url of imageUrls) {
                const isImage = /\.(jpg|jpeg|png|webp|gif|heic|heif)(\?.*)?$/i.test(url) || url.includes('/images/') || url.includes('marketing-studio') || url.includes('crm-attachments');
                if (isImage) {
                    const part = await fetchImageAsInlinePart(url);
                    if (part) parts.push(part);
                }
            }
        }

        const result = await model.generateContent(parts);
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
