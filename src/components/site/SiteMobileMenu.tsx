'use client';

import { Instagram, Facebook, Linkedin, Youtube, MessageCircle, X } from 'lucide-react';

interface SiteMobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    navLinks: { label: string; href: string }[];
    onNavClick: (href: string) => void;
    whatsappHref: string | null;
    tenantName: string;
    socialLinks?: {
        instagram?: string;
        facebook?: string;
        linkedin?: string;
        youtube?: string;
    };
}

export function SiteMobileMenu({
    isOpen,
    onClose,
    navLinks,
    onNavClick,
    whatsappHref,
    tenantName,
    socialLinks,
}: SiteMobileMenuProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ backgroundColor: 'var(--site-primary, #404F4F)' }}
        >
            {/* Close button */}
            <div className="flex justify-end p-4">
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--site-primary-foreground, #ffffff)' }}
                >
                    <X size={24} />
                </button>
            </div>

            {/* Nav Links */}
            <nav className="flex flex-col items-center gap-2 px-6 mt-8">
                {navLinks.map((link, i) => (
                    <button
                        key={link.href}
                        onClick={() => onNavClick(link.href)}
                        className="w-full text-center py-4 text-lg font-bold transition-all rounded-xl hover:bg-white/10"
                        style={{
                            color: 'var(--site-primary-foreground, #ffffff)',
                            animationDelay: `${i * 50}ms`,
                        }}
                    >
                        {link.label}
                    </button>
                ))}
            </nav>

            {/* WhatsApp CTA */}
            {whatsappHref && (
                <div className="px-6 mt-8">
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full py-4 font-bold text-lg transition-all hover:scale-[1.02] bg-[#25D366] hover:bg-[#20BA5A] text-white hover:text-white"
                        style={{
                            borderRadius: 'var(--site-radius, 12px)',
                        }}
                    >
                        <MessageCircle size={20} />
                        Fale Conosco
                    </a>
                </div>
            )}

            {/* Social Links */}
            {socialLinks && (
                <div className="flex items-center justify-center gap-4 mt-10">
                    {socialLinks.instagram && (
                        <a
                            href={socialLinks.instagram.startsWith('http') ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            style={{ color: 'var(--site-primary-foreground, #ffffff)' }}
                        >
                            <Instagram size={20} />
                        </a>
                    )}
                    {socialLinks.facebook && (
                        <a
                            href={socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            style={{ color: 'var(--site-primary-foreground, #ffffff)' }}
                        >
                            <Facebook size={20} />
                        </a>
                    )}
                    {socialLinks.linkedin && (
                        <a
                            href={socialLinks.linkedin.startsWith('http') ? socialLinks.linkedin : `https://linkedin.com/company/${socialLinks.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            style={{ color: 'var(--site-primary-foreground, #ffffff)' }}
                        >
                            <Linkedin size={20} />
                        </a>
                    )}
                    {socialLinks.youtube && (
                        <a
                            href={socialLinks.youtube.startsWith('http') ? socialLinks.youtube : `https://youtube.com/${socialLinks.youtube}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            style={{ color: 'var(--site-primary-foreground, #ffffff)' }}
                        >
                            <Youtube size={20} />
                        </a>
                    )}
                </div>
            )}

            {/* Tenant Name */}
            <p
                className="text-center mt-auto pb-8 text-xs font-medium opacity-50 absolute bottom-0 left-0 right-0"
                style={{ color: 'var(--site-primary-foreground, #ffffff)' }}
            >
                © {new Date().getFullYear()} {tenantName}
            </p>
        </div>
    );
}
