import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 100 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const supabase = await createClient();

    try {
        // Lidar com eventos específicos
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const tenantId = session.metadata?.tenantId;
            const planId = session.metadata?.planId;

            if (tenantId && planId) {
                await supabase
                    .from('tenants')
                    .update({
                        plan_type: planId,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: session.subscription as string,
                        subscription_status: 'active'
                    })
                    .eq('id', tenantId);
            }
        }

        if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
            const subscription = event.data.object as Stripe.Subscription;
            
            // Buscar tenant por ID da assinatura
            const { data: tenant } = await supabase
                .from('tenants')
                .select('id')
                .eq('stripe_subscription_id', subscription.id)
                .single();

            if (tenant) {
                await supabase
                    .from('tenants')
                    .update({
                        subscription_status: subscription.status
                    })
                    .eq('id', tenant.id);
                
                // Se a assinatura for cancelada ou expirar, volta para o plano freemium
                if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
                    await supabase
                        .from('tenants')
                        .update({ plan_type: 'freemium' })
                        .eq('id', tenant.id);
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Erro ao processar Webhook:', error);
        return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 });
    }
}
