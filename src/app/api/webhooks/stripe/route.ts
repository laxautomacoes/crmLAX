import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';
import { evolutionService } from '@/lib/evolution';



export async function POST(req: Request) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!stripeSecretKey || !stripeWebhookSecret) {
        console.error('ERRO: Variáveis de ambiente do Stripe ausentes.');
        return NextResponse.json({ error: 'Configuração de pagamento incompleta' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-01-27.acacia' as any,
    });

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
            stripeWebhookSecret
        );
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const tenantId = session.metadata?.tenantId;
            const planId = session.metadata?.planId || 'starter';
            const customerEmail = session.customer_details?.email;
            const customerName = session.customer_details?.name || 'Novo Cliente';
            const customerPhone = session.customer_details?.phone;

            if (tenantId) {
                // Caso o usuário já tenha tenant (upgrade/renovação no dashboard)
                await supabase
                    .from('tenants')
                    .update({
                        plan_type: planId,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: session.subscription as string,
                        subscription_status: 'active'
                    } as any)
                    .eq('id', tenantId);
            } else if (session.metadata?.origin === 'landing_page' && customerEmail) {
                // CASO NOVO CLIENTE (Landing Page -> Checkout -> Automação)
                
                // 1. Gerar senha provisória
                const tempPassword = Math.random().toString(36).substring(2, 12) + '!';
                
                // 2. Criar Tenant
                const slug = customerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.random().toString(36).substring(2, 5);
                const { data: newTenant, error: tenantError } = await adminSupabase
                    .from('tenants')
                    .insert({
                        name: customerName,
                        slug: slug,
                        plan_type: planId,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: session.subscription as string,
                        subscription_status: 'active'
                    } as any)
                    .select()
                    .single();

                if (tenantError) throw tenantError;

                // 3. Criar Usuário Admin
                const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
                    email: customerEmail,
                    password: tempPassword,
                    email_confirm: true,
                    user_metadata: { 
                        full_name: customerName,
                        welcome_required: true 
                    }
                });

                if (authError) throw authError;

                // 4. Vincular Perfil ao Tenant e Role
                const { error: profileUpdateError } = await adminSupabase
                    .from('profiles')
                    .update({
                        tenant_id: newTenant.id,
                        role: 'admin',
                        full_name: customerName,
                        whatsapp_number: customerPhone || null
                    })
                    .eq('id', authUser.user.id);

                if (profileUpdateError) throw profileUpdateError;

                // 5. Enviar Notificações
                const loginUrl = `${process.env.NEXT_PUBLIC_ROOT_DOMAIN?.startsWith('http') ? '' : 'https://'}${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/login`;
                
                // E-mail
                if (resendApiKey) {
                    const resend = new Resend(resendApiKey);
                    await resend.emails.send({
                    from: 'CRM LAX <noreply@laxperience.online>',
                    to: [customerEmail],
                    subject: 'Seja bem-vindo ao CRM LAX - Suas credenciais de acesso',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2>Olá ${customerName}, parabéns pela sua assinatura!</h2>
                            <p>Sua conta no CRM LAX foi criada com sucesso. Aqui estão seus dados de acesso:</p>
                            <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p><strong>Login:</strong> ${customerEmail}</p>
                                <p><strong>Senha Provisória:</strong> ${tempPassword}</p>
                            </div>
                            <p><a href="${loginUrl}" style="background: #FFE600; color: #404F4F; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar Dashboard</a></p>
                            <p>Ao entrar, recomendamos que sua primeira ação seja criar uma nova senha segura.</p>
                        </div>
                    `
                    });
                }

                // WhatsApp (se houver número)
                if (customerPhone) {
                    const waMessage = `Olá ${customerName}! Bem-vindo ao CRM LAX. \n\nSeu acesso foi liberado: \nLogin: ${customerEmail} \nSenha: ${tempPassword} \n\nAcesse aqui: ${loginUrl}`;
                    try {
                        const instanceName = process.env.EVOLUTION_GLOBAL_INSTANCE || 'main';
                        await evolutionService.sendMessage(instanceName, customerPhone, waMessage);
                    } catch (waError) {
                        console.error('Erro ao enviar WhatsApp de boas-vindas:', waError);
                    }
                }
            }
        }

        if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
            const subscription = event.data.object as Stripe.Subscription;
            const { data: tenant } = await supabase
                .from('tenants')
                .select('id')
                .eq('stripe_subscription_id', subscription.id)
                .single();

            if (tenant) {
                await supabase
                    .from('tenants')
                    .update({ subscription_status: subscription.status })
                    .eq('id', tenant.id);
                
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

