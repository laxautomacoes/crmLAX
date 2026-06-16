'use client';

import { useState, useEffect } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Image as ImageIcon,
    Upload,
    Loader2,
    Trash2,
    Plus,
    GripVertical,
    Star,
    Home,
    Key,
    Building,
    TrendingUp,
    Shield,
    Search,
    Handshake,
    FileText,
    BarChart3,
    MapPin,
    Briefcase,
    Heart,
    Eye,
    EyeOff,
    Video,
    Check,
    X,
    Link
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
    home: Home, key: Key, building: Building, trending: TrendingUp,
    shield: Shield, search: Search, handshake: Handshake, file: FileText,
    chart: BarChart3, map: MapPin, briefcase: Briefcase, heart: Heart,
};

interface SectionSettingsPanelProps {
    sections: any;
    onSectionsChange: (sections: any) => void;
    tenantId: string;
    tenantSlug: string;
}

// Upload helper reutilizável
async function uploadImage(file: File, tenantId: string): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const fileName = `site-sections/${tenantId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error } = await supabase.storage
        .from('property-properties')
        .upload(fileName, file, { cacheControl: '3600' });

    if (error) {
        toast.error('Erro ao enviar imagem: ' + error.message);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('property-properties')
        .getPublicUrl(fileName);

    return publicUrl;
}

function ImageUpload({
    value,
    onChange,
    tenantId,
    label,
    height = 'h-[200px]',
}: {
    value?: string;
    onChange: (url: string | undefined) => void;
    tenantId: string;
    label: string;
    height?: string;
}) {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const url = await uploadImage(file, tenantId);
        if (url) onChange(url);
        setUploading(false);
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-bold text-foreground/80 ml-1 block">{label}</label>
            {value ? (
                <div className={`relative ${height} rounded-xl overflow-hidden border border-border`}>
                    <img src={value} alt={label} className="w-full h-full object-cover" />
                    <button
                        onClick={() => onChange(undefined)}
                        className="absolute top-2 right-2 p-1.5 bg-destructive/90 text-white rounded-lg hover:bg-destructive transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ) : (
                <label className={`flex flex-col items-center justify-center ${height} border-2 border-dashed border-border rounded-xl bg-foreground/5 hover:bg-foreground/10 cursor-pointer transition-colors`}>
                    {uploading ? (
                        <Loader2 size={24} className="animate-spin text-muted-foreground" />
                    ) : (
                        <>
                            <Upload size={24} className="text-muted-foreground mb-2" />
                            <span className="text-xs text-muted-foreground">Clique para enviar</span>
                        </>
                    )}
                    <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
            )}
        </div>
    );
}

// Seletor de Imóvel para a Hero
function PropertyPicker({
    selectedPropertyId,
    onSelect,
    onSelectCover,
    currentCover,
    tenantId,
    tenantSlug,
}: {
    selectedPropertyId?: string;
    onSelect: (property: any | null) => void;
    onSelectCover: (url: string) => void;
    currentCover?: string;
    tenantId: string;
    tenantSlug: string;
}) {
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<any>(null);

    // Buscar imóveis do tenant
    useEffect(() => {
        if (!tenantId) return;
        setLoading(true);
        const supabase = createClient();
        supabase
            .from('properties')
            .select('id, title, slug, type, images, videos')
            .eq('tenant_id', tenantId)
            .eq('is_published', true)
            .eq('is_archived', false)
            .order('created_at', { ascending: false })
            .then(({ data }: { data: any[] | null }) => {
                setProperties(data || []);
                // Se já tem um property_id selecionado, encontrar o imóvel
                if (selectedPropertyId && data) {
                    const found = data.find((p: any) => p.id === selectedPropertyId);
                    if (found) setSelectedProperty(found);
                }
                setLoading(false);
            });
    }, [tenantId, selectedPropertyId]);

    const filteredProperties = properties.filter((p) =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectProperty = (property: any) => {
        setSelectedProperty(property);
        onSelect(property);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClearProperty = () => {
        setSelectedProperty(null);
        onSelect(null);
    };

    const allMedia = selectedProperty
        ? [
              ...(selectedProperty.images || []).map((url: string) => ({ type: 'image' as const, url })),
              ...(selectedProperty.videos || []).map((url: string) => ({ type: 'video' as const, url })),
          ]
        : [];

    return (
        <div className="space-y-3">
            <label className="text-sm font-bold text-foreground/80 ml-1 flex items-center gap-2">
                <Building size={14} className="text-secondary" />
                Vincular Imóvel
            </label>

            {/* Dropdown de seleção */}
            <div className="relative">
                {selectedProperty ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-foreground/5 border border-border rounded-lg">
                        {selectedProperty.images?.[0] && (
                            <img
                                src={selectedProperty.images[0]}
                                alt=""
                                className="w-8 h-8 rounded object-cover shrink-0"
                            />
                        )}
                        <span className="flex-1 text-sm font-medium text-foreground truncate">
                            {selectedProperty.title}
                        </span>
                        <button
                            onClick={handleClearProperty}
                            className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div>
                        <div
                            onClick={() => setIsOpen(!isOpen)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-foreground/5 border border-border rounded-lg cursor-pointer hover:bg-foreground/10 transition-colors"
                        >
                            <Search size={14} className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                {loading ? 'Carregando imóveis...' : 'Buscar imóvel...'}
                            </span>
                            <ChevronDown size={14} className="text-muted-foreground ml-auto" />
                        </div>
                    </div>
                )}

                {/* Dropdown list */}
                {isOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-border">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Filtrar por nome..."
                                className="w-full px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[240px] overflow-y-auto">
                            {filteredProperties.length === 0 ? (
                                <p className="p-4 text-xs text-muted-foreground text-center">
                                    {loading ? 'Carregando...' : 'Nenhum imóvel encontrado'}
                                </p>
                            ) : (
                                filteredProperties.map((property) => (
                                    <button
                                        key={property.id}
                                        onClick={() => handleSelectProperty(property)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-foreground/5 transition-colors text-left"
                                    >
                                        {property.images?.[0] ? (
                                            <img
                                                src={property.images[0]}
                                                alt=""
                                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                                                <Home size={16} className="text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {property.title}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {(property.images?.length || 0)} fotos • {(property.videos?.length || 0)} vídeos
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Galeria de mídias do imóvel selecionado */}
            {selectedProperty && allMedia.length > 0 && (
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80 ml-1 block">
                        Escolha a capa da Hero
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {allMedia.map((media, i) => {
                            const isSelected = currentCover === media.url;
                            return (
                                <button
                                    key={i}
                                    onClick={() => onSelectCover(media.url)}
                                    className={`relative group aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                                        isSelected
                                            ? 'border-secondary ring-2 ring-secondary/30 shadow-lg'
                                            : 'border-border hover:border-foreground/30'
                                    }`}
                                >
                                    {media.type === 'image' ? (
                                        <img
                                            src={media.url}
                                            alt={`Mídia ${i + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-foreground/10 flex items-center justify-center">
                                            <Video size={20} className="text-muted-foreground" />
                                        </div>
                                    )}
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-secondary/20 flex items-center justify-center">
                                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shadow-md">
                                                <Check size={14} className="text-secondary-foreground" />
                                            </div>
                                        </div>
                                    )}
                                    {/* Hover overlay */}
                                    {!isSelected && (
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                                            <span className="text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                Usar como capa
                                            </span>
                                        </div>
                                    )}
                                    {media.type === 'video' && (
                                        <div className="absolute top-1 right-1">
                                            <Video size={12} className="text-white drop-shadow" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {selectedProperty && allMedia.length === 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                    Este imóvel não possui imagens ou vídeos cadastrados.
                </div>
            )}
        </div>
    );
}

