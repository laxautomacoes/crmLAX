'use client';

import { Home, BedDouble, Bath, Square, Car, Waves, Utensils, PartyPopper, Dumbbell, Video, FileText, ExternalLink, Mail, MessageCircle, Phone } from 'lucide-react';

interface PropertyPublicViewProps {
    asset: any;
    broker: any;
    tenant: any;
}

export function PropertyPublicView({ asset, broker, tenant }: PropertyPublicViewProps) {
    if (!asset) return null;
    
    const details = asset.details || {};
    const amenities = [
        { id: 'piscina', icon: <Waves size={16} />, label: 'Piscina' },
        { id: 'academia', icon: <Dumbbell size={16} />, label: 'Academia' },
        { id: 'espaco_gourmet', icon: <Utensils size={16} />, label: 'Espaço Gourmet' },
        { id: 'salao_festas', icon: <PartyPopper size={16} />, label: 'Salão de Festas' },
    ].filter(a => details[a.id]);

    const brokerPhone = broker?.whatsapp_number || tenant?.branding?.whatsapp || '';
    const cleanBrokerPhone = brokerPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanBrokerPhone}?text=${encodeURIComponent(`Olá! Vi o imóvel "${asset.title}" no site e gostaria de mais informações.`)}`;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Conteúdo Principal */}
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">{asset.title}</h1>
                        <p className="text-lg text-muted-foreground flex items-center gap-2">
                            {details.endereco?.bairro && `${details.endereco.bairro}, `}
                            {details.endereco?.cidade && `${details.endereco.cidade}`}
                        </p>
                    </div>

                    {/* Galeria de Mídia */}
                    <div className="space-y-4">
                        <div className="aspect-video rounded-2xl overflow-hidden bg-muted shadow-sm">
                            <img src={asset.images?.[0]} className="w-full h-full object-cover" alt={asset.title} />
                        </div>
                        {asset.images?.length > 1 && (
                            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                                {asset.images.slice(1).map((img: string, i: number) => (
                                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                                        <img src={img} className="w-full h-full object-cover" alt="" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Grid de Detalhes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-card rounded-2xl border border-border shadow-sm">
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30">
                            <BedDouble className="text-secondary mb-2" size={24} />
                            <span className="text-lg font-bold">{details.quartos || 0}</span>
                            <span className="text-xs text-muted-foreground uppercase font-medium">Quartos</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30">
                            <Bath className="text-secondary mb-2" size={24} />
                            <span className="text-lg font-bold">{details.banheiros || 0}</span>
                            <span className="text-xs text-muted-foreground uppercase font-medium">Banheiros</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30">
                            <Car className="text-secondary mb-2" size={24} />
                            <span className="text-lg font-bold">{details.vagas || 0}</span>
                            <span className="text-xs text-muted-foreground uppercase font-medium">Vagas</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30">
                            <span className="text-lg font-bold">{details.area_util || details.area_total || 0}m²</span>
                            <span className="text-xs text-muted-foreground uppercase font-medium">Área</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Preço e Corretor */}
                <div className="space-y-6">
                    <div className="p-6 bg-card rounded-2xl border border-border shadow-sm sticky top-8">
                        <div className="mb-6">
                            <span className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Valor do Imóvel</span>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-3xl font-black text-foreground">
                                    {asset.price ? `R$ ${Number(asset.price).toLocaleString('pt-BR')}` : 'Sob consulta'}
                                </span>
                            </div>
                        </div>

                        {/* Info do Corretor */}
                        <div className="pt-6 border-t border-border space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-secondary/20 shadow-sm">
                                    {broker?.avatar_url ? (
                                        <img src={broker.avatar_url} className="w-full h-full object-cover" alt={broker.full_name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-secondary/10 text-secondary">
                                            <Home size={32} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Corretor</p>
                                    <p className="text-lg font-bold text-foreground">{broker?.full_name || tenant?.name}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md"
                                >
                                    <MessageCircle size={22} />
                                    Falar no WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}import { getTenantBySlug } from '@/lib/utils/tenant';
import { getAssetById } from '@/app/_actions/assets';
import { getBrokerProfile } from '@/app/_actions/profile';
import { PropertyPublicView } from '@/components/site/PropertyPublicView';

export default async function PropertyPage({ params, searchParams }: any) {
    const { slug, id } = await params;
    const { b: brokerId } = await searchParams;

    const tenant = await getTenantBySlug(slug);
    const { data: asset } = await getAssetById(id);
    
    let broker = null;
    if (brokerId) {
        const { data } = await getBrokerProfile(brokerId);
        broker = data;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a href={`/site/${slug}`} className="text-xl font-black text-foreground">{tenant?.name}</a>
                </div>
            </div>
            <PropertyPublicView asset={asset} broker={broker} tenant={tenant} />
        </div>
    );
}'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { getTenantFromHeaders } from '@/lib/utils/tenant'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPropertyEmail(leadId: string, leadEmail: string, propertyData: any) {
    const tenant = await getTenantFromHeaders()
    if (!tenant) return { success: false, error: 'Tenant not found' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const brokerId = user?.id

    const propertyUrl = `https://${tenant.slug}.laxperience.online/site/${tenant.slug}/property/${propertyData.id}${brokerId ? `?b=${brokerId}` : ''}`

    try {
        const { data, error } = await resend.emails.send({
            from: `${tenant.name} <noreply@laxperience.online>`,
            to: [leadEmail],
            subject: `Confira este imóvel: ${propertyData.title}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          ${propertyData.images?.[0] ? `<img src="${propertyData.images[0]}" style="width: 100%; height: 300px; object-fit: cover;" />` : ''}
          <div style="padding: 24px;">
            <h1 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 24px;">${propertyData.title}</h1>
            <p style="font-size: 20px; font-weight: bold; color: #000; margin: 0 0 24px 0;">
              R$ ${new Intl.NumberFormat('pt-BR').format(propertyData.price)}
            </p>
            
            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 16px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">Detalhes do Imóvel</h2>
              <ul style="margin: 0; padding: 0; list-style: none;">
                ${propertyData.details?.quartos ? `<li style="margin-bottom: 8px; color: #444;">• ${propertyData.details.quartos} Quartos</li>` : ''}
                ${propertyData.details?.suites ? `<li style="margin-bottom: 8px; color: #444;">• ${propertyData.details.suites} Suítes</li>` : ''}
                ${propertyData.details?.area_privativa ? `<li style="margin-bottom: 8px; color: #444;">• ${propertyData.details.area_privativa}m² privativos</li>` : ''}
                <li style="margin-bottom: 8px; color: #444;">• Tipo: ${propertyData.type}</li>
              </ul>
            </div>

            <a href="${propertyUrl}" style="background-color: #000; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; text-align: center;">
              Ver todos os detalhes no site
            </a>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0;">Enviado por <strong>${tenant.name}</strong></p>
            <p style="color: #999; font-size: 12px; margin: 8px 0 0 0;">Gerenciado pelo CRM LAX</p>
          </div>
        </div>
      `
        })

        if (error) throw error

        // Log interaction
        await logInteraction(leadId, 'system', `E-mail enviado com o imóvel: ${propertyData.title}`)

        return { success: true, data }
    } catch (error: any) {
        console.error('Error sending email:', error)
        return { success: false, error: error.message }
    }
}

export async function logInteraction(leadId: string, type: 'whatsapp' | 'system' | 'note', content: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('interactions')
        .insert({
            lead_id: leadId,
            type: type,
            content: content,
            metadata: { sent_at: new Date().toISOString() }
        })

    if (error) console.error('Error logging interaction:', error)
}
