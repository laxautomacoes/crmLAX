import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getTenantBySlug } from '@/lib/utils/tenant';

/**
 * Sitemap XML dinâmico por tenant.
 * Gera uma lista de URLs de todos os imóveis publicados e disponíveis.
 * Inclui imagens para rich results no Google Images.
 */
export default async function sitemap({ params }: { params: Promise<{ slug: string }> }): Promise<MetadataRoute.Sitemap> {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);

    if (!tenant) return [];

    const supabase = await createClient();

    const { data: properties } = await supabase
        .from('properties')
        .select('id, title, slug, type, images, created_at')
        .eq('tenant_id', tenant.id)
        .eq('is_published', true)
        .eq('is_archived', false)
        .in('status', ['Disponível', 'Available', 'disponível', 'available'])
        .order('created_at', { ascending: false });

    // Base URL do tenant
    const baseUrl = tenant.custom_domain && tenant.custom_domain_verified
        ? `https://${tenant.custom_domain}`
        : `https://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online'}`;

    const sitePrefix = tenant.custom_domain && tenant.custom_domain_verified
        ? ''
        : `/site/${slug}`;

    const entries: MetadataRoute.Sitemap = [];

    // Página inicial do site vitrine
    entries.push({
        url: `${baseUrl}${sitePrefix || '/'}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
    });

    // Páginas individuais de imóveis
    if (properties) {
        for (const property of properties) {
            const propertySlug = property.slug || property.id;
            const propertyType = property.type || 'imovel';

            entries.push({
                url: `${baseUrl}${sitePrefix}/imovel/${propertyType}/${propertySlug}`,
                lastModified: property.created_at ? new Date(property.created_at) : new Date(),
                changeFrequency: 'weekly',
                priority: 0.8,
                // Nota: Next.js MetadataRoute.Sitemap suporta images nativamente
                ...(property.images?.length > 0 && {
                    images: property.images.slice(0, 5), // Max 5 imagens por URL
                }),
            });
        }
    }

    return entries;
}
