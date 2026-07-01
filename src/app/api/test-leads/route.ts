import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
    const supabase = await createAdminClient();
    let query = supabase
        .from('contacts')
        .select(`
      *,
      leads (
        * ,
        profiles:assigned_to (
            full_name
        )
      )
    `)
        .eq('tenant_id', 'fab0d1cb-a25f-46b6-a8a1-3b153cd8f743')
        .order('created_at', { ascending: false })
        .eq('is_owner_only', false)
        .limit(5);

    const { data: contacts, error } = await query;
    return NextResponse.json({
        error,
        contacts: contacts?.map(c => ({
            id: c.id,
            leadsCount: c.leads?.length,
            firstLeadAssignedTo: c.leads?.[0]?.assigned_to,
            firstLeadProfiles: c.leads?.[0]?.profiles
        }))
    });
}
