import { getTenantFromHeaders, getTenantBySlug, getTenantWhatsApp } from '@/lib/utils/tenant';
import { createClient } from '@/lib/supabase/server';
import { SiteClient } from '@/components/site/SiteClient';
import { Logo } from '@/components/shared/Logo';

export const dynamic = 'force-dynamic';

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const tenant = await getTenantFromHeaders() || await getTenantBySlug(slug);

    if (!tenant) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-background">
                <h1 className="text-4xl font-bold text-destructive">Loja não encontrada</h1>
                <p className="mt-4 text-xl text-muted-foreground">A loja solicitada não existe ou não está disponível.</p>
            </div>
        );
    }

    let assets: any[] = [];
    let whatsappNumber: string | null = null;

    try {
        const supabase = await createClient();

        console.log('Fetching assets for tenant:', { id: tenant.id, slug: tenant.slug, name: tenant.name });

        const { data, error: supabaseError } = await supabase
            .from('assets')
            .select('*')
            .eq('tenant_id', tenant.id)
            .neq('status', 'Pendente')
            .order('created_at', { ascending: false });

        if (supabaseError) {
            console.error('Supabase error fetching assets:', {
                message: supabaseError.message,
                details: supabaseError.details,
                hint: supabaseError.hint,
                code: supabaseError.code
            });
        } else {
            console.log(`Found ${data?.length || 0} assets`);
            assets = data?.filter((a: any) => 
                a.status?.toLowerCase() === 'disponível' || 
                a.status?.toLowerCase() === 'disponivel' ||
                a.status?.toLowerCase() === 'available'
            ) || [];
        }

        whatsappNumber = await getTenantWhatsApp(tenant.id);
    } catch (err) {
        console.error('Unexpected error in SitePage:', err);
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-[1600px] mx-auto px-4 py-8">
                <div className="mb-8 flex flex-col items-center md:items-start">
                    <Logo 
                        size="lg" 
                        src={tenant.branding?.logo_full} 
                        height={tenant.branding?.logo_height} 
                    />
                    {!tenant.branding?.logo_full && (
                        <h1 className="text-4xl font-bold text-foreground mt-2">{tenant.name}</h1>
                    )}
                    <p className="mt-2 text-xl text-muted-foreground">
                        Encontre o seu novo lar
                    </p>
                </div>

                <SiteClient
                    assets={assets}
                    tenantName={tenant.name}
                    whatsappNumber={whatsappNumber}
                />
            </div>
        </div>
    );
}
