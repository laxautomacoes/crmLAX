import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Configuração do modelo Gemini.
 * Usando gemini-2.0-flash-exp ou gemini-pro conforme disponibilidade.
 */
export const aiModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash"
});
