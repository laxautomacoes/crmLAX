/**
 * Serviço de parsing de mensagens WhatsApp para criação automática de leads.
 * 
 * Duas abordagens:
 * 1. Estruturada (#lead): aceita AMBOS os formatos — com labels (Nome: João) ou sem labels (linha = valor)
 * 2. IA (#ia / /lead): texto livre processado pelo Gemini para extração de dados
 */

import { getAIModel } from '@/lib/ai/gemini';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface ParsedLeadData {
    name: string;
    phone: string;
    email?: string;
    interest?: string;
    source: 'whatsapp_structured' | 'whatsapp_ai' | 'whatsapp_audio';
}

export interface ParseResult {
    success: boolean;
    data?: ParsedLeadData;
    error?: string;
}

export type CommandType = 'structured' | 'ai' | 'audio' | null;

// ─── Detecção de Comando ────────────────────────────────────────────────────

const STRUCTURED_PREFIXES = ['#lead'];
const AI_PREFIXES = ['#ia', '/lead'];

/**
 * Detecta se a mensagem contém um comando de criação de lead.
 * Retorna o tipo de comando e o texto limpo (sem o prefixo).
 */
export function detectCommand(text: string): { type: CommandType; cleanText: string } {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // Checa todas as linhas — o prefixo pode ser a primeira linha inteira
    for (const prefix of STRUCTURED_PREFIXES) {
        if (lower === prefix || lower.startsWith(prefix + '\n') || lower.startsWith(prefix + ' ')) {
            const cleanText = trimmed.substring(prefix.length).trim();
            return { type: 'structured', cleanText };
        }
    }

    for (const prefix of AI_PREFIXES) {
        if (lower === prefix || lower.startsWith(prefix + '\n') || lower.startsWith(prefix + ' ')) {
            const cleanText = trimmed.substring(prefix.length).trim();
            return { type: 'ai', cleanText };
        }
    }

    return { type: null, cleanText: trimmed };
}

// ─── Parsing Estruturado ────────────────────────────────────────────────────

/** Mapeamento de variações de label para campos padronizados */
const FIELD_MAP: Record<string, keyof Pick<ParsedLeadData, 'name' | 'phone' | 'email' | 'interest'>> = {
    // Nome
    'nome': 'name', 'name': 'name', 'n': 'name', 'cliente': 'name',
    // Telefone
    'telefone': 'phone', 'tel': 'phone', 'fone': 'phone', 'phone': 'phone',
    'whatsapp': 'phone', 'whats': 'phone', 'celular': 'phone', 'cel': 'phone',
    'numero': 'phone', 'número': 'phone',
    // Email
    'email': 'email', 'e-mail': 'email', 'mail': 'email',
    // Interesse
    'interesse': 'interest', 'interest': 'interest', 'busca': 'interest',
    'procura': 'interest', 'quer': 'interest', 'imovel': 'interest', 'imóvel': 'interest', 'tipo': 'interest',
};

// Regex helpers para detecção automática
const PHONE_REGEX = /^[\d\s()+\-]{8,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tenta detectar o tipo de dado de uma linha pelo conteúdo (sem label).
 */
function detectFieldByContent(value: string): keyof Pick<ParsedLeadData, 'name' | 'phone' | 'email' | 'interest'> | null {
    const trimmed = value.trim();
    
    // Email: contém @
    if (EMAIL_REGEX.test(trimmed)) return 'email';
    
    // Telefone: maioria dígitos (8+ dígitos)
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15 && PHONE_REGEX.test(trimmed)) return 'phone';
    
    return null;
}

/**
 * Faz o parsing de uma mensagem estruturada.
 * Aceita dois formatos:
 * 
 * COM LABELS:
 *   Nome: João Silva
 *   Telefone: 48999999999
 * 
 * SEM LABELS (ordem: nome, telefone, email, interesse):
 *   João Silva
 *   48999999999
 *   joao@email.com
 *   Apartamento 2 quartos
 */
