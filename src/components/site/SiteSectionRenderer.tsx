'use client';

import { useMemo } from 'react';
import { HeroSection } from './sections/HeroSection';
import { AboutSection } from './sections/AboutSection';
import { FeaturedSection } from './sections/FeaturedSection';
import { ServicesSection } from './sections/ServicesSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { CTASection } from './sections/CTASection';
import { SiteSectionsConfig } from './sections/types';

interface SiteSectionRendererProps {
    sections?: SiteSectionsConfig; featuredProperties?: any[]; tenantName: string;
    tenantSlug: string; whatsappNumber?: string | null; branding?: any; children?: React.ReactNode;
}

const DEFAULT_ORDER = ['search', 'hero', 'about', 'featured', 'services', 'testimonials', 'cta'];

const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
    hero: HeroSection, about: AboutSection, featured: FeaturedSection,
    services: ServicesSection, testimonials: TestimonialsSection, cta: CTASection
};

export function SiteSectionRenderer({
    sections, featuredProperties = [], tenantName, tenantSlug, whatsappNumber, branding, children
}: SiteSectionRendererProps) {
    const order = useMemo(() => sections?.section_order || DEFAULT_ORDER, [sections?.section_order]);
    if (!sections) return null;

    return (
        <div className="site-sections space-y-0">
            {order
                .filter((key) => {
                    if (key === 'search') return (sections as any)[key]?.enabled ?? true;
                    return (sections as any)[key]?.enabled;
                })
                .map((key) => {
                    if (key === 'search') return <div key={key}>{children}</div>;

                    const Component = SECTION_COMPONENTS[key];
                    if (!Component) return null;

                    const extraProps: Record<string, any> = {};
                    if (key === 'featured') {
                        extraProps.properties = featuredProperties;
                        extraProps.tenantSlug = tenantSlug;
                    }
                    if (key === 'cta') extraProps.whatsappNumber = whatsappNumber;

                    return (
                        <div key={key}>
                            <Component config={(sections as any)[key]} tenantName={tenantName} branding={branding} {...extraProps} />
                        </div>
                    );
                })}
        </div>
    );
}
