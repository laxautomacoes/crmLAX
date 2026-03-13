import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getProfile } from '@/app/_actions/profile';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: Request) {
    try {
        const { planId } = await req.json();
        const { profile } = await getProfile();

        // Mapear plano para Price ID do Stripe
        let priceId = '';
        if (planId === 'starter') priceId = process.env.STRIPE_PRICE_ID_STARTER!;
        if (planId === 'pro') priceId = process.env.STRIPE_PRICE_ID_PRO!;

        // Caso especial para Freemium: redirecionar direto para registro
        if (planId === 'freemium') {
            const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.startsWith('http') 
                ? process.env.NEXT_PUBLIC_ROOT_DOMAIN 
                : `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
            return NextResponse.json({ url: `${domain}/register?plan=freemium` });
        }

        if (!priceId || priceId.includes('...')) {
            return NextResponse.json({ error: 'Configuração do Stripe incompleta (Price ID ausente)' }, { status: 400 });
        }

        const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.startsWith('http') 
            ? process.env.NEXT_PUBLIC_ROOT_DOMAIN 
            : `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${domain}/settings/subscription?success=true`,
            cancel_url: `${domain}/settings/subscription?canceled=true`,
            metadata: {
                tenantId: profile?.tenant_id || '',
                planId: planId,
                origin: profile?.tenant_id ? 'dashboard' : 'landing_page'
            },
            customer_email: profile?.email || undefined,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Erro no Checkout Stripe:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
