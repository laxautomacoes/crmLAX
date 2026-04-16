import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const tenantId = searchParams.get('state'); // O state contém o tenant_id

    if (!code || !tenantId) {
        return NextResponse.redirect('/marketing?error=auth_failed');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_ROOT_DOMAIN === 'localhost' ? 'http://localhost:3000' : `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}/api/auth/youtube/callback`;

    try {
        // 1. Trocar code pelo Token (Access + Refresh)
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId!,
                client_secret: clientSecret!,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }

        // 2. Buscar informações básicas do perfil Google para identificar a conta
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profileData = await profileResponse.json();

        // 3. Salvar na tabela integrations via Admin Client
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const supabaseAdmin = createAdminClient();

        // Expira em: segundos para timestamp
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

        const { error: upsertError } = await supabaseAdmin
            .from('integrations')
            .upsert({
                tenant_id: tenantId,
                provider: 'youtube',
                credentials: {
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expires_at: expiresAt,
                    account_name: profileData.name,
                    account_email: profileData.email,
                    picture: profileData.picture
                },
                status: 'active',
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,provider' });

        if (upsertError) throw upsertError;

        const baseUrl = process.env.NEXT_PUBLIC_ROOT_DOMAIN === 'localhost' 
            ? 'http://localhost:3000' 
            : `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;

        return NextResponse.redirect(`${baseUrl}/marketing?success=youtube_connected`);

    } catch (error: any) {
        console.error('YouTube Callback Error:', error.message);
        const baseUrl = process.env.NEXT_PUBLIC_ROOT_DOMAIN === 'localhost' 
            ? 'http://localhost:3000' 
            : `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
            
        return NextResponse.redirect(`${baseUrl}/marketing?error=${encodeURIComponent(error.message)}`);
    }
}
