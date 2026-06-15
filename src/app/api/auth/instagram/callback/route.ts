import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');

    if (!code || !stateParam) {
        return NextResponse.redirect('/marketing/studio?error=auth_failed');
    }

    // Decodificar o state que contém tenant_id, profile_id e return_url
    let tenantId: string;
    let profileId: string | undefined;
    let returnUrl: string;

    try {
        const statePayload = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
        tenantId = statePayload.tenant_id;
        profileId = statePayload.profile_id;
        returnUrl = statePayload.return_url;
    } catch {
        // Fallback: state antigo era apenas o tenant_id
        tenantId = stateParam;
        returnUrl = new URL(req.url).origin;
    }

    if (!tenantId) {
        return NextResponse.redirect(`${returnUrl}/marketing/studio?error=auth_failed`);
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    // Usar o mesmo domínio fixo da plataforma (deve bater com o que foi enviado na rota de auth)
    const platformDomain = process.env.META_OAUTH_DOMAIN || 'crm.laxperience.online';
    const protocol = platformDomain.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${platformDomain}/api/auth/instagram/callback`;

    try {
        // 1. Trocar code pelo Token de Usuário (Short-lived)
        const tokenResponse = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
        const tokenData = await tokenResponse.json();

        console.log('[Instagram Callback] Token Exchange:', JSON.stringify(tokenData).substring(0, 200));

        if (tokenData.error) throw new Error(tokenData.error.message);

        const shortLivedToken = tokenData.access_token;

        // 2. Trocar pelo Token de Usuário de Longa Duração (Long-lived)
        const llTokenResponse = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`);
        const llTokenData = await llTokenResponse.json();
        
        console.log('[Instagram Callback] Long-lived Token:', JSON.stringify(llTokenData).substring(0, 200));

        const longLivedToken = llTokenData.access_token;

        // 3. Verificar permissões concedidas
        const permResponse = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${longLivedToken}`);
        const permData = await permResponse.json();
        console.log('[Instagram Callback] Permissions:', JSON.stringify(permData));

        // 4. Buscar TODAS as Páginas do usuário
        const pagesResponse = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=name,id,access_token,instagram_business_account,picture{url}&access_token=${longLivedToken}`);
        const pagesData = await pagesResponse.json();

        console.log('[Instagram Callback] Pages Response:', JSON.stringify(pagesData));

        if (pagesData.error) {
            throw new Error(`Erro da API da Meta: ${pagesData.error.message} (Código: ${pagesData.error.code})`);
        }

        if (!pagesData.data || pagesData.data.length === 0) {
            const grantedPerms = permData.data?.filter((p: any) => p.status === 'granted').map((p: any) => p.permission).join(', ') || 'nenhuma';
            throw new Error(`Nenhuma página encontrada. Permissões concedidas: [${grantedPerms}].`);
        }

        // 5. Salvar dados das páginas temporariamente para o frontend exibir o seletor
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const supabaseAdmin = createAdminClient();

        const pagesForSelection = pagesData.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            picture: p.picture?.data?.url || null,
            has_instagram: !!p.instagram_business_account,
            instagram_id: p.instagram_business_account?.id || null,
        }));

        // Salvar temporariamente na tabela integrations com status 'pending_selection'
        const { error: upsertError } = await supabaseAdmin
            .from('integrations')
            .upsert({
                tenant_id: tenantId,
                profile_id: profileId || null,
                provider: 'instagram',
                credentials: {
                    user_ll_token: longLivedToken,
                    pending_pages: pagesForSelection,
                    pages_raw: pagesData.data,
                },
                status: 'pending_selection',
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,provider,profile_id' });

        if (upsertError) throw upsertError;

        // Redirecionar de volta para o studio com flag de seleção de página
        return NextResponse.redirect(`${returnUrl}/marketing/studio?select_page=true`);

    } catch (error: any) {
        console.error('Instagram Callback Error:', error.message);
        return NextResponse.redirect(`${returnUrl}/marketing/studio?error=${encodeURIComponent(error.message)}`);
    }
}
