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
    const redirectUri = `${process.env.NEXT_PUBLIC_ROOT_DOMAIN === 'localhost' ? 'http://localhost:3000' : `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}/api/auth/instagram/callback`;
    
    // Scopes necessários para o Instagram Graph API (Publishing)
    const scopes = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'public_profile'
    ].join(',');

    const fbAuthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${tenantId}&response_type=code`;

    return NextResponse.redirect(fbAuthUrl);
}
