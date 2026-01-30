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
        console.error('Fetch error in evolutionFetch:', error);
        throw error;
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

    async sendMessage(instanceName: string, number: string, message: string) {
        return evolutionFetch(`/message/sendText/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                number,
                options: { delay: 1200, presence: 'composing' },
                textMessage: { text: message },
            }),
        });
    }
};