export function parseStructured(text: string): ParseResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const data: Partial<ParsedLeadData> = { source: 'whatsapp_structured' };

    // Primeiro, tenta o formato COM LABELS
    let hasLabels = false;
    for (const line of lines) {
        const match = line.match(/^\s*([^:–\-]+)\s*[:–\-]\s*(.+)\s*$/);
        if (!match) continue;

        const rawKey = match[1].trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const value = match[2].trim();
        const field = FIELD_MAP[rawKey];
        
        if (field && value) {
            hasLabels = true;
            if (field === 'phone') {
                data[field] = value.replace(/\D/g, '');
            } else {
                data[field] = value;
            }
        }
    }

    // Se não encontrou labels, tenta detecção AUTOMÁTICA por conteúdo
    if (!hasLabels || (!data.name && !data.phone)) {
        const autoData: Partial<ParsedLeadData> = { source: 'whatsapp_structured' };
        const unassigned: string[] = [];

        for (const line of lines) {
            const detected = detectFieldByContent(line);
            if (detected === 'email' && !autoData.email) {
                autoData.email = line.trim();
            } else if (detected === 'phone' && !autoData.phone) {
                autoData.phone = line.trim().replace(/\D/g, '');
            } else {
                unassigned.push(line.trim());
            }
        }

        // Atribuir linhas não-detectadas: primeira = nome, resto = interesse
        if (unassigned.length > 0 && !autoData.name) {
            autoData.name = unassigned.shift()!;
        }
        if (unassigned.length > 0 && !autoData.interest) {
            autoData.interest = unassigned.join(' ');
        }

        // Usar dados auto-detectados se forem melhores
        if (autoData.name && autoData.phone) {
            Object.assign(data, autoData);
        } else if (!data.name && autoData.name) {
            data.name = autoData.name;
        }
        if (!data.phone && autoData.phone) data.phone = autoData.phone;
        if (!data.email && autoData.email) data.email = autoData.email;
        if (!data.interest && autoData.interest) data.interest = autoData.interest;
    }

    // Validação de campos obrigatórios
    if (!data.name || !data.phone) {
        const missing: string[] = [];
        if (!data.name) missing.push('nome');
        if (!data.phone) missing.push('telefone');
        return {
            success: false,
            error: `Campos obrigatórios faltando: ${missing.join(', ')}\n\nFormato aceito:\n#lead\nJoão Silva\n48999999999\njoao@email.com\nApartamento 2 quartos`
        };
    }

    return {
        success: true,
        data: data as ParsedLeadData
    };
}

// ─── Parsing com IA (Gemini) ────────────────────────────────────────────────

const AI_EXTRACTION_PROMPT = `Você é um assistente de CRM imobiliário. Extraia os dados de lead da mensagem abaixo.

REGRAS:
- Extraia: nome, telefone, email e interesse/tipo de imóvel
- O telefone DEVE conter apenas dígitos (remova parênteses, traços, espaços)
- Se o campo não estiver presente na mensagem, retorne null
- Retorne APENAS o JSON, sem texto adicional, sem markdown

Mensagem:
"""
{MESSAGE}
"""

Responda SOMENTE com este formato JSON:
{"name": "string ou null", "phone": "string ou null", "email": "string ou null", "interest": "string ou null"}`;

/**
 * Usa o Gemini para extrair dados de lead de uma mensagem de texto livre.
 */
export async function parseWithAI(text: string): Promise<ParseResult> {
    if (!text.trim()) {
        return {
            success: false,
            error: 'Mensagem vazia. Envie o texto com os dados do lead após o comando.\n\n📝 *Exemplos:*\n\n#ia João Silva quer um apartamento de 2 quartos, tel 48999887766, email joao@gmail.com\n\n/lead Maria Santos, 11988776655, procura casa 3 quartos em Florianópolis'
        };
    }

    try {
        const prompt = AI_EXTRACTION_PROMPT.replace('{MESSAGE}', text);
        const model = getAIModel('gemini-2.0-flash'); // Modelo rápido para extração simples
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text().trim();

        // Extrair JSON da resposta (pode vir com ```json ... ```)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                success: false,
                error: 'A IA não conseguiu extrair os dados. Tente reformular a mensagem com nome e telefone claros.'
            };
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validar campos obrigatórios
        if (!parsed.name || !parsed.phone) {
            const missing: string[] = [];
            if (!parsed.name) missing.push('nome');
            if (!parsed.phone) missing.push('telefone');
            return {
                success: false,
                error: `A IA não conseguiu identificar: ${missing.join(', ')}\n\n📝 *Dica:* Mencione claramente o nome e telefone do lead.\n\n*Exemplo:*\n#ia Cliente João Silva, telefone 48999887766, quer apartamento 2 quartos`
            };
        }

        return {
            success: true,
            data: {
                name: parsed.name,
                phone: String(parsed.phone).replace(/\D/g, ''),
                email: parsed.email || undefined,
                interest: parsed.interest || undefined,
                source: 'whatsapp_ai'
            }
        };
    } catch (error: any) {
        console.error('[WhatsAppLeadParser] Erro no parsing com IA:', error.message);
        return {
            success: false,
            error: 'Erro ao processar com IA. Tente o formato estruturado:\n\n📝 *Formato alternativo:*\n#lead\nJoão Silva\n48999999999\njoao@email.com\nApartamento 2 quartos'
        };
    }
}