function SectionToggle({
    label,
    description,
    enabled,
    onToggle,
    children,
    defaultOpen = false,
}: {
    label: string;
    description: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-foreground/5 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(!enabled);
                        }}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                            enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-foreground/5 text-muted-foreground'
                        }`}
                    >
                        {enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <div>
                        <p className="text-sm font-bold text-foreground">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{description}</p>
                    </div>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </div>
            {isOpen && (
                <div className="border-t border-border p-4 space-y-4">
                    {children}
                </div>
            )}
        </div>
    );
}

export function SectionSettingsPanel({ sections, onSectionsChange, tenantId, tenantSlug }: SectionSettingsPanelProps) {
    const update = (key: string, data: any) => {
        onSectionsChange({
            ...sections,
            [key]: { ...(sections?.[key] || {}), ...data },
        });
    };

    const current = (key: string) => sections?.[key] || {};

    // Ordem das seções — drag & drop simples
    const sectionOrder = sections?.section_order || ['hero', 'about', 'featured', 'services', 'testimonials', 'cta'];

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...sectionOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newOrder.length) return;
        [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
        onSectionsChange({ ...sections, section_order: newOrder });
    };

    const sectionMeta: Record<string, { label: string; description: string }> = {
        hero: { label: 'Hero Banner', description: 'Banner principal com título, subtítulo e CTA' },
        about: { label: 'Sobre Nós', description: 'Texto sobre a empresa com imagem e estatísticas' },
        featured: { label: 'Imóveis em Destaque', description: 'Carousel com imóveis marcados como destaque' },
        services: { label: 'Serviços', description: 'Grid de cards com serviços oferecidos' },
        testimonials: { label: 'Depoimentos', description: 'Carousel de avaliações de clientes' },
        cta: { label: 'Call to Action', description: 'Faixa de destaque com botão de contato' },
    };

    return (
        <div className="space-y-6">
            {/* Ordenação */}
            <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">Ordem das Seções</h3>
                <p className="text-[10px] text-muted-foreground mb-4">Use as setas para reordenar as seções do site.</p>
                <div className="space-y-1">
                    {sectionOrder.map((key: string, index: number) => {
                        const meta = sectionMeta[key];
                        if (!meta) return null;
                        const isEnabled = current(key).enabled;
                        return (
                            <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-foreground/5">
                                <GripVertical size={14} className="text-muted-foreground shrink-0" />
                                <span className={`flex-1 text-sm font-medium ${isEnabled ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                                    {meta.label}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => moveSection(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <button
                                        onClick={() => moveSection(index, 'down')}
                                        disabled={index === sectionOrder.length - 1}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hero */}
            <SectionToggle
                label="Hero Banner"
                description="Banner principal com título, subtítulo e CTA"
                enabled={current('hero').enabled || false}
                onToggle={(v) => update('hero', { enabled: v })}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 block">Título</label>
                        <input
                            type="text"
                            value={current('hero').title || ''}
                            onChange={(e) => update('hero', { title: e.target.value })}
                            placeholder="Encontre o imóvel dos seus sonhos"
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 block">Subtítulo</label>
                        <input
                            type="text"
                            value={current('hero').subtitle || ''}
                            onChange={(e) => update('hero', { subtitle: e.target.value })}
                            placeholder="Os melhores imóveis da região"
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 block">Texto do Botão</label>
                        <input
                            type="text"
                            value={current('hero').cta_text || ''}
                            onChange={(e) => update('hero', { cta_text: e.target.value })}
                            placeholder="Ver Imóveis"
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 block">Estilo</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['fullscreen', 'split', 'minimal'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => update('hero', { style: s })}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all capitalize ${
                                        (current('hero').style || 'fullscreen') === s
                                            ? 'border-secondary bg-secondary/10'
                                            : 'border-border bg-foreground/5 hover:border-foreground/30'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80 ml-1 block">Opacidade do overlay</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={current('hero').overlay_opacity ?? 0.5}
                        onChange={(e) => update('hero', { overlay_opacity: parseFloat(e.target.value) })}
                        className="w-full accent-secondary"
                    />
                    <span className="text-[10px] text-muted-foreground">{Math.round((current('hero').overlay_opacity ?? 0.5) * 100)}%</span>
                </div>

                {/* Vincular Imóvel */}
                <PropertyPicker
                    selectedPropertyId={current('hero').property_id}
                    tenantId={tenantId}
                    tenantSlug={tenantSlug}
                    currentCover={current('hero').background_image}
                    onSelect={(property) => {
                        if (property) {
                            const propertyType = (property.type || 'venda').toLowerCase();
                            const propertySlug = property.slug || property.id;
                            update('hero', {
                                property_id: property.id,
                                property_title: property.title,
                                cta_link: `/site/${tenantSlug}/imovel/${propertyType}/${propertySlug}`,
                            });
                        } else {
                            update('hero', {
                                property_id: undefined,
                                property_title: undefined,
                            });
                        }
                    }}
                    onSelectCover={(url) => update('hero', { background_image: url })}
                />

                {/* Link do botão */}
                {current('hero').property_id && (
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 flex items-center gap-2">
                            <Link size={14} className="text-secondary" />
                            Link do Botão (auto-preenchido)
                        </label>
                        <input
                            type="text"
                            value={current('hero').cta_link || ''}
                            onChange={(e) => update('hero', { cta_link: e.target.value })}
                            placeholder="/site/slug/imovel/tipo/slug"
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground ml-1">
                            Preenchido automaticamente ao vincular um imóvel. Pode ser editado manualmente.
                        </p>
                    </div>
                )}

                {/* Separador visual */}
                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-card px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            ou envie uma imagem personalizada
                        </span>
                    </div>
                </div>

                <ImageUpload
                    value={!current('hero').property_id ? current('hero').background_image : undefined}
                    onChange={(url) => update('hero', {
                        background_image: url,
                        property_id: undefined,
                        property_title: undefined,
                    })}
                    tenantId={tenantId}
                    label="Imagem de Fundo (Upload Manual)"
                    height="h-[200px]"
                />
            </SectionToggle>

            {/* About */}
            <SectionToggle
                label="Sobre Nós"
                description="Texto sobre a empresa com imagem e estatísticas"
                enabled={current('about').enabled || false}
                onToggle={(v) => update('about', { enabled: v })}
            >
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80 ml-1 block">Título</label>
                    <input
                        type="text"
                        value={current('about').title || ''}
                        onChange={(e) => update('about', { title: e.target.value })}
                        placeholder="Sobre Nós"
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80 ml-1 block">Texto</label>
                    <textarea
                        value={current('about').text || ''}
                        onChange={(e) => update('about', { text: e.target.value })}
                        placeholder="Conte a história da sua empresa..."
                        rows={5}
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none resize-none"
                    />
                </div>
                <ImageUpload
                    value={current('about').image}
                    onChange={(url) => update('about', { image: url })}
                    tenantId={tenantId}
                    label="Imagem"
                />

                {/* Stats */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-foreground/80 ml-1 block">Estatísticas (até 4)</label>
                    {(current('about').stats || []).map((stat: any, i: number) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={stat.value}
                                onChange={(e) => {
                                    const stats = [...(current('about').stats || [])];
                                    stats[i] = { ...stats[i], value: e.target.value };
                                    update('about', { stats });
                                }}
                                placeholder="500+"
                                className="w-24 px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                            />
                            <input
                                type="text"
                                value={stat.label}
                                onChange={(e) => {
                                    const stats = [...(current('about').stats || [])];
                                    stats[i] = { ...stats[i], label: e.target.value };
                                    update('about', { stats });
                                }}
                                placeholder="Imóveis vendidos"
                                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                            />
                            <button
                                onClick={() => {
                                    const stats = [...(current('about').stats || [])];
                                    stats.splice(i, 1);
                                    update('about', { stats });
                                }}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {(current('about').stats || []).length < 4 && (
                        <button
                            onClick={() => {
                                const stats = [...(current('about').stats || []), { value: '', label: '' }];
                                update('about', { stats });
                            }}
                            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Plus size={14} /> Adicionar estatística
                        </button>
                    )}
                </div>
            </SectionToggle>

            {/* Featured */}
            <SectionToggle
                label="Imóveis em Destaque"
                description="Carousel com imóveis marcados como destaque"
                enabled={current('featured').enabled || false}
                onToggle={(v) => update('featured', { enabled: v })}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 block">Título</label>
                        <input
                            type="text"
                            value={current('featured').title || ''}
                            onChange={(e) => update('featured', { title: e.target.value })}
                            placeholder="Imóveis em Destaque"
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 block">Subtítulo</label>
                        <input
                            type="text"
                            value={current('featured').subtitle || ''}
                            onChange={(e) => update('featured', { subtitle: e.target.value })}
                            placeholder="Selecionados especialmente para você"
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                        />
                    </div>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                    <Star size={14} className="inline mr-1" />
                    Para marcar imóveis como destaque, ative o toggle <strong>&quot;DESTAQUE&quot;</strong> na edição de cada imóvel.
                </div>
            </SectionToggle>

            {/* Services */}
            <SectionToggle
                label="Serviços"
                description="Grid de cards com serviços oferecidos"
                enabled={current('services').enabled || false}
                onToggle={(v) => update('services', { enabled: v })}
            >
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80 ml-1 block">Título</label>
                    <input
                        type="text"
                        value={current('services').title || ''}
                        onChange={(e) => update('services', { title: e.target.value })}
                        placeholder="Nossos Serviços"
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-bold text-foreground/80 ml-1 block">Itens</label>
                    {(current('services').items || []).map((item: any, i: number) => (
                        <div key={i} className="p-3 border border-border rounded-xl bg-foreground/5 space-y-2">
                            <div className="flex gap-2 items-center">
                                <select
                                    value={item.icon}
                                    onChange={(e) => {
                                        const items = [...(current('services').items || [])];
                                        items[i] = { ...items[i], icon: e.target.value };
                                        update('services', { items });
                                    }}
                                    className="appearance-none w-24 px-2 py-2 bg-input border border-border rounded-lg text-xs"
                                >
                                    {Object.keys(ICON_MAP).map((k) => (
                                        <option key={k} value={k}>{k}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => {
                                        const items = [...(current('services').items || [])];
                                        items[i] = { ...items[i], title: e.target.value };
                                        update('services', { items });
                                    }}
                                    placeholder="Título do serviço"
                                    className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                                />
                                <button
                                    onClick={() => {
                                        const items = [...(current('services').items || [])];
                                        items.splice(i, 1);
                                        update('services', { items });
                                    }}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                    const items = [...(current('services').items || [])];
                                    items[i] = { ...items[i], description: e.target.value };
                                    update('services', { items });
                                }}
                                placeholder="Descrição do serviço"
                                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                            />
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const items = [...(current('services').items || []), { icon: 'home', title: '', description: '' }];
                            update('services', { items });
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Plus size={14} /> Adicionar serviço
                    </button>
                </div>
            </SectionToggle>

            {/* Testimonials */}
            <SectionToggle
                label="Depoimentos"
                description="Carousel de avaliações de clientes"
                enabled={current('testimonials').enabled || false}
                onToggle={(v) => update('testimonials', { enabled: v })}
            >
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80 ml-1 block">Título</label>
                    <input
                        type="text"
                        value={current('testimonials').title || ''}
                        onChange={(e) => update('testimonials', { title: e.target.value })}
                        placeholder="O que nossos clientes dizem"
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-bold text-foreground/80 ml-1 block">Depoimentos</label>
                    {(current('testimonials').items || []).map((item: any, i: number) => (
                        <div key={i} className="p-3 border border-border rounded-xl bg-foreground/5 space-y-2">
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => {
                                        const items = [...(current('testimonials').items || [])];
                                        items[i] = { ...items[i], name: e.target.value };
                                        update('testimonials', { items });
                                    }}
                                    placeholder="Nome do cliente"
                                    className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                                />
                                <select
                                    value={item.rating || 5}
                                    onChange={(e) => {
                                        const items = [...(current('testimonials').items || [])];
                                        items[i] = { ...items[i], rating: parseInt(e.target.value) };
                                        update('testimonials', { items });
                                    }}
                                    className="appearance-none w-20 px-2 py-2 bg-input border border-border rounded-lg text-xs"
                                >
                                    {[5, 4, 3, 2, 1].map((v) => (
                                        <option key={v} value={v}>{v} ★</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => {
                                        const items = [...(current('testimonials').items || [])];
                                        items.splice(i, 1);
                                        update('testimonials', { items });
                                    }}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <textarea
                                value={item.text}
                                onChange={(e) => {
                                    const items = [...(current('testimonials').items || [])];
                                    items[i] = { ...items[i], text: e.target.value };
                                    update('testimonials', { items });
                                }}
                                placeholder="Texto do depoimento..."
                                rows={2}
                                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none resize-none"
                            />
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const items = [...(current('testimonials').items || []), { name: '', text: '', rating: 5 }];
                            update('testimonials', { items });
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Plus size={14} /> Adicionar depoimento
                    </button>
                </div>
            </SectionToggle>

            {/* CTA */}
            <SectionToggle
                label="Call to Action"
                description="Faixa de destaque com botão de contato"
                enabled={current('cta').enabled || false}
                onToggle={(v) => update('cta', { enabled: v })}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 block">Título</label>
                        <input
                            type="text"
                            value={current('cta').title || ''}
                            onChange={(e) => update('cta', { title: e.target.value })}
                            placeholder="Quer saber mais?"
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 block">Subtítulo</label>
                        <input
                            type="text"
                            value={current('cta').subtitle || ''}
                            onChange={(e) => update('cta', { subtitle: e.target.value })}
                            placeholder="Entre em contato conosco"
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 block">Texto do Botão</label>
                        <input
                            type="text"
                            value={current('cta').button_text || ''}
                            onChange={(e) => update('cta', { button_text: e.target.value })}
                            placeholder="Falar no WhatsApp"
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground/80 ml-1 block">Link do Botão</label>
                        <select
                            value={current('cta').button_link || 'whatsapp'}
                            onChange={(e) => update('cta', { button_link: e.target.value })}
                            className="appearance-none w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                        >
                            <option value="whatsapp">WhatsApp</option>
                            <option value="#imoveis">Ir para imóveis</option>
                            <option value="#contato">Ir para contato</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80 ml-1 block">Cor de Fundo</label>
                    <div className="grid grid-cols-3 gap-2">
                        {([
                            { value: 'primary', label: 'Primária' },
                            { value: 'secondary', label: 'Secundária' },
                            { value: 'gradient', label: 'Gradiente' },
                        ] as const).map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => update('cta', { background_color: opt.value })}
                                className={`px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
                                    (current('cta').background_color || 'primary') === opt.value
                                        ? 'border-secondary bg-secondary/10'
                                        : 'border-border bg-foreground/5 hover:border-foreground/30'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </SectionToggle>
        </div>
    );
}
