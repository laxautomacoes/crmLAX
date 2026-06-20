'use client';
import { useState } from 'react';
import { Instagram, Facebook, Linkedin, Youtube, MapPin } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';

export function SiteFooter({ tenantName, branding }: { tenantName: string; branding?: any }) {
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const social = branding?.social_links || {};
    const addr = branding?.address;

    return (
        <footer className="mt-20 py-12 border-t border-border font-sans">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <h4 className="font-bold text-lg mb-4 text-foreground">{tenantName}</h4>
                    <p className="text-sm text-muted-foreground max-w-xs transition-all">
                        Sua melhor escolha em imóveis com a tecnologia do CRM LAX.
                    </p>
                </div>
                <div>
                    <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-foreground">Localização</h4>
                    {addr?.street ? (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin size={18} className="text-secondary shrink-0 mt-0.5" />
                            <div>
                                <p>{addr.street}, {addr.number}</p>
                                <p>{addr.neighborhood}</p>
                                <p>{addr.city} - {addr.state}</p>
                            </div>
                        </div>
                    ) : <p className="text-sm text-muted-foreground">Endereço não informado.</p>}
                </div>
                <div>
                    <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-foreground">Políticas</h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                        <li><button onClick={() => setIsPrivacyOpen(true)} className="hover:text-secondary cursor-pointer">Política de Privacidade</button></li>
                        <li><button onClick={() => setIsTermsOpen(true)} className="hover:text-secondary cursor-pointer">Termos de Serviço</button></li>
                    </ul>
                </div>
                <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-sm uppercase tracking-widest mb-2 text-foreground">Siga-nos</h4>
                    <div className="flex items-center gap-4">
                        {social.instagram && <a href={social.instagram} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all"><Instagram size={20} /></a>}
                        {social.facebook && <a href={social.facebook} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all"><Facebook size={20} /></a>}
                        {social.linkedin && <a href={social.linkedin} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all"><Linkedin size={20} /></a>}
                        {social.youtube && <a href={social.youtube} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all"><Youtube size={20} /></a>}
                    </div>
                </div>
            </div>
            <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-muted-foreground uppercase font-bold tracking-tighter">
                <p>© {new Date().getFullYear()} {tenantName} - Todos os direitos reservados.</p>
                <p>Desenvolvido por <span className="text-foreground font-black">CRM LAX</span></p>
            </div>
            <Modal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} title="Política de Privacidade" size="lg">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                    <p className="whitespace-pre-wrap leading-relaxed">{branding?.privacy_policy || 'A Política de Privacidade ainda não foi configurada.'}</p>
                </div>
            </Modal>
            <Modal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} title="Termos de Serviço" size="lg">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                    <p className="whitespace-pre-wrap leading-relaxed">{branding?.terms_of_service || 'Os Termos de Serviço ainda não foram configurados.'}</p>
                </div>
            </Modal>
        </footer>
    );
}
