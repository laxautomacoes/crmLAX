export interface SiteSectionsConfig {
    hero?: { enabled: boolean; title?: string; subtitle?: string; cta_text?: string; cta_link?: string; background_image?: string; overlay_opacity?: number; style?: 'fullscreen' | 'split' | 'minimal'; property_id?: string; property_title?: string; };
    about?: { enabled: boolean; title?: string; text?: string; image?: string; stats?: { value: string; label: string }[]; };
    featured?: { enabled: boolean; title?: string; subtitle?: string; };
    services?: { enabled: boolean; title?: string; items?: { icon: string; title: string; description: string }[]; };
    testimonials?: { enabled: boolean; title?: string; items?: { name: string; text: string; rating: number; avatar?: string }[]; };
    cta?: { enabled: boolean; title?: string; subtitle?: string; button_text?: string; button_link?: string; background_color?: 'primary' | 'secondary' | 'gradient'; };
    section_order?: string[];
}
