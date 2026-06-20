'use client';

import { useEffect, useMemo, useState, createContext, useContext } from 'react';
import { useTheme } from 'next-themes';

export interface SiteThemeContextType {
    themeMode: 'light' | 'dark';
    toggleTheme: () => void;
}

export const SiteThemeContext = createContext<SiteThemeContextType | undefined>(undefined);

export function useSiteTheme() {
    const context = useContext(SiteThemeContext);
    if (!context) {
        throw new Error('useSiteTheme must be used within a SiteThemeProvider');
    }
    return context;
}

export interface SiteTheme {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
    dark_mode?: 'auto' | 'light' | 'dark';
    border_radius?: 'rounded' | 'sharp' | 'pill';
}

interface SiteThemeProviderProps {
    theme?: SiteTheme;
    children: React.ReactNode;
}

// Mapeamento de fontes disponíveis para Google Fonts
const FONT_MAP: Record<string, string> = {
    'Inter': 'Inter:wght@300;400;500;600;700;800;900',
    'Poppins': 'Poppins:wght@300;400;500;600;700;800;900',
    'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@300;400;500;600;700;800',
    'DM Sans': 'DM+Sans:wght@300;400;500;600;700',
    'Outfit': 'Outfit:wght@300;400;500;600;700;800;900',
    'Montserrat': 'Montserrat:wght@300;400;500;600;700;800;900',
    'Raleway': 'Raleway:wght@300;400;500;600;700;800;900',
    'Nunito': 'Nunito:wght@300;400;500;600;700;800;900',
};

// Gera variantes de cor (lighter/darker) a partir de hex
function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getContrastColor(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '#ffffff';
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#121414' : '#ffffff';
}

function getBorderRadius(style?: string): string {
    switch (style) {
        case 'sharp': return '0px';
        case 'pill': return '9999px';
        case 'rounded':
        default: return '12px';
    }
}

