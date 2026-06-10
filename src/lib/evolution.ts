const EVOLUTION_API_URL = process.env.EVOLUTION_URL?.replace(/['"]/g, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_GLOBAL_API_KEY?.replace(/['"]/g, '');

async function evolutionFetch(endpoint: string, options: RequestInit = {}) {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
        throw new Error('Evolution API configuration missing');
    }

    const baseUrl = EVOLUTION_API_URL.endsWith('/') 
        ? EVOLUTION_API_URL.slice(0, -1) 
        : EVOLUTION_API_URL;
    
    const url = `${baseUrl}${endpoint}`;
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY,
                'Authorization': `Bearer ${EVOLUTION_API_KEY}`,
                ...options.headers,
            },
        });

        const responseText = await response.text();
        let data: any = null;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { message: responseText };
        }

        if (!response.ok) {
            const nestedMessage = data?.response?.message;
            let rawError = nestedMessage || data?.message || data?.error;
            if (rawError && typeof rawError === 'object') {
                rawError = rawError.message || JSON.stringify(rawError);
            }
            const errorMessage = Array.isArray(rawError)
                ? rawError.join(', ')
                : rawError || `Evolution API error: ${response.statusText}`;
            
            console.error('Evolution API Error Details:', {
                status: response.status,
                url,
                payload: options.body,
                response: data
            });

            throw new Error(errorMessage);
        }

        return data;
    } catch (error: any) {
        // Se o erro já foi tratado (lançado pelo bloco !response.ok acima), re-lançar
        if (error.message && !error.message.includes('fetch')) {
            throw error;
        }
        console.error('Fetch error in evolutionFetch:', {
            url,
            message: error.message,
            cause: error.cause
        });
        throw new Error(`Falha na conexão com o servidor de WhatsApp. Verifique se ${baseUrl} está online.`);
    }
}

export const evolutionService = {
    async createInstance(instanceName: string, webhookUrl?: string) {
        const cleanName = instanceName.replace(/[^a-zA-Z0-9]/g, '');
        const payload: any = {
            instanceName: cleanName,
            token: Math.random().toString(36).substring(2, 15),
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
        };

        // Configurar webhook automaticamente se URL fornecida
        if (webhookUrl) {
            payload.webhook = {
                url: webhookUrl,
                byEvents: false,
                base64: true,
                events: ['MESSAGES_UPSERT']
            };
        }

        return evolutionFetch('/instance/create', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async setWebhook(instanceName: string, webhookUrl: string) {
        return evolutionFetch(`/webhook/set/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                webhook: {
                    url: webhookUrl,
                    byEvents: false,
                    base64: true,
                    events: ['MESSAGES_UPSERT'],
                    enabled: true
                }
            }),
        });
    },

    async getQrCode(instanceName: string) {
        return evolutionFetch(`/instance/connect/${instanceName}`);
    },

    async getInstanceStatus(instanceName: string) {
        return evolutionFetch(`/instance/connectionState/${instanceName}`);
    },

    /** Busca detalhes da instância incluindo ownerJid (número conectado) */
    async fetchInstanceInfo(instanceName: string) {
        return evolutionFetch(`/instance/fetchInstances?instanceName=${instanceName}`);
    },

    async logoutInstance(instanceName: string) {
        return evolutionFetch(`/instance/logout/${instanceName}`, {
            method: 'DELETE',
        });
    },

    async deleteInstance(instanceName: string) {
        return evolutionFetch(`/instance/delete/${instanceName}`, {
            method: 'DELETE',
        });
    },

    async checkNumber(instanceName: string, number: string) {
        return evolutionFetch(`/chat/whatsappNumbers/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({ numbers: [number] }),
        });
    },

    async sendMessage(instanceName: string, number: string, message: string) {
        return evolutionFetch(`/message/sendText/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                number,
                options: { delay: 1200, presence: 'composing' },
                text: message, // Evolution V2
                textMessage: { text: message }, // Fallback V1
            }),
        });
    },

    async sendMedia(instanceName: string, number: string, mediaUrl: string, mediaType: 'image' | 'video', caption?: string) {
        // Detectar mimetype com base no mediaType
        const mimetypeMap: Record<string, string> = {
            image: 'image/png',
            video: 'video/mp4',
        };
        const mimetype = mimetypeMap[mediaType] || 'application/octet-stream';

        return evolutionFetch(`/message/sendMedia/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                number,
                options: { delay: 1200, presence: 'composing' },
                mediatype: mediaType,
                mimetype,
                media: mediaUrl,
                caption: caption || '',
            }),
        });
    },

    async sendDocument(instanceName: string, number: string, documentUrl: string, fileName: string, caption?: string) {
        return evolutionFetch(`/message/sendMedia/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                number,
                options: { delay: 1200, presence: 'composing' },
                mediatype: 'document',
                mimetype: 'application/pdf',
                media: documentUrl,
                fileName,
                caption: caption || '',
            }),
        });
    },

    async getBase64FromMediaMessage(instanceName: string, messageId: string): Promise<{ base64: string; mimetype: string }> {
        return evolutionFetch(`/chat/getBase64FromMediaMessage/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                message: {
                    key: {
                        id: messageId
                    }
                },
                convertToMp4: false
            }),
        });
    }
};
