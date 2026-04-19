'use server';

/**
 * Busca o feed do Instagram usando o Token Permanente e Account ID configurados no ambiente.
 */
export async function getInstagramFeed() {
    const accessToken = process.env.META_PERMANENT_TOKEN;
    const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID;

    if (!accessToken || !accountId) {
        return { success: false, error: 'Configuração da Meta ausente no servidor.' };
    }

    try {
        const url = `https://graph.facebook.com/v21.0/${accountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${accessToken}&limit=12`;
        
        const response = await fetch(url, { next: { revalidate: 3600 } });
        const data = await response.json();

        if (data.error) {
            console.error('Meta API Error:', data.error);
            return { success: false, error: data.error.message };
        }

        return { success: true, data: data.data || [] };
    } catch (error: any) {
        console.error('Fetch Instagram Feed Error:', error);
        return { success: false, error: error.message || 'Falha ao conectar com Instagram.' };
    }
}
