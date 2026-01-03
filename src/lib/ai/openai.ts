import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.warn("Aviso: OPENAI_API_KEY não encontrada nas variáveis de ambiente.");
}

export const openai = new OpenAI({
    apiKey: apiKey,
});
