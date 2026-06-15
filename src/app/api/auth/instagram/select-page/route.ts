import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/instagram/select-page
 * Finaliza a conexão do Instagram selecionando uma página específica
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { tenantId, pageId } = body;

        if (!tenantId || !pageId) {
            return NextResponse.json({ error: 'tenant_id e page_id são obrigatórios' }, { status: 400 });
        }

        // Buscar integração pendente
        const { data: integration, error: fetchError } = await supabase
            .from('integrations')
            .select('credentials')
            .eq('tenant_id', tenantId)
            .eq('provider', 'instagram')
            .eq('status', 'pending_selection')
            .single();

        if (fetchError || !integration) {
            return NextResponse.json({ error: 'Nenhuma integração pendente encontrada.' }, { status: 404 });
        }

        const { user_ll_token, pages_raw } = integration.credentials as any;

        if (!pages_raw || !user_ll_token) {
            return NextResponse.json({ error: 'Dados de páginas não encontrados.' }, { status: 400 });
        }

        // Encontrar a página selecionada
        const selectedPage = pages_raw.find((p: any) => p.id === pageId);

        if (!selectedPage) {
            return NextResponse.json({ error: 'Página selecionada não encontrada.' }, { status: 404 });
        }

        const igAccountId = selectedPage.instagram_business_account?.id;
        const pageAccessToken = selectedPage.access_token;

        if (!igAccountId) {
            return NextResponse.json(
                { error: 'A página selecionada não possui uma conta Instagram Business vinculada.' },
                { status: 400 }
            );
        }

        // Atualizar a integração com a página selecionada
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const supabaseAdmin = createAdminClient();

        const { error: updateError } = await supabaseAdmin
            .from('integrations')
            .update({
                credentials: {
                    access_token: pageAccessToken,
                    account_id: igAccountId,
                    page_id: selectedPage.id,
                    page_name: selectedPage.name,
                    user_ll_token: user_ll_token,
                },
                status: 'active',
                updated_at: new Date().toISOString(),
            })
            .eq('tenant_id', tenantId)
            .eq('provider', 'instagram');

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            page: {
                id: selectedPage.id,
                name: selectedPage.name,
            }
        });

    } catch (error: any) {
        console.error('Select Page Error:', error);
        return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
    }
}