export function SiteThemeProvider({ theme, children }: SiteThemeProviderProps) {
    const defaults: SiteTheme = {
        primary_color: '#404F4F',
        secondary_color: '#FFE600',
        accent_color: '#8B2332',
        font_family: 'Inter',
        dark_mode: 'auto',
        border_radius: 'rounded',
    };

    const { setTheme } = useTheme();
    const merged = useMemo(() => ({ ...defaults, ...theme }), [theme]);

    const [visitorTheme, setVisitorTheme] = useState<'light' | 'dark' | null>(null);
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

    // Carregar preferência salva
    useEffect(() => {
        const saved = localStorage.getItem('crmlax-visitor-theme');
        if (saved === 'light' || saved === 'dark') {
            setVisitorTheme(saved);
        }
    }, []);

    // Monitorar preferência do sistema no cliente
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };
        setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
        mediaQuery.addEventListener('change', handleSystemThemeChange);
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, []);

    // Determinar o tema ativo a ser enviado ao next-themes ('light', 'dark' ou 'system')
    const activeTheme = useMemo<'light' | 'dark' | 'system'>(() => {
        if (visitorTheme) return visitorTheme;
        if (merged.dark_mode === 'dark') return 'dark';
        if (merged.dark_mode === 'light') return 'light';
        return 'system';
    }, [visitorTheme, merged.dark_mode]);

    // Tema resolvido atual (apenas 'light' ou 'dark') para a UI e ícones
    const currentResolvedTheme = useMemo<'light' | 'dark'>(() => {
        if (activeTheme === 'system') return systemTheme;
        return activeTheme;
    }, [activeTheme, systemTheme]);

    // Sincronizar com next-themes para propagar a classe .dark ao elemento html
    useEffect(() => {
        setTheme(activeTheme);
    }, [activeTheme, setTheme]);

    // Alternar tema e salvar no localStorage
    const toggleTheme = () => {
        const nextTheme = currentResolvedTheme === 'dark' ? 'light' : 'dark';
        setVisitorTheme(nextTheme);
        localStorage.setItem('crmlax-visitor-theme', nextTheme);
    };

    // Carregar fonte do Google Fonts
    useEffect(() => {
        const fontFamily = merged.font_family || 'Inter';
        const fontSpec = FONT_MAP[fontFamily];
        if (!fontSpec) return;

        const linkId = 'site-theme-font';
        const existing = document.getElementById(linkId);
        if (existing) existing.remove();

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontSpec}&display=swap`;
        document.head.appendChild(link);

        return () => {
            const el = document.getElementById(linkId);
            if (el) el.remove();
        };
    }, [merged.font_family]);

    // Aplicar a classe .dark também ao site-theme-root local para compatibilidade
    useEffect(() => {
        const siteRoot = document.getElementById('site-theme-root');
        if (!siteRoot) return;

        if (currentResolvedTheme === 'dark') {
            siteRoot.classList.add('dark');
        } else {
            siteRoot.classList.remove('dark');
        }
    }, [currentResolvedTheme]);

    const primaryHSL = hexToHSL(merged.primary_color!);
    const secondaryHSL = hexToHSL(merged.secondary_color!);
    const accentHSL = hexToHSL(merged.accent_color!);

    const cssVars: Record<string, string> = {
        '--site-primary': merged.primary_color!,
        '--site-primary-foreground': getContrastColor(merged.primary_color!),
        '--site-secondary': merged.secondary_color!,
        '--site-secondary-foreground': getContrastColor(merged.secondary_color!),
        '--site-accent': merged.accent_color!,
        '--site-accent-foreground': getContrastColor(merged.accent_color!),
        '--site-font': `'${merged.font_family}', sans-serif`,
        '--site-radius': getBorderRadius(merged.border_radius),
        '--site-radius-sm': merged.border_radius === 'sharp' ? '0px' : merged.border_radius === 'pill' ? '9999px' : '8px',
        '--site-radius-lg': merged.border_radius === 'sharp' ? '0px' : merged.border_radius === 'pill' ? '9999px' : '16px',
    };

    // Variantes de cor para hover/gradientes
    if (primaryHSL) {
        cssVars['--site-primary-light'] = `hsl(${primaryHSL.h}, ${primaryHSL.s}%, ${Math.min(primaryHSL.l + 15, 95)}%)`;
        cssVars['--site-primary-dark'] = `hsl(${primaryHSL.h}, ${primaryHSL.s}%, ${Math.max(primaryHSL.l - 15, 5)}%)`;
    }
    if (secondaryHSL) {
        cssVars['--site-secondary-light'] = `hsl(${secondaryHSL.h}, ${secondaryHSL.s}%, ${Math.min(secondaryHSL.l + 15, 95)}%)`;
        cssVars['--site-secondary-dark'] = `hsl(${secondaryHSL.h}, ${secondaryHSL.s}%, ${Math.max(secondaryHSL.l - 15, 5)}%)`;
    }
    if (accentHSL) {
        cssVars['--site-accent-light'] = `hsl(${accentHSL.h}, ${accentHSL.s}%, ${Math.min(accentHSL.l + 15, 95)}%)`;
        cssVars['--site-accent-dark'] = `hsl(${accentHSL.h}, ${accentHSL.s}%, ${Math.max(accentHSL.l - 15, 5)}%)`;
    }

    return (
        <SiteThemeContext.Provider value={{ themeMode: currentResolvedTheme, toggleTheme }}>
            <div
                id="site-theme-root"
                style={cssVars as React.CSSProperties}
                className="site-themed"
            >
                <style>{`
                    .site-themed {
                        font-family: var(--site-font);
                    }
                    .site-themed * {
                        font-family: inherit;
                    }
                `}</style>
                {children}
            </div>
        </SiteThemeContext.Provider>
    );
}

// Hook para componentes internos do site acessarem as fontes disponíveis
export const AVAILABLE_FONTS = Object.keys(FONT_MAP);
