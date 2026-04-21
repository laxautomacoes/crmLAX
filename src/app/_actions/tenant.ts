'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendSuspensionEmail } from '@/lib/resend'

export async function getTenantByUserId(userId: string) {
    const supabase = await createClient()

    // Buscar o perfil para pegar o tenant_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle()

    if (!profile?.tenant_id) return null

    // Buscar o tenant para pegar o slug
    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug, name')
        .eq('id', profile.tenant_id)
        .maybeSingle()

    return tenant
}

export async function updateTenantBranding(tenantId: string, brandingData: any) {
    const supabase = await createClient()

    // Buscar branding atual para fazer merge
    const { data: currentTenant } = await supabase
        .from('tenants')
        .select('branding')
        .eq('id', tenantId)
        .single()

    const newBranding = {
        ...(currentTenant?.branding || {}),
        ...brandingData
    }

    const { error } = await supabase
        .from('tenants')
        .update({ branding: newBranding })
        .eq('id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/')
    
    return { success: true }
}

export async function updateTenantEmailSettings(tenantId: string, emailSettingsData: any) {
    const supabase = await createClient()

    // Buscar configurações atuais para fazer merge
    const { data: currentTenant } = await supabase
        .from('tenants')
        .select('email_settings')
        .eq('id', tenantId)
        .single()

    const currentSettings = (currentTenant?.email_settings as any) || {}
    
    // Filtramos apenas as chaves que pertencem ao JSON email_settings
    // evitando salvar colunas da tabela tenants (como custom_domain) dentro do JSON
    const cleanUpdate: any = {}
    const validKeys = ['logo_url', 'primary_color', 'signature_html', 'footer_text', 'templates', 'attachments']
    
    validKeys.forEach(key => {
        if (key in emailSettingsData) {
            cleanUpdate[key] = emailSettingsData[key]
        } else if (key in currentSettings) {
            cleanUpdate[key] = currentSettings[key]
        }
    })

    const { error } = await supabase
        .from('tenants')
        .update({ email_settings: cleanUpdate })
        .eq('id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    
    return { success: true }
}

export async function updateTenantDomain(tenantId: string, domain: string | null) {
    const supabase = await createClient()

    // Validação básica de formato se não for null (suportando TLDs longos como .photography, .marketing, .online)
    if (domain && !/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,14}(:[0-9]{1,5})?(\/.*)?$/.test(domain)) {
        return { success: false, error: 'Formato de domínio inválido.' }
    }

    const { error } = await supabase
        .from('tenants')
        .update({ 
            custom_domain: domain,
            custom_domain_verified: false, // Resetar verificação ao mudar
            custom_domain_updated_at: new Date()
        })
        .eq('id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    
    return { success: true }
}

export async function verifyTenantDomain(tenantId: string) {
    const supabase = await createClient()

    const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

    if (!tenant?.custom_domain) return { success: false, error: 'Nenhum domínio configurado.' }

    try {
        const isRoot = tenant.custom_domain.split('.').filter(Boolean).length === 2;
        const dnsType = isRoot ? 'A' : 'CNAME';

        // Verificação real via Cloudflare DNS-over-HTTPS
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${tenant.custom_domain}&type=${dnsType}`, {
            headers: { 'Accept': 'application/dns-json' }
        });
        const dnsData = await response.json();

        // Verificar o registro correto dependendo do tipo
        let hasValidRecord = false;
        
        if (isRoot) {
            // Tipo A: 1
            hasValidRecord = dnsData.Answer?.some((ans: any) => 
                ans.type === 1 && (ans.data === '76.76.21.21')
            );
        } else {
            // Tipo CNAME: 5
            hasValidRecord = dnsData.Answer?.some((ans: any) => 
                ans.type === 5 && (ans.data === 'cname.vercel-dns.com.' || ans.data === 'cname.vercel-dns.com')
            );
        }

        if (!hasValidRecord) {
            const errorMsg = isRoot 
                ? 'Registro tipo A (76.76.21.21) não encontrado ou ainda não propagado.' 
                : 'Registro CNAME não encontrado ou ainda não propagado.';
            
            return { 
                success: false, 
                error: `${errorMsg} Verifique as configurações no seu provedor.` 
            }
        }
        
        // --- Automação Vercel ---
        const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
        const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

        if (VERCEL_AUTH_TOKEN && VERCEL_PROJECT_ID) {
            try {
                // Adicionar o domínio ao projeto na Vercel via API
                await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: tenant.custom_domain }),
                });

                // Tentar adicionar também a versão com WWW para garantir redirecionamento se necessário
                if (!tenant.custom_domain.startsWith('www.')) {
                    await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name: `www.${tenant.custom_domain}` }),
                    });
                }
            } catch (vercelError) {
                // Não falhamos a verificação total por erro na API da Vercel
                // o usuário ainda pode adicionar manualmente se falhar aqui.
            }
        }
        // -------------------------

        const { error } = await supabase
            .from('tenants')
            .update({ 
                custom_domain_verified: true,
                custom_domain_updated_at: new Date()
            })
            .eq('id', tenantId)

        if (error) return { success: false, error: error.message }

        revalidatePath('/settings')
        return { success: true }
    } catch (error: any) {
        console.error('DNS Verification Error:', error);
        return { success: false, error: 'Erro ao conectar com o serviço de verificação DNS.' }
    }
}
export async function getVercelDomainConfig(domain: string) {
    const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
        return { success: false, error: 'Credenciais Vercel não configuradas.' };
    }

    try {
        const response = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`, {
            headers: {
                'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
            },
        });

        if (!response.ok) {
            return { success: false, error: 'Domínio não encontrado na Vercel.' };
        }

        const data = await response.json();
        return { 
            success: true, 
            config: {
                misconfigured: data.misconfigured,
                verification: data.verification,
                status: data.status,
            } 
        };
    } catch (error) {
        console.error('Erro ao buscar config na Vercel:', error);
        return { success: false, error: 'Erro de conexão com a Vercel.' };
    }
}

