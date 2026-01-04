import { getTenantFromHeaders, getTenantBySlug, getTenantWhatsApp } from '@/lib/utils/tenant';
import { createClient } from '@/lib/supabase/server';
import { SiteClient } from '@/components/site/SiteClient';

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    
    const tenant = await getTenantFromHeaders() || await getTenantBySlug(slug);
    
    if (!tenant) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <h1 className="text-4xl font-bold text-red-600">Loja não encontrada</h1>
                <p className="mt-4 text-xl">A loja solicitada não existe ou não está disponível.</p>
            </div>
        );
    }
    
    const supabase = await createClient();
    const { data: assets } = await supabase
        .from('assets')
        .select('id, title, price, images, details, status')
        .eq('tenant_id', tenant.id)
        .eq('status', 'available')
        .order('created_at', { ascending: false });

    const whatsappNumber = await getTenantWhatsApp(tenant.id);

    return (
        <div className="min-h-screen bg-[#F0F2F5]">
            <div className="max-w-[1600px] mx-auto px-4 py-8">
                <div className="mb-8 text-center md:text-left">
                    <h1 className="text-4xl font-bold text-[#404F4F]">{tenant.name}</h1>
                    <p className="mt-2 text-xl text-muted-foreground">
                        Bem-vindo à nossa revenda de veículos
                    </p>
                </div>
                
                <SiteClient 
                    assets={assets || []} 
                    tenantName={tenant.name}
                    whatsappNumber={whatsappNumber}
                />
            </div>
        </div>
    );
}
