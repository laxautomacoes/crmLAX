'use client';

import { useState } from 'react';
import { ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateTenantBranding } from '@/app/_actions/tenant';
import { toast } from 'sonner';

interface FilterSettingsPanelProps {
    branding: any;
    setBranding: React.Dispatch<React.SetStateAction<any>>;
    tenantId: string;
    embedded?: boolean;
}

export function FilterSettingsPanel({ branding, setBranding, tenantId, embedded }: FilterSettingsPanelProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenantId) return;

        setIsUploading(true);
        const supabase = createClient();
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `filter-bg-${Date.now()}.${fileExt}`;
            const filePath = `${tenantId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('branding')
                .upload(filePath, file, { upsert: true, cacheControl: '3600' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('branding')
                .getPublicUrl(filePath);

            const newBranding = { ...branding, filter_bg_image: publicUrl };
            setBranding(newBranding);
            await updateTenantBranding(tenantId, newBranding);
            
            window.dispatchEvent(new CustomEvent('branding-updated', { detail: newBranding }));
            toast.success('Imagem de fundo do filtro carregada com sucesso!');
        } catch (error: any) {
            console.error('Error uploading filter background:', error);
            toast.error(`Erro ao carregar imagem: ${error.message}`);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveImage = async () => {
        if (!confirm('Deseja remover a imagem de fundo do filtro?')) return;
        const newBranding = { ...branding, filter_bg_image: undefined };
        setBranding(newBranding);
        await updateTenantBranding(tenantId, newBranding);
        window.dispatchEvent(new CustomEvent('branding-updated', { detail: newBranding }));
        toast.success('Imagem de fundo removida.');
    };

    const handleTextChange = (val: string) => {
        setBranding((prev: any) => ({ ...prev, filter_title: val }));
    };

    if (embedded) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground block uppercase tracking-wider">Título de Chamada</label>
                    <p className="text-xs text-muted-foreground">Texto em destaque acima do filtro. Ex: "Encontre seu imóvel em Florianópolis"</p>
                    <input
                        type="text"
                        value={branding.filter_title || ''}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder="Ex: Encontre seu imóvel em Florianópolis"
                        className="w-full px-4 py-2 bg-input border border-border rounded-md text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground block uppercase tracking-wider">Imagem de Fundo</label>
                    <p className="text-xs text-muted-foreground">Imagem aérea ou urbana exibida atrás do filtro (overlay escuro automático)</p>
                    <div className="relative group min-h-[140px] rounded-md border border-border/40 flex items-center justify-center overflow-hidden bg-background hover:bg-gray-50 dark:hover:bg-muted/30 transition-colors">
                        {branding.filter_bg_image ? (
                            <>
                                <img src={branding.filter_bg_image} alt="Background" className="w-full h-full object-cover max-h-[140px]" />
                                <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                                    <Trash2 size={14} />
                                </button>
                            </>
                        ) : (
                            <div className="text-center p-4">
                                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                <span className="text-xs text-muted-foreground">Carregar imagem de fundo</span>
                            </div>
                        )}
                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:bg-black/20 hover:opacity-100 transition-all">
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
                            {isUploading && <Loader2 className="animate-spin text-white" />}
                        </label>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-md p-6 space-y-6">
            <div>
                <h3 className="text-lg font-bold text-foreground">Seção de Busca / Filtros (Homepage)</h3>
                <p className="text-sm text-muted-foreground">Personalize o banner de busca exibido no topo da página inicial do site vitrine.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground block uppercase tracking-wider">Título de Chamada</label>
                    <p className="text-xs text-muted-foreground">Texto em destaque acima do filtro. Ex: "Encontre seu imóvel em Florianópolis"</p>
                    <input
                        type="text"
                        value={branding.filter_title || ''}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder="Ex: Encontre seu imóvel em Florianópolis"
                        className="w-full px-4 py-2 bg-input border border-border rounded-md text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground block uppercase tracking-wider">Imagem de Fundo</label>
                    <p className="text-xs text-muted-foreground">Imagem aérea ou urbana exibida atrás do filtro (overlay escuro automático)</p>
                    <div className="relative group min-h-[140px] rounded-md border border-border/40 flex items-center justify-center overflow-hidden bg-background hover:bg-gray-50 dark:hover:bg-muted/30 transition-colors">
                        {branding.filter_bg_image ? (
                            <>
                                <img src={branding.filter_bg_image} alt="Background" className="w-full h-full object-cover max-h-[140px]" />
                                <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                                    <Trash2 size={14} />
                                </button>
                            </>
                        ) : (
                            <div className="text-center p-4">
                                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                <span className="text-xs text-muted-foreground">Carregar imagem de fundo</span>
                            </div>
                        )}
                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:bg-black/20 hover:opacity-100 transition-all">
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
                            {isUploading && <Loader2 className="animate-spin text-white" />}
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
