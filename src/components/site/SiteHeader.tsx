'use client';

import { useState, useEffect } from 'react';
import { Menu, X, MessageCircle, Sun, Moon } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { SiteMobileMenu } from './SiteMobileMenu';
import { useSiteTheme } from './SiteThemeProvider';

interface SiteHeaderProps {
    tenantName: string;
    logoSrc?: string;
    logoHeight?: number;
    sections?: any;
    whatsappNumber?: string | null;
    socialLinks?: any;
}

export function SiteHeader({
    tenantName,
    logoSrc,
    logoHeight,
    sections,
    whatsappNumber,
    socialLinks,
}: SiteHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { themeMode, toggleTheme } = useSiteTheme();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Gerar links de navegação baseados nas seções habilitadas
    const navLinks: { label: string; href: string }[] = [
        { label: 'Início', href: '#' },
    ];

    if (sections?.about?.enabled) navLinks.push({ label: 'Sobre', href: '#sobre' });
    if (sections?.featured?.enabled) navLinks.push({ label: 'Destaques', href: '#destaques' });
    navLinks.push({ label: 'Imóveis', href: '#imoveis' });
    if (sections?.services?.enabled) navLinks.push({ label: 'Serviços', href: '#servicos' });
    if (sections?.testimonials?.enabled) navLinks.push({ label: 'Depoimentos', href: '#depoimentos' });
    if (sections?.cta?.enabled) navLinks.push({ label: 'Contato', href: '#contato' });

    const handleNavClick = (href: string) => {
        setIsMobileMenuOpen(false);
        if (href === '#') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        const el = document.querySelector(href);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const whatsappHref = whatsappNumber
        ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${tenantName}! Vim pelo site e gostaria de mais informações.`)}`
        : null;

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    isScrolled
                        ? 'py-2 shadow-lg backdrop-blur-xl'
                        : 'py-4'
                }`}
                style={{
                    backgroundColor: isScrolled
                        ? 'var(--site-primary, #404F4F)'
                        : 'transparent',
                }}
            >
                <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between">
                    {/* Logo */}
                    <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleNavClick('#'); }}
                        className="flex items-center shrink-0"
                    >
                        {logoSrc ? (
                            <Logo
                                size="sm"
                                src={logoSrc}
                                height={isScrolled ? Math.min(logoHeight || 33, 33) : (logoHeight || 40)}
                            />
                        ) : (
                            <span
                                className={`text-xl font-bold transition-colors ${
                                    isScrolled 
                                        ? 'text-[var(--site-secondary)]' 
                                        : 'text-foreground'
                                }`}
                            >
                                {tenantName}
                            </span>
                        )}
                    </a>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <button
                                key={link.href}
                                onClick={() => handleNavClick(link.href)}
                                className={`px-4 py-2 text-sm font-medium transition-all rounded-lg hover:bg-white/10 ${
                                    isScrolled 
                                        ? 'text-[var(--site-primary-foreground)]' 
                                        : 'text-foreground/80 hover:text-foreground'
                                }`}
                            >
                                {link.label}
                            </button>
                        ))}
                    </nav>

                    {/* CTA + Mobile Toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-lg transition-colors ${
                                isScrolled 
                                    ? 'text-[var(--site-primary-foreground)] hover:bg-white/10' 
                                    : 'text-foreground hover:bg-foreground/10'
                            }`}
                            aria-label="Alternar tema"
                        >
                            {themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        {whatsappHref && (
                            <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 font-bold text-sm transition-all hover:scale-105 hover:shadow-lg bg-[#25D366] hover:bg-[#20BA5A] text-white hover:text-white"
                                style={{
                                    borderRadius: 'var(--site-radius, 12px)',
                                }}
                            >
                                <MessageCircle size={16} />
                                Fale Conosco
                            </a>
                        )}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`md:hidden p-2 rounded-lg transition-colors hover:bg-white/10 ${
                                isScrolled 
                                    ? 'text-[var(--site-primary-foreground)]' 
                                    : 'text-foreground'
                            }`}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            <SiteMobileMenu
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                navLinks={navLinks}
                onNavClick={handleNavClick}
                whatsappHref={whatsappHref}
                tenantName={tenantName}
                socialLinks={socialLinks}
            />
        </>
    );
}