// ─── Prompt de Extração de Lead via Áudio ────────────────────────────────────

const AUDIO_EXTRACTION_PROMPT = `Você é um assistente de CRM imobiliário. Sua tarefa é analisar este áudio e:

1. Transcrever o conteúdo do áudio
2. Determinar se o áudio contém dados para cadastro de um LEAD (cliente potencial)
3. Se contiver, extrair: nome, telefone, email e interesse imobiliário

Um áudio contém dados de lead quando o corretor menciona informações de um novo cliente/prospect, como:
- "Cadastrar o lead João Silva..."
- "Novo cliente: Maria, telefone 48..."
- "Recebi contato do Pedro sobre apartamento..."

Se o áudio for uma conversa casual, cumprimento, ou NÃO contiver dados de cadastro, retorne:
{"is_lead": false}

Se contiver dados de lead, retorne:
{"is_lead": true, "name": "string", "phone": "string ou null", "email": "string ou null", "interest": "string ou null"}

REGRAS:
- phone: apenas dígitos, com DDD (ex: 48999887766)
- Se o telefone não for mencionado, retorne phone como null
- name é obrigatório para considerar como lead
- Responda SOMENTE com o JSON, sem explicações`;

/**
 * Usa o Gemini multimodal para transcrever áudio e extrair dados de lead.
 * Retorna null se o áudio não contiver dados de lead.
 */
export async function parseAudioLead(audioBase64: string, mimeType: string): Promise<ParseResult | null> {
    try {
        const model = getAIModel('gemini-2.0-flash');

        // Remover prefixo data:... se existir
        const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

        const result = await model.generateContent([
            AUDIO_EXTRACTION_PROMPT,
            {
                inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType || 'audio/ogg',
                },
            },
        ]);

        const response = await result.response;
        const responseText = response.text().trim();

        // Extrair JSON da resposta
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[AudioParser] Gemini não retornou JSON válido:', responseText);
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Se o Gemini decidiu que não é um lead, ignorar silenciosamente
        if (!parsed.is_lead) {
            return null;
        }

        // Validar campo obrigatório: nome
        if (!parsed.name) {
            return {
                success: false,
                error: '🎙️ Identifiquei que você quer cadastrar um lead, mas não consegui entender o *nome*.\n\n📝 *Dica:* Grave novamente mencionando claramente o nome e telefone do cliente.'
            };
        }

        // Validar telefone
        if (!parsed.phone) {
            return {
                success: false,
                error: `🎙️ Identifiquei o lead *${parsed.name}*, mas não consegui entender o *telefone*.\n\n📝 *Dica:* Grave novamente incluindo o número com DDD. Ex: "cadastrar João Silva, telefone 48 9 9988 7766"`
            };
        }

        return {
            success: true,
            data: {
                name: parsed.name,
                phone: String(parsed.phone).replace(/\D/g, ''),
                email: parsed.email || undefined,
                interest: parsed.interest || undefined,
                source: 'whatsapp_audio'
            }
        };
    } catch (error: any) {
        console.error('[AudioParser] Erro ao processar áudio:', error.message);
        return {
            success: false,
            error: '❌ Erro ao processar o áudio. Tente novamente ou use o formato de texto:\n\n#lead\nNome: João\nTel: 48999999999'
        };
    }
}

// ─── Função Principal ───────────────────────────────────────────────────────

/**
 * Processa uma mensagem de WhatsApp e tenta extrair dados de lead.
 * Retorna null se a mensagem não contiver um comando de criação.
 */
export async function parseWhatsAppLeadMessage(text: string): Promise<{ result: ParseResult; type: CommandType } | null> {
    const { type, cleanText } = detectCommand(text);

    if (!type) return null;

    if (type === 'structured') {
        return { result: parseStructured(cleanText), type };
    }

    if (type === 'ai') {
        return { result: await parseWithAI(cleanText), type };
    }

    return null;
}
