import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn('Aviso: GOOGLE_GEMINI_API_KEY não encontrada nas variáveis de ambiente.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

/** Modelo Gemini 2.0 Flash — motor principal de IA do CRM LAX */
export const aiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
