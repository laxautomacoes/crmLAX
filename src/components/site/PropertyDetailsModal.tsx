'use client';

import { Modal } from '@/components/shared/Modal';
import { Home, MapPin, BedDouble, Bath, Square, Car, Shield, Waves, Utensils, PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, Video, FileText, ExternalLink } from 'lucide-react';

export function PropertyDetailsModal({ isOpen, onClose, asset }: { isOpen: boolean, onClose: () => void, asset: any }) {
    if (!asset) return null;
    const details = asset.details || {};
    const amenities = [
        { id: 'piscina', icon: <Waves size={16} />, label: 'Piscina' },
        { id: 'academia', icon: <Dumbbell size={16} />, label: 'Academia' },
        { id: 'espaco_gourmet', icon: <Utensils size={16} />, label: 'Espaço Gourmet' },
        { id: 'salao_festas', icon: <PartyPopper size={16} />, label: 'Salão de Festas' },
        { id: 'home_market', icon: <Home size={16} />, label: 'Home Market' },
    ].filter(a => details[a.id]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={asset.title} size="xl">
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                            <img src={asset.images?.[0]} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {asset.images?.slice(1, 5).map((img: string, i: number) => (
                                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border">
                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-foreground">
                                {asset.price ? `R$ ${Number(asset.price).toLocaleString('pt-BR')}` : 'Sob consulta'}
                            </span>
                            <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full uppercase">{asset.status}</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1"><BedDouble size={16} /> {details.quartos || 0} Q</div>
                            <div className="flex items-center gap-1"><Bath size={16} /> {details.banheiros || 0} B</div>
                            <div className="flex items-center gap-1"><Car size={16} /> {details.vagas || 0} V</div>
                            <div className="flex items-center gap-1"><Square size={16} /> {details.area_util || details.area_total || 0}m²</div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{asset.description || 'Sem descrição disponível.'}</p>
                        {amenities.length > 0 && (
                            <div className="pt-4 border-t border-border">
                                <h4 className="text-sm font-bold text-foreground mb-3">Diferenciais</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {amenities.map(a => (
                                        <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary">{a.icon}</div>
                                            {a.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {(asset.videos?.length > 0 || asset.documents?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
                        {asset.videos?.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-foreground flex items-center gap-2"><Video size={18} className="text-secondary" /> Vídeos</h4>
                                <div className="space-y-2">
                                    {asset.videos.map((url: string, i: number) => (
                                        <a key={i} href={url} target="_blank" className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors group">
                                            <span className="text-xs font-medium">Vídeo {i + 1}</span>
                                            <ExternalLink size={14} className="text-muted-foreground group-hover:text-secondary" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        {asset.documents?.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-foreground flex items-center gap-2"><FileText size={18} className="text-secondary" /> Documentos</h4>
                                <div className="space-y-2">
                                    {asset.documents.map((doc: any, i: number) => (
                                        <a key={i} href={doc.url} target="_blank" className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors group">
                                            <span className="text-xs font-medium truncate pr-4">{doc.name}</span>
                                            <ExternalLink size={14} className="text-muted-foreground group-hover:text-secondary" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
