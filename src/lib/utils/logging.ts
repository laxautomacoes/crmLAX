import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export type LogAction = 
  | 'login' 
  | 'logout' 
  | 'create_lead' 
  | 'update_lead' 
  | 'delete_lead' 
  | 'archive_lead' 
  | 'critical_deletion'
  | 'update_lead_stage'
  | 'create_asset' 
  | 'update_asset' 
  | 'delete_asset' 
  | 'archive_asset'
  | 'send_invitation' 
  | 'delete_invitation' 
  | 'accept_invitation'
  | 'update_profile'
  | 'update_tenant_branding'
  | 'create_note'
  | 'delete_note'
  | 'update_note';

export type EntityType = 'auth' | 'lead' | 'asset' | 'invitation' | 'profile' | 'tenant' | 'note';

interface CreateLogParams {
    action: LogAction;
    entityType: EntityType;
    entityId?: string;
    details?: any;
}

/**
 * Registra um log de sistema para o tenant e usuário atual.
 * Deve ser chamado de dentro de uma Server Action ou Server Component.
 */
export async function createLog({
    action,
    entityType,
    entityId,
    details = {}
}: CreateLogParams) {
    const supabase = await createClient();
    const headersList = await headers();
    
    // Captura metadados de rede (IP e User-Agent)
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = headersList.get('user-agent') || 'unknown';

    const extendedDetails = {
        ...details,
        _metadata: {
            ip,
            userAgent,
            timestamp: new Date().toISOString()
        }
    };

    try {
        // 1. Obter usuário atual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('Logging Error: No authenticated user found.', userError);
            return { success: false, error: 'User not authenticated' };
        }

        // 2. Obter profile para pegar o tenant_id
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('Logging Error: Profile/Tenant not found.', profileError);
            return { success: false, error: 'Profile not found' };
        }

        // 3. Inserir o log
        const { error: logError } = await supabase
            .from('system_logs')
            .insert({
                tenant_id: profile.tenant_id,
                profile_id: user.id,
                action,
                entity_type: entityType,
                entity_id: entityId,
                details: extendedDetails
            });

        if (logError) {
            console.error('Logging Error: Failed to insert log.', logError);
            return { success: false, error: logError.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Logging Error (Unexpected):', error);
        return { success: false, error: 'Unexpected logging error' };
    }
}
