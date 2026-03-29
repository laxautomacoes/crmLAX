import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const tenantId = searchParams.get('state'); // O state contém o tenant_id

    if (!code || !tenantId) {
        return NextResponse.redirect('/marketing?error=auth_failed');
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_ROOT_DOMAIN === 'localhost' ? 'http://localhost:3000' : `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}/api/auth/instagram/callback`;

    try {
        // 1. Trocar code pelo Token de Usuário (Short-lived)
        const tokenResponse = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
        const tokenData = await tokenResponse.json();

        if (tokenData.error) throw new Error(tokenData.error.message);

        const shortLivedToken = tokenData.access_token;

        // 2. Trocar pelo Token de Usuário de Longa Duração (Long-lived)
        const llTokenResponse = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`);
        const llTokenData = await llTokenResponse.json();
        
        const longLivedToken = llTokenData.access_token;

        // 3. Buscar Páginas e Contas do Instagram vinculadas
        const pagesResponse = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=name,access_token,instagram_business_account&access_token=${longLivedToken}`);
        const pagesData = await pagesResponse.json();

        if (!pagesData.data || pagesData.data.length === 0) {
            throw new Error('Nenhuma página do Facebook encontrada.');
        }

        // 4. Encontrar a primeira página com Instagram Business Account
        const pageWithIg = pagesData.data.find((p: any) => p.instagram_business_account);

        if (!pageWithIg) {
            throw new Error('Nenhuma conta do Instagram Business vinculada às suas páginas do Facebook.');
        }

        const igAccountId = pageWithIg.instagram_business_account.id;
        const pageAccessToken = pageWithIg.access_token;

        // 5. Salvar na tabela integrations via Admin Client (bypass RLS se necessário)
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const supabaseAdmin = createAdminClient();

        const { error: upsertError } = await supabaseAdmin
            .from('integrations')
            .upsert({
                tenant_id: tenantId,
                provider: 'instagram',
                credentials: {
                    access_token: pageAccessToken,
                    account_id: igAccountId,
                    page_name: pageWithIg.name,
                    user_ll_token: longLivedToken // Guardamos o do usuário também se precisar no futuro
                },
                status: 'active',
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,provider' });

        if (upsertError) throw upsertError;

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_ROOT_DOMAIN === 'localhost' ? 'http://localhost:3000' : `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}/marketing?success=instagram_connected`);

    } catch (error: any) {
        console.error('Instagram Callback Error:', error.message);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_ROOT_DOMAIN === 'localhost' ? 'http://localhost:3000' : `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}/marketing?error=${encodeURIComponent(error.message)}`);
    }
}
