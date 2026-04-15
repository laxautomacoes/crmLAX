'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

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

    const { error } = await supabase
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
