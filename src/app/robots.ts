import { MetadataRoute } from 'next';

/**
 * Robots.txt global da aplicação.
 * Permite indexação das páginas do site vitrine.
 * Bloqueia acesso às rotas internas do CRM.
 */
export default function robots(): MetadataRoute.Robots {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online';

    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/site/',        // Páginas do site vitrine
                    '/imovel/',      // Rotas de imóveis com domínio customizado (rewrite)
                ],
                disallow: [
                    '/dashboard',    // CRM Dashboard
                    '/superadmin',   // Painel SuperAdmin
                    '/settings',     // Configurações
                    '/api/',         // API routes
                    '/_next/',       // Next.js internals
                    '/auth/',        // Autenticação
                    '/login',        // Login
                    '/register',     // Registro
                ],
            },
            {
                userAgent: 'Googlebot',
                allow: ['/site/', '/imovel/'],
            },
        ],
        sitemap: `https://${rootDomain}/site/sitemap.xml`,
    };
}
