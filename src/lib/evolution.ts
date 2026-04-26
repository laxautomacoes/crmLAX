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
            const errorMessage = Array.isArray(nestedMessage)
                ? nestedMessage.join(', ')
                : Array.isArray(data?.message)
                    ? data.message.join(', ')
                    : nestedMessage || data?.message || data?.error || `Evolution API error: ${response.statusText}`;
            
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
        console.error('Fetch error in evolutionFetch:', {
            url,
            message: error.message,
            cause: error.cause
        });
        throw new Error(`Falha na conexão com o servidor de WhatsApp. Verifique se ${baseUrl} está online.`);
    }
}

export const evolutionService = {
    async createInstance(instanceName: string) {
        const cleanName = instanceName.replace(/[^a-zA-Z0-9]/g, '');
        return evolutionFetch('/instance/create', {
            method: 'POST',
            body: JSON.stringify({
                instanceName: cleanName,
                token: Math.random().toString(36).substring(2, 15),
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            }),
        });
    },

    async getQrCode(instanceName: string) {
        return evolutionFetch(`/instance/connect/${instanceName}`);
    },

    async getInstanceStatus(instanceName: string) {
        return evolutionFetch(`/instance/connectionState/${instanceName}`);
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
        // Tenta enviar no formato V2 primeiro (sendMedia com mediatype)
        return evolutionFetch(`/message/sendMedia/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                number,
                options: { delay: 1200, presence: 'composing' },
                mediatype: mediaType, // Evolution V2
                media: mediaUrl,
                caption: caption || '',
                // Fallback structure in case it's an older v2
                mediaMessage: {
                    mediatype: mediaType,
                    media: mediaUrl,
                    caption: caption || ''
                }
            }),
        }).catch(() => {
            // Fallback para V1 se o endpoint V2 não existir
            const endpoint = mediaType === 'image' ? `/message/sendImage/${instanceName}` : `/message/sendVideo/${instanceName}`;
            return evolutionFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    number,
                    options: { delay: 1200, presence: 'composing' },
                    media: mediaUrl,
                    caption: caption || ''
                }),
            });
        });
    },

    async sendDocument(instanceName: string, number: string, documentUrl: string, fileName: string, caption?: string) {
        return evolutionFetch(`/message/sendMedia/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                number,
                options: { delay: 1200, presence: 'composing' },
                mediatype: 'document', // Evolution V2
                media: documentUrl,
                fileName,
                caption: caption || '',
                // Fallback structure
                mediaMessage: {
                    mediatype: 'document',
                    media: documentUrl,
                    fileName,
                    caption: caption || ''
                }
            }),
        }).catch(() => {
            // Fallback para V1
            return evolutionFetch(`/message/sendDocument/${instanceName}`, {
                method: 'POST',
                body: JSON.stringify({
                    number,
                    options: { delay: 1200, presence: 'composing' },
                    document: documentUrl,
                    fileName,
                    caption: caption || ''
                }),
            });
        });
    }
};
