import { NextResponse } from 'next/server';
import { abacatePayService } from '@/lib/abacatepay';
import { getProfile } from '@/app/_actions/profile';

/**
 * POST /api/checkout/abacatepay
 * Cria um checkout de assinatura via Abacate Pay.
 * Body: { planId: 'starter' | 'pro' | 'business' | 'enterprise' }
 */
export async function POST(req: Request) {
    try {
        const { planId } = await req.json();
        const { profile } = await getProfile();

        // Mapear plano para Product ID do Abacate Pay
        const productMap: Record<string, string | undefined> = {
            starter: process.env.ABACATEPAY_PRODUCT_ID_STARTER,
            pro: process.env.ABACATEPAY_PRODUCT_ID_PRO,
            business: process.env.ABACATEPAY_PRODUCT_ID_BUSINESS,
            enterprise: process.env.ABACATEPAY_PRODUCT_ID_ENTERPRISE,
        };

        const productId = productMap[planId];

        if (!productId) {
            return NextResponse.json(
                { error: `Produto Abacate Pay não configurado para o plano: ${planId}` },
                { status: 400 }
            );
        }

        const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.startsWith('http')
            ? process.env.NEXT_PUBLIC_ROOT_DOMAIN
            : `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;

        // Criar ou buscar customer (Abacate Pay retorna existente se taxId/email já existir)
        let customerId: string | undefined;
        if (profile?.email) {
            try {
                const customerRes = await abacatePayService.createCustomer({
                    email: profile.email,
                    name: profile.full_name || undefined,
                });
                customerId = customerRes.data?.id;
            } catch (err) {
                // Se falhar ao criar customer, continua sem (o checkout vai pedir os dados)
                console.warn('[AbacatePay] Erro ao criar customer, prosseguindo sem:', err);
            }
        }

        // Criar checkout de assinatura
        const checkoutRes = await abacatePayService.createSubscriptionCheckout({
            items: [{ id: productId, quantity: 1 }],
            customerId,
            returnUrl: `${domain}/settings/subscription?success=true`,
            completionUrl: `${domain}/settings/subscription?success=true`,
            metadata: {
                tenantId: profile?.tenant_id || '',
                planId: planId,
                origin: profile?.tenant_id ? 'dashboard' : 'landing_page',
            },
        });

        if (!checkoutRes.data?.url) {
            console.error('[AbacatePay] Resposta sem URL:', checkoutRes);
            return NextResponse.json(
                { error: 'Abacate Pay não retornou URL de checkout' },
                { status: 500 }
            );
        }

        return NextResponse.json({ url: checkoutRes.data.url });
    } catch (error: any) {
        console.error('[AbacatePay] Erro no Checkout:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao iniciar checkout Abacate Pay' },
            { status: 500 }
        );
    }
}
