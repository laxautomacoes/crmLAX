const EVOLUTION_API_URL = process.env.EVOLUTION_URL?.replace(/['"]/g, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_GLOBAL_API_KEY?.replace(/['"]/g, '');

// Circuit Breaker: evita chamadas repetidas quando a Evolution API está offline
const CIRCUIT_BREAKER_THRESHOLD = 2; // Falhas consecutivas para abrir o circuito
const CIRCUIT_BREAKER_RESET_MS = 60_000; // 60 segundos antes de tentar novamente
let circuitBreakerFailures = 0;
let circuitBreakerOpenUntil = 0;

const FETCH_TIMEOUT_MS = 5_000; // Timeout de 5 segundos para cada chamada

async function evolutionFetch(endpoint: string, options: RequestInit = {}) {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
        throw new Error('Evolution API configuration missing');
    }

    // Circuit Breaker: se o circuito está aberto, retornar erro imediato
    if (circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD && Date.now() < circuitBreakerOpenUntil) {
        throw new Error('Evolution API temporariamente indisponível (circuit breaker ativo). Tentativa automática em breve.');
    }

    const baseUrl = EVOLUTION_API_URL.endsWith('/') 
        ? EVOLUTION_API_URL.slice(0, -1) 
        : EVOLUTION_API_URL;
    
    const url = `${baseUrl}${endpoint}`;

    // AbortController para timeout explícito de 5s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
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
            // Se for uma consulta de perfil de contato que não existe no WhatsApp,
            // tratamos como um retorno limpo (sem foto de perfil) em vez de falha no sistema.
            const isFetchProfile = url.includes('/chat/fetchProfile');
            const nestedMessage = data?.response?.message;
            const isNumberNotExists = Array.isArray(nestedMessage) && 
                nestedMessage.length > 0 && 
                nestedMessage[0]?.exists === false;

            if (isFetchProfile && response.status === 400 && isNumberNotExists) {
                return { exists: false, ...nestedMessage[0] };
            }

            let rawError = nestedMessage || data?.message || data?.error;
            if (rawError && typeof rawError === 'object') {
                rawError = rawError.message || JSON.stringify(rawError);
            }
            const errorMessage = Array.isArray(rawError)
                ? JSON.stringify(rawError)
                : (typeof rawError === 'object' ? JSON.stringify(rawError) : rawError) || `Evolution API error: ${response.statusText}`;
            
            console.error('Evolution API Error Details:', {
                status: response.status,
                url,
                payload: options.body,
                response: data
            });

            throw new Error(errorMessage);
        }

        // Sucesso: resetar circuit breaker
        clearTimeout(timeoutId);
        circuitBreakerFailures = 0;
        return data;
    } catch (error: any) {
        clearTimeout(timeoutId);

        // Se o erro já foi tratado (lançado pelo bloco !response.ok acima), re-lançar
        // Erros de API (4xx/5xx) não devem ativar o circuit breaker
        if (error.message && !error.message.includes('fetch') && !error.name?.includes('Abort')) {
            throw error;
        }

        // Falha de conexão/timeout: ativar circuit breaker
        circuitBreakerFailures++;
        if (circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD) {
            circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
            console.warn(`[Evolution] Circuit breaker aberto após ${circuitBreakerFailures} falhas. Próxima tentativa em ${CIRCUIT_BREAKER_RESET_MS / 1000}s.`);
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

    async setSettings(instanceName: string, settings: {
        rejectCall?: boolean;
        msgCall?: string;
        groupsIgnore?: boolean;
        alwaysOnline?: boolean;
        readMessages?: boolean;
        readStatus?: boolean;
        syncFullHistory?: boolean;
    }) {
        return evolutionFetch(`/settings/set/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify(settings),
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
        return evolutionFetch(`/instance/delete/${instanceName}?force=true`, {
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
    },

    async fetchProfile(instanceName: string, number: string): Promise<{ profilePictureUrl?: string; profileUrl?: string; [key: string]: any }> {
        return evolutionFetch(`/chat/fetchProfile/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({ number }),
        });
    }
};