export async function verifyTenantCRMSubdomain(tenantId: string) {
    const supabase = await createClient()

    const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

    if (!tenant?.custom_domain) return { success: false, error: 'Nenhum domínio configurado.' }

    const crmDomain = `crm.${tenant.custom_domain}`

    try {
        // Verificação real via Cloudflare DNS-over-HTTPS (Sempre CNAME para subdomínio)
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${crmDomain}&type=CNAME`, {
            headers: { 'Accept': 'application/dns-json' }
        });
        const dnsData = await response.json();

        // Verificar se valor é cname.vercel-dns.com
        const hasValidRecord = dnsData.Answer?.some((ans: any) => 
            ans.type === 5 && (ans.data === 'cname.vercel-dns.com.' || ans.data === 'cname.vercel-dns.com')
        );

        if (!hasValidRecord) {
            return { 
                success: false, 
                error: 'Registro CNAME para subdomínio crm não encontrado ou incorreto.' 
            }
        }
        
        // --- Registro na Vercel ---
        const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
        const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

        if (VERCEL_AUTH_TOKEN && VERCEL_PROJECT_ID) {
            try {
                await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: crmDomain }),
                });
            } catch (vErr) {
                console.error('Erro Vercel API (CRM):', vErr);
            }
        }

        const { error } = await supabase
            .from('tenants')
            .update({ 
                custom_domain_crm_verified: true,
                custom_domain_updated_at: new Date()
            })
            .eq('id', tenantId)

        if (error) return { success: false, error: error.message }

        revalidatePath('/settings')
        return { success: true }
    } catch (err: any) {
        console.error('CRM Verification Error:', err);
        return { success: false, error: 'Erro técnico durante a verificação do subdomínio CRM.' }
    }
}

export async function getPlatformBranding() {
    const supabase = await createClient()

    const { data: tenant } = await supabase
        .from('tenants')
        .select('branding')
        .eq('is_system', true)
        .maybeSingle()

    return tenant?.branding || null
}

export async function getAllTenants() {
    const supabase = await createClient()

    const { data: tenants, error } = await supabase
        .from('tenants')
        .select(`
            *,
            profiles:profiles(count)
        `)
        .eq('is_system', false)
        .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }
    
    return { success: true, data: tenants }
}

export async function createTenant(data: { name: string; slug: string; plan_type: string }) {
    const supabase = await createClient()

    // 0. Validar se o usuário é superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autorizado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'superadmin') {
        return { success: false, error: 'Apenas superadmins podem criar empresas.' }
    }

    // Usar cliente admin para ignorar RLS na tabela tenants
    const supabaseAdmin = createAdminClient()

    // 1. Validar slug único
    const { data: existing } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('slug', data.slug)
        .maybeSingle()

    if (existing) {
        return { success: false, error: 'Este slug já está em uso.' }
    }

    // 2. Gerar API Key e Branding padrão
    const apiKey = `lax_${Math.random().toString(36).substring(2, 11)}_${Math.random().toString(36).substring(2, 11)}`
    const defaultBranding = {
        primary_color: '#404F4F',
        secondary_color: '#FFE600',
        logo_url: null,
        favicon_url: null,
        whatsapp: null
    }

    // 3. Inserir tenant usando o admin client
    const { data: newTenant, error } = await supabaseAdmin
        .from('tenants')
        .insert({
            name: data.name,
            slug: data.slug,
            plan_type: data.plan_type,
            api_key: apiKey,
            branding: defaultBranding,
            is_system: false
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/superadmin/tenants')
    return { success: true, data: newTenant }
}

export async function updateTenant(tenantId: string, data: { name?: string; slug?: string; plan_type?: string; custom_domain?: string; status?: 'active' | 'suspended' }) {
    const supabase = await createClient()

    // 1. Validar se o usuário é superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autorizado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'superadmin') {
        return { success: false, error: 'Apenas superadmins podem editar empresas.' }
    }

    // Se estiver suspendendo, disparar e-mails para os administradores
    if (data.status === 'suspended') {
        try {
            // Buscar nome do tenant e administradores
            const { data: tenant } = await supabase.from('tenants').select('name, email_settings').eq('id', tenantId).single()
            const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('tenant_id', tenantId)
                .in('role', ['admin', 'superadmin'])

            if (tenant && admins && admins.length > 0) {
                const supabaseAdmin = createAdminClient()
                
                // Buscar e-mails no Auth e enviar notificações
                const emailPromises = admins.map(async (admin) => {
                    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(admin.id)
                    if (authUser?.user?.email) {
                        return sendSuspensionEmail(authUser.user.email, tenant.name, tenant.email_settings as any)
                    }
                })
                
                await Promise.all(emailPromises)
                console.log(`Notificações de suspensão enviadas para ${admins.length} administradores do tenant ${tenant.name}`)
            }
        } catch (emailErr) {
            console.error('Erro ao processar notificações de suspensão:', emailErr)
            // Não bloqueamos o update do tenant se o e-mail falhar, mas logamos o erro
        }
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
        .from('tenants')
        .update(data)
        .eq('id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/superadmin/tenants')
    return { success: true }
}

export async function deleteTenant(tenantId: string) {
    const supabase = await createClient()

    // 1. Validar se o usuário é superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autorizado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'superadmin') {
        return { success: false, error: 'Apenas superadmins podem excluir empresas.' }
    }

    // Usar cliente admin para excluir (importante devido ao cascading e RLS restrito)
    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin
        .from('tenants')
        .delete()
        .eq('id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/superadmin/tenants')
    return { success: true }
}

export async function getEmailTemplates(tenantId: string, type?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenantId)
    
    if (type) {
        query = query.eq('type', type)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

export async function saveEmailTemplate(data: { 
    id?: string;
    tenant_id: string;
    name: string;
    type: string;
    subject: string;
    body_html: string;
    is_active?: boolean;
}) {
    const supabase = await createClient()

    const { data: result, error } = await supabase
        .from('email_templates')
        .upsert(data)
        .select()
        .single()

    if (error) return { success: false, error: error.message }

    // Se marcado como ativo, desativar os outros do mesmo tipo
    if (data.is_active) {
        await supabase
            .from('email_templates')
            .update({ is_active: false })
            .eq('tenant_id', data.tenant_id)
            .eq('type', data.type)
            .neq('id', result.id)
    }

    revalidatePath('/settings')
    return { success: true, data: result }
}

export async function deleteEmailTemplate(id: string, tenantId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true }
}

export async function sendTestEmailAction(params: {
    to: string;
    type: 'invitation' | 'confirmation' | 'suspension';
    tenantName: string;
    settings: any;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return { success: false, error: 'Tenant não encontrado.' };

    const { data: tenant } = await supabase
        .from('tenants')
        .select('custom_domain, custom_domain_verified')
        .eq('id', profile.tenant_id)
        .single();

    const { sendBaseEmail } = await import('@/lib/emails/client');
    const { 
        getInvitationEmailTemplate, 
        getConfirmationEmailTemplate, 
        getSuspensionEmailTemplate 
    } = await import('@/lib/emails/templates');

    let template;
    const mockLink = 'https://crmlax.com/preview-test';

    const mockData = {
        nome: "Usuário Teste",
        email: params.to,
        empresa: params.tenantName,
        whatsapp: "(11) 99999-9999"
    };

    switch (params.type) {
        case 'confirmation':
            template = getConfirmationEmailTemplate(mockLink, params.tenantName, params.settings, mockData);
            break;
        case 'suspension':
            template = getSuspensionEmailTemplate(params.tenantName, params.settings, mockData);
            break;
        default:
            template = getInvitationEmailTemplate(mockLink, params.tenantName, params.settings, mockData);
    }

    // Se tiver domínio customizado verificado, tenta usar noreply@dominio.com
    let fromEmail = undefined;
    if (tenant?.custom_domain && tenant?.custom_domain_verified) {
        fromEmail = `noreply@${tenant.custom_domain}`;
    }

    let result = await sendBaseEmail({
        to: params.to,
        subject: `[TESTE] ${template.subject}`,
        html: template.html,
        fromName: params.tenantName,
        fromEmail
    });

    // Se falhou e estávamos tentando usar um domínio customizado, 
    // tentamos novamente com o domínio padrão (Fallback)
    if (result.error && fromEmail) {
        result = await sendBaseEmail({
            to: params.to,
            subject: `[TESTE] ${template.subject}`,
            html: template.html,
            fromName: params.tenantName,
            fromEmail: undefined // Usa o padrão
        });
    }

    if (result.error) {
        const errorMsg = typeof result.error === 'object' 
            ? result.error.message || JSON.stringify(result.error) 
            : result.error;
        return { success: false, error: errorMsg };
    }

    return { success: true };
}

/**
 * Registra um domínio no Resend para envio de e-mail
 */
export async function setupEmailDomain(tenantId: string, domain: string) {
    const cleanDomain = domain.trim().replace(/^@/, '');
    const { getResendClient } = await import('@/lib/emails/client');
    const resend = getResendClient();
    if (!resend) return { success: false, error: 'Resend API Key não configurada.' };

    try {
        // 1. Criar domínio no Resend
        const { data, error } = await resend.domains.create({
            name: cleanDomain,
        });

        if (error) {
            // Se o domínio já existir no Resend, tentamos apenas pegá-lo
            if (error.message.includes('already exists')) {
                 const { data: existingDomains } = await resend.domains.list();
                 const existing = existingDomains?.data?.find(d => d.name === cleanDomain);
                 if (existing) {
                    const { data: fullDomain } = await resend.domains.get(existing.id);
                    
                    const supabase = createAdminClient();
                    await supabase
                        .from('tenants')
                        .update({ 
                            email_domain_resend_id: existing.id,
                            email_domain_status: existing.status
                        })
                        .eq('id', tenantId);
                    
                    return { success: true, data: fullDomain || existing };
                 }
            }
            return { success: false, error: error.message };
        }

        // 2. Salvar o ID do Resend no nosso banco
        const supabase = createAdminClient();
        await supabase
            .from('tenants')
            .update({ 
                email_domain_resend_id: data?.id,
                email_domain_status: 'pending'
            })
            .eq('id', tenantId);

        revalidatePath('/settings');
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Verifica o status do domínio no Resend e atualiza o banco local
 */
export async function checkEmailDomainStatus(tenantId: string, resendDomainId: string) {
    const { getResendClient } = await import('@/lib/emails/client');
    const resend = getResendClient();
    if (!resend) return { success: false, error: 'Resend API Key não configurada.' };

    try {
        // 1. Buscar status atual no Resend
        const { data, error } = await resend.domains.get(resendDomainId);
        
        if (error) return { success: false, error: error.message };

        // 2. Atualizar nosso banco
        const isVerified = data?.status === 'verified';
        
        const supabase = createAdminClient();
        await supabase
            .from('tenants')
            .update({ 
                email_domain_status: data?.status,
                email_domain_verified: isVerified
            })
            .eq('id', tenantId);

        revalidatePath('/settings');
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Remove o domínio do Resend e limpa os campos no banco local
 */
export async function deleteEmailDomain(tenantId: string, resendDomainId: string) {
    const { getResendClient } = await import('@/lib/emails/client');
    const resend = getResendClient();
    if (!resend) return { success: false, error: 'Resend API Key não configurada.' };

    try {
        // 1. Remover no Resend
        await resend.domains.remove(resendDomainId);
        
        // 2. Limpar no nosso banco
        const supabase = createAdminClient();
        await supabase
            .from('tenants')
            .update({ 
                email_domain_resend_id: null,
                email_domain_status: 'not_started',
                email_domain_verified: false
            })
            .eq('id', tenantId);

        revalidatePath('/settings');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
