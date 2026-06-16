'use client';

import { useMemo } from 'react';
import { HeroSection } from './sections/HeroSection';
import { AboutSection } from './sections/AboutSection';
import { FeaturedSection } from './sections/FeaturedSection';
import { ServicesSection } from './sections/ServicesSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { CTASection } from './sections/CTASection';

export interface SiteSectionsConfig {
    hero?: {
        enabled: boolean;
        title?: string;
        subtitle?: string;
        cta_text?: string;
        cta_link?: string;
        background_image?: string;
        overlay_opacity?: number;
        style?: 'fullscreen' | 'split' | 'minimal';
        property_id?: string;
        property_title?: string;
    };
    about?: {
        enabled: boolean;
        title?: string;
        text?: string;
        image?: string;
        stats?: { value: string; label: string }[];
    };
    featured?: {
        enabled: boolean;
        title?: string;
        subtitle?: string;
    };
    services?: {
        enabled: boolean;
        title?: string;
        items?: { icon: string; title: string; description: string }[];
    };
    testimonials?: {
        enabled: boolean;
        title?: string;
        items?: { name: string; text: string; rating: number; avatar?: string }[];
    };
    cta?: {
        enabled: boolean;
        title?: string;
        subtitle?: string;
        button_text?: string;
        button_link?: string;
        background_color?: 'primary' | 'secondary' | 'gradient';
    };
    section_order?: string[];
}

interface SiteSectionRendererProps {
    sections?: SiteSectionsConfig;
    featuredProperties?: any[];
    tenantName: string;
    tenantSlug: string;
    whatsappNumber?: string | null;
    branding?: any;
}

const DEFAULT_ORDER = ['hero', 'about', 'featured', 'services', 'testimonials', 'cta'];

const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
    hero: HeroSection,
    about: AboutSection,
    featured: FeaturedSection,
    services: ServicesSection,
    testimonials: TestimonialsSection,
    cta: CTASection,
};

export function SiteSectionRenderer({
    sections,
    featuredProperties = [],
    tenantName,
    tenantSlug,
    whatsappNumber,
    branding,
}: SiteSectionRendererProps) {
    const order = useMemo(() => {
        return sections?.section_order || DEFAULT_ORDER;
    }, [sections?.section_order]);

    if (!sections) return null;

    return (
        <div className="site-sections space-y-0">
            {order
                .filter((key) => {
                    const sectionConfig = (sections as any)[key];
                    return sectionConfig?.enabled;
                })
                .map((key) => {
                    const Component = SECTION_COMPONENTS[key];
                    if (!Component) return null;

                    const sectionConfig = (sections as any)[key];

                    // Props especiais por seção
                    const extraProps: Record<string, any> = {};
                    if (key === 'featured') {
                        extraProps.properties = featuredProperties;
                        extraProps.tenantSlug = tenantSlug;
                    }
                    if (key === 'cta') {
                        extraProps.whatsappNumber = whatsappNumber;
                    }

                    return (
                        <Component
                            key={key}
                            config={sectionConfig}
                            tenantName={tenantName}
                            branding={branding}
                            {...extraProps}
                        />
                    );
                })}
        </div>
    );
}
