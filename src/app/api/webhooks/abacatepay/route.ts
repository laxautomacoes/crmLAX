import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';
import { evolutionService } from '@/lib/evolution';
import crypto from 'crypto';

/**
 * POST /api/webhooks/abacatepay
 * Recebe eventos do Abacate Pay e atualiza o status do tenant.
 * 
 * Eventos tratados:
 * - subscription.completed → Ativa assinatura
 * - subscription.cancelled → Downgrade para starter
 * - subscription.renewed → Mantém ativo
 */
export async function POST(req: Request) {
    const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;

    const body = await req.text();

    // Validar HMAC se secret configurado
    if (webhookSecret) {
        const signature = req.headers.get('x-abacatepay-signature') 
            || req.headers.get('x-webhook-signature')
            || req.headers.get('x-signature');
        
        if (signature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(body)
                .digest('hex');

            if (signature !== expectedSignature) {
                console.error('[AbacatePay Webhook] Assinatura HMAC inválida');
                return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
            }
        }
    }

    let payload: any;
    try {
        payload = JSON.parse(body);
    } catch {
        return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const eventType = payload.event || payload.type;
    const eventData = payload.data || payload;

    console.log(`[AbacatePay Webhook] Evento recebido: ${eventType}`);

    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const resendApiKey = process.env.RESEND_API_KEY;

    try {
        // ─── SUBSCRIPTION COMPLETED (Pagamento Confirmado) ───
        if (eventType === 'subscription.completed') {
            const metadata = eventData.metadata || {};
            const tenantId = metadata.tenantId;
            const planId = metadata.planId || 'starter';
            const customerId = eventData.customer?.id || eventData.customerId;
            const subscriptionId = eventData.id || eventData.subscriptionId;
            const customerEmail = eventData.customer?.email || metadata.customerEmail;
            const customerName = eventData.customer?.name || metadata.customerName || 'Novo Cliente';
            const customerPhone = eventData.customer?.cellphone || metadata.customerPhone;

            if (tenantId) {
                // Upgrade/renovação de tenant existente
                await adminSupabase
                    .from('tenants')
                    .update({
                        plan_type: planId,
                        payment_gateway: 'abacatepay',
                        abacatepay_customer_id: customerId,
                        abacatepay_subscription_id: subscriptionId,
                        subscription_status: 'active',
                    } as any)
                    .eq('id', tenantId);
            } else if (metadata.origin === 'landing_page' && customerEmail) {
                // ─── NOVO CLIENTE (Landing Page → Checkout → Onboarding) ───

                // 1. Gerar senha provisória
                const tempPassword = Math.random().toString(36).substring(2, 12) + '!';

                // 2. Criar Tenant
                const slug = customerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') 
                    + Math.random().toString(36).substring(2, 5);

                const { data: newTenant, error: tenantError } = await adminSupabase
                    .from('tenants')
                    .insert({
                        name: customerName,
                        slug: slug,
                        plan_type: planId,
                        payment_gateway: 'abacatepay',
                        abacatepay_customer_id: customerId,
                        abacatepay_subscription_id: subscriptionId,
                        subscription_status: 'active',
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
                        welcome_required: true,
                    },
                });

                if (authError) throw authError;

                // 4. Vincular Perfil ao Tenant
                const { error: profileUpdateError } = await adminSupabase
                    .from('profiles')
                    .update({
                        tenant_id: newTenant.id,
                        role: 'admin',
                        full_name: customerName,
                        whatsapp_number: customerPhone || null,
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
                        `,
                    });
                }

                // WhatsApp (se houver número)
                if (customerPhone) {
                    const waMessage = `Olá ${customerName}! Bem-vindo ao CRM LAX. \n\nSeu acesso foi liberado: \nLogin: ${customerEmail} \nSenha: ${tempPassword} \n\nAcesse aqui: ${loginUrl}`;
                    try {
                        const instanceName = process.env.EVOLUTION_GLOBAL_INSTANCE || 'main';
                        await evolutionService.sendMessage(instanceName, customerPhone, waMessage);
                    } catch (waError) {
                        console.error('[AbacatePay Webhook] Erro ao enviar WhatsApp:', waError);
                    }
                }
            }
        }

        // ─── SUBSCRIPTION RENEWED ───
        if (eventType === 'subscription.renewed') {
            const subscriptionId = eventData.id || eventData.subscriptionId;
            if (subscriptionId) {
                await adminSupabase
                    .from('tenants')
                    .update({ subscription_status: 'active' } as any)
                    .eq('abacatepay_subscription_id', subscriptionId);
            }
        }

        // ─── SUBSCRIPTION CANCELLED ───
        if (eventType === 'subscription.cancelled') {
            const subscriptionId = eventData.id || eventData.subscriptionId;
            if (subscriptionId) {
                await adminSupabase
                    .from('tenants')
                    .update({
                        subscription_status: 'canceled',
                        plan_type: 'starter',
                    } as any)
                    .eq('abacatepay_subscription_id', subscriptionId);
            }
        }

        // ─── SUBSCRIPTION PLAN CHANGED (Upgrade/Downgrade) ───
        if (eventType === 'subscription.plan_changed') {
            const subscriptionId = eventData.id || eventData.subscriptionId;
            const newPlanId = eventData.metadata?.planId || eventData.planId;
            if (subscriptionId && newPlanId) {
                await adminSupabase
                    .from('tenants')
                    .update({
                        plan_type: newPlanId,
                        subscription_status: 'active',
                    } as any)
                    .eq('abacatepay_subscription_id', subscriptionId);
            }
        }

        // ─── SUBSCRIPTION PAYMENT FAILED ───
        if (eventType === 'subscription.payment_failed') {
            const subscriptionId = eventData.id || eventData.subscriptionId;
            if (subscriptionId) {
                await adminSupabase
                    .from('tenants')
                    .update({ subscription_status: 'payment_failed' } as any)
                    .eq('abacatepay_subscription_id', subscriptionId);
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[AbacatePay Webhook] Erro ao processar:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar webhook' },
            { status: 500 }
        );
    }
}
