import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Utilitário para garantir um Access Token válido para o Google.
 * Se o token estiver expirado, ele usa o refresh_token para obter um novo.
 */
export async function getValidGoogleToken(tenantId: string) {
    const supabaseAdmin = createAdminClient();

    // 1. Buscar integração do YouTube
    const { data: integration, error } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('provider', 'youtube')
        .single();

    if (error || !integration) {
        throw new Error('Integração com YouTube não encontrada.');
    }

    const { access_token, refresh_token, expires_at } = integration.credentials as any;

    // 2. Verificar se expirou (margem de 5 minutos)
    const now = new Date();
    const expiry = new Date(expires_at);
    
    if (now < new Date(expiry.getTime() - 5 * 60 * 1000)) {
        return access_token;
    }

    // 3. Se expirou, renovar usando o refresh_token
    if (!refresh_token) {
        throw new Error('Refresh token não disponível. Por favor, reconecte sua conta Google.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: refresh_token,
            grant_type: 'refresh_token',
        }).toString(),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(`Erro ao renovar token: ${data.error_description || data.error}`);
    }

    const newAccessToken = data.access_token;
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // 4. Atualizar no banco
    await supabaseAdmin
        .from('integrations')
        .update({
            credentials: {
                ...integration.credentials as any,
                access_token: newAccessToken,
                expires_at: newExpiresAt
            },
            updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);

    return newAccessToken;
}
