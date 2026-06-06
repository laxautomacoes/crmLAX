import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');

    if (!tenantId) {
        return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Configurações do Meta
    const appId = process.env.META_APP_ID;

    // Domínio fixo da plataforma para o callback do OAuth (cadastrado no Meta App)
    const platformDomain = process.env.META_OAUTH_DOMAIN || 'crm.laxperience.online';
    const protocol = platformDomain.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${platformDomain}/api/auth/instagram/callback`;

    // Salvar o domínio de origem do tenant no state para redirecionar de volta após o OAuth
    const tenantOrigin = new URL(req.url).origin;
    const statePayload = JSON.stringify({ tenant_id: tenantId, profile_id: user.id, return_url: tenantOrigin });
    const stateEncoded = Buffer.from(statePayload).toString('base64url');
    
    // Scopes necessários para o Instagram Graph API (Publishing) e Facebook Pages
    const scopes = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'business_management',
        'public_profile'
    ].join(',');

    const fbAuthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${stateEncoded}&response_type=code&auth_type=rerequest`;

    return NextResponse.redirect(fbAuthUrl);
}
