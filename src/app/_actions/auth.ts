'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendConfirmationEmail } from '@/lib/resend';

export async function signUpWithTenant(
    email: string,
    password: string,
    name: string,
    tenantId: string,
    token?: string
) {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 1. Criar o usuário no Supabase Auth
    // Nota: O auto-confirm deve estar desativado no dashboard para este fluxo ser ideal
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                invitation_token: token,
                tenant_id: tenantId
            }
        }
    });

    if (signUpError) {
        return { error: signUpError.message };
    }

    if (!signUpData.user) {
        return { error: 'Erro ao criar usuário.' };
    }

    // 2. Buscar nome do Tenant para o e-mail
    const { data: tenant } = await adminClient
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single();
    
    const tenantName = tenant?.name || 'CRM LAX';

    // 3. Gerar link de confirmação via Admin API
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const protocol = rootDomain.includes('localhost') ? 'http://' : 'https://';
    const baseUrl = rootDomain.startsWith('http') ? rootDomain : `${protocol}${rootDomain}`;
    
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'signup',
        email: email,
        password: password,
        options: {
            redirectTo: `${baseUrl}/auth/callback?tenant=${tenantId}`
        }
    });

    if (linkError) {
        console.error('Error generating confirmation link:', linkError);
        // Mesmo com erro no link, o usuário foi criado. 
        // Em um cenário real, poderíamos tentar reenviar depois.
        return { success: true, warning: 'Usuário criado, mas houve um erro ao gerar o link de confirmação.' };
    }

    // 4. Enviar e-mail via Resend com remetente dinâmico
    await sendConfirmationEmail(email, linkData.properties.action_link, tenantName);

    return { success: true };
}
