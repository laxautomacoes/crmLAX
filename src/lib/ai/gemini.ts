import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Obtém o modelo Gemini 2.0 Flash — motor principal de IA do CRM LAX.
 * Inicialização "lazy" para evitar erros durante o build se as chaves não estiverem presentes.
 */
export function getAIModel(modelName = 'gemini-1.5-pro') {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
        console.error('ERRO: GOOGLE_GEMINI_API_KEY não encontrada nas variáveis de ambiente.');
        throw new Error('Configuração de IA incompleta.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName });
}
