'use client';

import { useState } from 'react';
import { PropertyFilters } from './PropertyFilters';
import { PropertiesGrid } from './PropertiesGrid';
import { PropertiesList } from './PropertiesList';
import { WhatsAppButton } from './WhatsAppButton';
import { Instagram, Facebook, Linkedin, Youtube, MapPin } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';

interface SiteClientProps {
    properties: any[];
    tenantName: string;
    tenantSlug: string;
    whatsappNumber?: string | null;
    branding?: any;
}

export function SiteClient({ properties, tenantName, tenantSlug, whatsappNumber, branding }: SiteClientProps) {
    const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [filters, setFilters] = useState({
        tipo: '',
        quartos: '',
        precoMin: '',
        precoMax: '',
        search: ''
    });

    const filteredProperties = properties.filter(property => {
        // Filtro de busca
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const titleLower = property.title.toLowerCase();
            const tipo = (property.details?.tipo_property || property.details?.type || '').toLowerCase();
            const bairro = (property.details?.endereco?.bairro || '').toLowerCase();
            if (!titleLower.includes(searchLower) && !tipo.includes(searchLower) && !bairro.includes(searchLower)) {
                return false;
            }
        }

        // Filtro de tipo
        if (filters.tipo) {
            const tipo = (property.details?.tipo_property || property.details?.type || '').toLowerCase();
            if (!tipo.includes(filters.tipo.toLowerCase())) {
                return false;
            }
        }

        // Filtro de dormitórios
        if (filters.quartos) {
            const dormitorios = String(property.details?.dormitorios || property.details?.quartos || property.details?.rooms || '');
            if (!dormitorios.includes(filters.quartos)) {
                return false;
            }
        }

        // Filtro de preço máximo
        if (filters.precoMax && property.price) {
            const precoMax = parseFloat(filters.precoMax.replace(/[^\d,.-]/g, '').replace(',', '.'));
            if (!isNaN(precoMax) && Number(property.price) > precoMax) {
                return false;
            }
        }

        return true;
    });
    return (
        <>
            <PropertyFilters
                filters={filters}
                onFilterChange={setFilters}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            {properties.length === 0 || filteredProperties.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-border animate-in fade-in zoom-in duration-500">
                    <p className="text-xl font-bold text-foreground mb-2">
                        Nenhum imóvel disponível no momento
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Volte em breve para ver nossos imóveis!
                    </p>
                </div>
            ) : (
                viewMode === 'gallery' ? (
                    <PropertiesGrid properties={filteredProperties} tenantSlug={tenantSlug} />
                ) : (
                    <PropertiesList properties={filteredProperties} tenantSlug={tenantSlug} />
                )
            )}
            {whatsappNumber && <WhatsAppButton phone={whatsappNumber} />}

            {/* Footer */}
            <footer className="mt-20 py-12 border-t border-border font-sans">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h4 className="font-bold text-lg mb-4 text-[#404F4F]">{tenantName}</h4>
                        <p className="text-sm text-muted-foreground max-w-xs transition-all">
                            Sua melhor escolha em imóveis com a tecnologia do CRM LAX.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-[#404F4F]">Localização</h4>
                        {branding?.address?.street ? (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin size={18} className="text-secondary shrink-0 mt-0.5" />
                                <div>
                                    <p>{branding.address.street}, {branding.address.number}</p>
                                    <p>{branding.address.neighborhood}</p>
                                    <p>{branding.address.city} - {branding.address.state}</p>
                                    <p>{branding.address.zip_code}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Endereço não informado.</p>
                        )}
                    </div>

                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-[#404F4F]">Políticas</h4>
                        <ul className="space-y-3">
                            <li>
                                <button 
                                    onClick={() => setIsPrivacyOpen(true)}
                                    className="text-sm text-muted-foreground hover:text-secondary transition-colors"
                                >
                                    Política de Privacidade
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setIsTermsOpen(true)}
                                    className="text-sm text-muted-foreground hover:text-secondary transition-colors"
                                >
                                    Termos de Serviço
                                </button>
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="font-bold text-sm uppercase tracking-widest mb-2 text-[#404F4F]">Siga-nos</h4>
                        <div className="flex items-center gap-4">
                            {branding?.social_links?.instagram && (
                                <a href={branding.social_links.instagram} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all">
                                    <Instagram size={20} />
                                </a>
                            )}
                            {branding?.social_links?.facebook && (
                                <a href={branding.social_links.facebook} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all">
                                    <Facebook size={20} />
                                </a>
                            )}
                            {branding?.social_links?.linkedin && (
                                <a href={branding.social_links.linkedin} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all">
                                    <Linkedin size={20} />
                                </a>
                            )}
                            {branding?.social_links?.youtube && (
                                <a href={branding.social_links.youtube} target="_blank" className="p-2 bg-muted/50 rounded-lg hover:bg-secondary hover:text-white transition-all">
                                    <Youtube size={20} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-muted-foreground uppercase font-bold tracking-tighter">
                    <p>© {new Date().getFullYear()} {tenantName} - Todos os direitos reservados.</p>
                    <p className="flex items-center gap-1">
                        Desenvolvido por <span className="text-[#404F4F] font-black">CRM LAX</span>
                    </p>
                </div>
            </footer>

            {/* Modals de Políticas */}
            <Modal
                isOpen={isPrivacyOpen}
                onClose={() => setIsPrivacyOpen(false)}
                title="Política de Privacidade"
                size="lg"
            >
                <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                        {branding?.privacy_policy || 'A Política de Privacidade ainda não foi configurada para este site.'}
                    </p>
                </div>
            </Modal>

            <Modal
                isOpen={isTermsOpen}
                onClose={() => setIsTermsOpen(false)}
                title="Termos de Serviço"
                size="lg"
            >
                <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                        {branding?.terms_of_service || 'Os Termos de Serviço ainda não foram configurados para este site.'}
                    </p>
                </div>
            </Modal>
        </>
    );
}

