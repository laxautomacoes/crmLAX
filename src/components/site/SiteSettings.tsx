'use client'

import { useState, useEffect } from 'react'
import {
    Image as ImageIcon,
    Upload,
    Loader2,
    Trash2,
    Globe,
    CheckCircle2,
    AlertCircle,
    Copy,
    Info,
    ExternalLink,
    MapPin,
    Share2,
    Palette,
    Sun,
    Moon,
    Monitor,
    Type,
    Circle,
    Square,
    RectangleHorizontal,
    LayoutGrid
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/app/_actions/profile'
import { updateTenantBranding } from '@/app/_actions/tenant'
import { toast } from 'sonner'
import { Logo } from '@/components/shared/Logo'
import { AVAILABLE_FONTS, type SiteTheme } from '@/components/site/SiteThemeProvider'
import { SectionSettingsPanel } from '@/components/site/settings/SectionSettingsPanel'
import { PageHeader } from '@/components/shared/PageHeader'

interface BrandingData {
    logo_full?: string
    logo_header?: string
    logo_icon?: string
    logo_height?: number
    logo_header_height?: number
    site_logo?: string
    site_favicon?: string
    site_logo_height?: number
    filter_bg_image?: string
    filter_title?: string
    address?: {
        street?: string
        number?: string
        complement?: string
        neighborhood?: string
        city?: string
        state?: string
        zip_code?: string
    }
    social_links?: {
        instagram?: string
        facebook?: string
        linkedin?: string
        youtube?: string
        whatsapp?: string
    }
    privacy_policy?: string
    terms_of_service?: string
    site_description?: string
    site_theme?: SiteTheme
    site_sections?: any
    seo?: {
        meta_title?: string
        meta_description?: string
        meta_keywords?: string
        og_image?: string
    }
}

export function SiteSettings({ siteUrl }: { siteUrl?: string }) {
    const [activeTab, setActiveTab] = useState<'branding' | 'appearance' | 'sections' | 'footer'>('branding')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isUploading, setIsUploading] = useState<'site_logo' | 'site_favicon' | null>(null)
    const [profile, setProfile] = useState<any>(null)
    const [tenant, setTenant] = useState<any>(null)
    const [branding, setBranding] = useState<BrandingData>({})
    const [savedBranding, setSavedBranding] = useState<BrandingData | null>(null)

    useEffect(() => {
        async function loadData() {
            const { profile: userProfile } = await getProfile()
            setProfile(userProfile)

            if (userProfile?.tenant_id) {
                const supabase = createClient()
                const userRole = userProfile?.role?.toLowerCase() || '';
                const isSuperAdmin = ['superadmin', 'super_admin', 'super administrador'].includes(userRole);

                let query = supabase.from('tenants').select('*');

                if (isSuperAdmin) {
                    // Superadmin edita o branding da plataforma
                    query = query.eq('is_system', true);
                } else {
                    // Usuário comum edita seu próprio tenant
                    query = query.eq('id', userProfile.tenant_id);
                }

                const { data: tenantData } = await query.maybeSingle();

                if (tenantData) {
                    setTenant(tenantData)
                    if (tenantData.branding) {
                        setBranding(tenantData.branding)
                        setSavedBranding(JSON.parse(JSON.stringify(tenantData.branding)))
                    }
                }
            }
            setLoading(false)
        }
        loadData()
    }, [])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'site_logo' | 'site_favicon') => {
        const file = e.target.files?.[0]
        if (!file || !profile?.tenant_id) return

        if (type === 'site_logo') {
            const isValidRatio = await new Promise<boolean>((resolve) => {
                const img = new Image()
                img.onload = () => {
                    const ratio = img.width / img.height
                    resolve(Math.abs(ratio - 5) < 1.0) // Relaxed ratio check or just ensure it's landscape
                }
                img.onerror = () => resolve(false)
                img.src = URL.createObjectURL(file)
            })

            if (!isValidRatio) {
                toast.error('Proporção sugerida não detectada! Tente usar uma imagem retangular (ex: 5:1).')
                // e.target.value = ''
                // return // Allow continuing but show warning? Better allowed but warned.
            }
        }

        setIsUploading(type)
        const supabase = createClient()

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${type}-${Date.now()}.${fileExt}`
            const filePath = `${profile.tenant_id}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('branding')
                .upload(filePath, file, {
                    upsert: true,
                    cacheControl: '3600'
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('branding')
                .getPublicUrl(filePath)

            const newBranding = { ...branding, [type]: publicUrl };
            setBranding(newBranding)

            // Salvar automaticamente após upload do logo
            await updateTenantBranding(profile.tenant_id, newBranding)

            window.dispatchEvent(new CustomEvent('branding-updated', { detail: newBranding }))
            toast.success(`${type === 'site_logo' ? 'Logo do Site' : 'Favicon'} carregado com sucesso!`)
        } catch (error: any) {
            console.error(`Error uploading ${type}:`, error)
            toast.error(`Erro ao carregar imagem: ${error.message}`)
        } finally {
            setIsUploading(null)
            e.target.value = ''
        }
    }

    const handleSaveMain = async () => {
        const targetTenantId = tenant?.id || profile?.tenant_id;
        if (!targetTenantId) return;
        setSaving(true)

        const result = await updateTenantBranding(targetTenantId, branding)

        if (result.success) {
            toast.success('Configurações salvas com sucesso!')
            setSavedBranding(JSON.parse(JSON.stringify(branding)))
            window.dispatchEvent(new CustomEvent('branding-updated', { detail: branding }))
        } else {
            toast.error('Erro ao salvar: ' + result.error)
        }
        setSaving(false)
    }

    const handleRemoveLogo = (type: 'site_logo' | 'site_favicon') => {
        const labels = {
            site_logo: 'logotipo principal do site',
            site_favicon: 'ícone/favicon'
        };
        if (confirm(`Deseja remover o ${labels[type]}?`)) {
            const newBranding = { ...branding, [type]: undefined };
            setBranding(newBranding);
            updateTenantBranding(profile.tenant_id, newBranding);
            window.dispatchEvent(new CustomEvent('branding-updated', { detail: newBranding }));
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copiado!`)
    }

    const updateAddress = (field: string, value: string) => {
        setBranding(prev => ({
            ...prev,
            address: {
                ...(prev.address || {}),
                [field]: value
            }
        }))
    }

    const updateSocial = (field: string, value: string) => {
        setBranding(prev => ({
            ...prev,
            social_links: {
                ...(prev.social_links || {}),
                [field]: value
            }
        }))
    }

    const isSectionsTabEdited = () => {
        if (!savedBranding) return false;
        const currentSections = branding.site_sections || {};
        const savedSections = savedBranding.site_sections || {};
        const currentTitle = branding.filter_title || '';
        const savedTitle = savedBranding.filter_title || '';
        const currentBg = branding.filter_bg_image || '';
        const savedBg = savedBranding.filter_bg_image || '';

        return (
            currentTitle !== savedTitle ||
            currentBg !== savedBg ||
            JSON.stringify(currentSections) !== JSON.stringify(savedSections)
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader title="Configurações do Site">
                <div className="flex items-center gap-3">
                    {activeTab === 'sections' && (
                        <button
                            onClick={handleSaveMain}
                            disabled={saving || !isSectionsTabEdited()}
                            className={`flex items-center justify-center px-12 py-3 md:py-2 min-w-[140px] text-secondary-foreground rounded-lg transition-all text-sm font-bold shadow-sm active:scale-[0.99] whitespace-nowrap ${
                                isSectionsTabEdited()
                                    ? 'bg-secondary hover:opacity-90 cursor-pointer'
                                    : 'bg-secondary opacity-30 cursor-not-allowed pointer-events-none'
                            }`}
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    )}
                    {siteUrl && siteUrl !== '#' && (
                        <a 
                            href={siteUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center px-12 py-3 md:py-2 min-w-[140px] bg-secondary hover:opacity-90 text-secondary-foreground rounded-lg transition-all text-sm font-bold shadow-sm active:scale-[0.99] whitespace-nowrap"
                        >
                            Ver site
                        </a>
                    )}
                </div>
            </PageHeader>

            <hr className="hidden md:block border-border" />

            <div className="space-y-6">
                <style dangerouslySetInnerHTML={{ __html: `
                .slider-ajuste {
                    -webkit-appearance: none !important;
                    appearance: none !important;
                    background: transparent !important;
                    width: 100% !important;
                }
                /* Webkit - Track */
                .slider-ajuste::-webkit-slider-runnable-track {
                    background: #cbd5e1 !important;
                    height: 4px !important;
                    border-radius: 9999px !important;
                }
                .dark .slider-ajuste::-webkit-slider-runnable-track {
                    background: #2d3939 !important;
                }
                /* Webkit - Thumb */
                .slider-ajuste::-webkit-slider-thumb {
                    -webkit-appearance: none !important;
                    appearance: none !important;
                    height: 14px !important;
                    width: 14px !important;
                    border-radius: 50% !important;
                    background: #404F4F !important;
                    cursor: pointer !important;
                    margin-top: -5px !important;
                    border: 2px solid #ffffff !important;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important;
                    transition: transform 0.1s ease !important;
                }
                .slider-ajuste::-webkit-slider-thumb:hover {
                    transform: scale(1.2) !important;
                }
                .dark .slider-ajuste::-webkit-slider-thumb {
                    background: #FFE600 !important;
                    border-color: #121414 !important;
                }
                /* Firefox - Track */
                .slider-ajuste::-moz-range-track {
                    background: #cbd5e1 !important;
                    height: 4px !important;
                    border-radius: 9999px !important;
                }
                .dark .slider-ajuste::-moz-range-track {
                    background: #2d3939 !important;
                }
                /* Firefox - Thumb */
                .slider-ajuste::-moz-range-thumb {
                    height: 14px !important;
                    width: 14px !important;
                    border-radius: 50% !important;
                    background: #404F4F !important;
                    cursor: pointer !important;
                    border: 2px solid #ffffff !important;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important;
                    transition: transform 0.1s ease !important;
                }
                .slider-ajuste::-moz-range-thumb:hover {
                    transform: scale(1.2) !important;
                }
                .dark .slider-ajuste::-moz-range-thumb {
                    background: #FFE600 !important;
                    border-color: #121414 !important;
                }
            `}} />
            {/* Tab Navigation */}
            <div className="flex items-center border-b border-border overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('branding')}
                    className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'branding' ? 'text-foreground border-b-[3px] active-tab-indicator' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Palette size={16} />
                    Identidade
                </button>
                <button
                    onClick={() => setActiveTab('appearance')}
                    className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'appearance' ? 'text-foreground border-b-[3px] active-tab-indicator' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Sun size={16} />
                    Aparência
                </button>
                <button
                    onClick={() => setActiveTab('sections')}
                    className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'sections' ? 'text-foreground border-b-[3px] active-tab-indicator' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <LayoutGrid size={16} />
                    Seções
                </button>
                <button
                    onClick={() => setActiveTab('footer')}
                    className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'footer' ? 'text-foreground border-b-[3px] active-tab-indicator' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <MapPin size={16} />
                    Rodapé
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* BRANDING TAB */}
                {activeTab === 'branding' && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground">Identidade Visual</h3>
                                <p className="text-sm text-muted-foreground">Logotipos e ícone | favicon exibidos no site e no sistema.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Logo Full (Site) */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-foreground">Logotipo Site</label>
                                        <p className="text-xs text-muted-foreground">Exibido no site | Recomendado: 5:1</p>
                                    </div>
                                    <div className="relative group min-h-[140px] rounded-lg border border-border/40 flex items-center justify-center overflow-hidden bg-background hover:bg-gray-50 dark:hover:bg-muted/30 transition-colors" style={{ backgroundColor: 'var(--background)' }}>
                                        {branding.site_logo ? (
                                            <>
                                                <div className="p-4">
                                                    <Logo size="lg" src={branding.site_logo} height={branding.site_logo_height || 50} />
                                                </div>
                                                <button onClick={() => handleRemoveLogo('site_logo')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="text-center p-4">
                                                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                                <span className="text-xs text-muted-foreground">Upload Site Logo</span>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:bg-black/20 hover:opacity-100 transition-all">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'site_logo')} disabled={!!isUploading} />
                                            {isUploading === 'site_logo' && <Loader2 className="animate-spin text-white" />}
                                        </label>
                                    </div>
                                    {branding.site_logo && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-foreground/60 dark:text-muted-foreground uppercase">Ajustar Tamanho (Site)</label>
                                                <span className="text-[10px] font-bold text-foreground/60">{branding.site_logo_height || 50}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="20"
                                                max="60"
                                                value={branding.site_logo_height || 50}
                                                onChange={(e) => setBranding(prev => ({ ...prev, site_logo_height: parseInt(e.target.value) }))}
                                                onMouseUp={handleSaveMain}
                                                className="slider-ajuste cursor-pointer transition-colors"
                                            />
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-[9px] font-bold text-muted-foreground">20px</span>
                                                <span className="text-[9px] font-bold text-muted-foreground">60px</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Logo Icon */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-foreground">Ícone | Favicon</label>
                                        <p className="text-xs text-muted-foreground">Exibido na aba do navegador e no site | Recomendado: 1:1</p>
                                    </div>
                                    <div className="relative group aspect-square max-w-[140px] rounded-lg border border-border/40 flex items-center justify-center overflow-hidden bg-background hover:bg-gray-50 dark:hover:bg-muted/30 transition-colors" style={{ backgroundColor: 'var(--background)' }}>
                                        {branding.site_favicon ? (
                                            <>
                                                <img src={branding.site_favicon} className="w-full h-full object-contain p-4" alt="Icon" />
                                                <button onClick={() => handleRemoveLogo('site_favicon')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="text-center p-4">
                                                <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                                                <span className="text-[10px] text-muted-foreground">Upload 1:1</span>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:bg-black/20 hover:opacity-100 transition-all">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'site_favicon')} disabled={!!isUploading} />
                                            {isUploading === 'site_favicon' && <Loader2 className="animate-spin text-white" />}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* APPEARANCE TAB */}
                {activeTab === 'appearance' && (
                    <div className="space-y-6">
                        {/* Cores do Tema */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground">Cores do Site</h3>
                                <p className="text-sm text-muted-foreground">Defina as cores que serão usadas em todo o seu site vitrine.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Cor Primária */}
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Cor Primária</label>
                                    <p className="text-xs text-muted-foreground ml-1">Header, textos e elementos principais</p>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={branding.site_theme?.primary_color || '#404F4F'}
                                                onChange={(e) => setBranding(prev => ({
                                                    ...prev,
                                                    site_theme: { ...(prev.site_theme || {}), primary_color: e.target.value }
                                                }))}
                                                className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer appearance-none bg-transparent p-0.5"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={branding.site_theme?.primary_color || '#404F4F'}
                                            onChange={(e) => setBranding(prev => ({
                                                ...prev,
                                                site_theme: { ...(prev.site_theme || {}), primary_color: e.target.value }
                                            }))}
                                            placeholder="#404F4F"
                                            className="flex-1 px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all font-mono uppercase"
                                        />
                                    </div>
                                </div>

                                {/* Cor Secundária */}
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Cor Secundária</label>
                                    <p className="text-xs text-muted-foreground ml-1">Botões de ação e destaques</p>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={branding.site_theme?.secondary_color || '#FFE600'}
                                                onChange={(e) => setBranding(prev => ({
                                                    ...prev,
                                                    site_theme: { ...(prev.site_theme || {}), secondary_color: e.target.value }
                                                }))}
                                                className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer appearance-none bg-transparent p-0.5"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={branding.site_theme?.secondary_color || '#FFE600'}
                                            onChange={(e) => setBranding(prev => ({
                                                ...prev,
                                                site_theme: { ...(prev.site_theme || {}), secondary_color: e.target.value }
                                            }))}
                                            placeholder="#FFE600"
                                            className="flex-1 px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all font-mono uppercase"
                                        />
                                    </div>
                                </div>

                                {/* Cor Accent */}
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Cor de Destaque</label>
                                    <p className="text-xs text-muted-foreground ml-1">Badges, labels e destaques</p>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={branding.site_theme?.accent_color || '#8B2332'}
                                                onChange={(e) => setBranding(prev => ({
                                                    ...prev,
                                                    site_theme: { ...(prev.site_theme || {}), accent_color: e.target.value }
                                                }))}
                                                className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer appearance-none bg-transparent p-0.5"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={branding.site_theme?.accent_color || '#8B2332'}
                                            onChange={(e) => setBranding(prev => ({
                                                ...prev,
                                                site_theme: { ...(prev.site_theme || {}), accent_color: e.target.value }
                                            }))}
                                            placeholder="#8B2332"
                                            className="flex-1 px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all font-mono uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Preview de cores */}
                            <div className="mt-6 p-4 rounded-xl border border-border bg-foreground/5">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Preview</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex flex-col items-center gap-1">
                                        <div
                                            className="w-16 h-10 rounded-lg shadow-sm border border-border"
                                            style={{ backgroundColor: branding.site_theme?.primary_color || '#404F4F' }}
                                        />
                                        <span className="text-[9px] text-muted-foreground">Primária</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <div
                                            className="w-16 h-10 rounded-lg shadow-sm border border-border"
                                            style={{ backgroundColor: branding.site_theme?.secondary_color || '#FFE600' }}
                                        />
                                        <span className="text-[9px] text-muted-foreground">Secundária</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <div
                                            className="w-16 h-10 rounded-lg shadow-sm border border-border"
                                            style={{ backgroundColor: branding.site_theme?.accent_color || '#8B2332' }}
                                        />
                                        <span className="text-[9px] text-muted-foreground">Destaque</span>
                                    </div>
                                    <div className="flex-1 min-w-[200px] ml-4">
                                        <div className="p-3 rounded-lg border border-border" style={{ backgroundColor: branding.site_theme?.primary_color || '#404F4F' }}>
                                            <p className="text-xs font-bold" style={{ color: branding.site_theme?.secondary_color || '#FFE600' }}>Texto de destaque</p>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Texto secundário no site</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fonte */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Type size={20} />
                                    Tipografia
                                </h3>
                                <p className="text-sm text-muted-foreground">Escolha a fonte principal do site.</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {AVAILABLE_FONTS.map(font => (
                                    <button
                                        key={font}
                                        onClick={() => setBranding(prev => ({
                                            ...prev,
                                            site_theme: { ...(prev.site_theme || {}), font_family: font }
                                        }))}
                                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                                            (branding.site_theme?.font_family || 'Inter') === font
                                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                                : 'border-border hover:border-foreground/30 bg-foreground/5'
                                        }`}
                                    >
                                        <span
                                            className="text-lg font-bold text-foreground block mb-1"
                                            style={{ fontFamily: `'${font}', sans-serif` }}
                                        >
                                            Aa
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-medium">{font}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Modo Claro/Escuro */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground">Modo de Exibição</h3>
                                <p className="text-sm text-muted-foreground">Defina o tema visual padrão do site.</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'auto', icon: Monitor, label: 'Automático', desc: 'Segue o sistema' },
                                    { value: 'light', icon: Sun, label: 'Claro', desc: 'Sempre claro' },
                                    { value: 'dark', icon: Moon, label: 'Escuro', desc: 'Sempre escuro' },
                                ].map(mode => (
                                    <button
                                        key={mode.value}
                                        onClick={() => setBranding(prev => ({
                                            ...prev,
                                            site_theme: { ...(prev.site_theme || {}), dark_mode: mode.value as SiteTheme['dark_mode'] }
                                        }))}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                            (branding.site_theme?.dark_mode || 'auto') === mode.value
                                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                                : 'border-border hover:border-foreground/30 bg-foreground/5'
                                        }`}
                                    >
                                        <mode.icon size={24} className={`${
                                            (branding.site_theme?.dark_mode || 'auto') === mode.value
                                                ? 'text-secondary'
                                                : 'text-muted-foreground'
                                        }`} />
                                        <span className="text-sm font-bold text-foreground">{mode.label}</span>
                                        <span className="text-[10px] text-muted-foreground">{mode.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Estilo de Bordas */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground">Estilo de Bordas</h3>
                                <p className="text-sm text-muted-foreground">Defina o arredondamento dos cards e botões.</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'rounded', icon: RectangleHorizontal, label: 'Arredondado', preview: 'rounded-xl' },
                                    { value: 'sharp', icon: Square, label: 'Reto', preview: 'rounded-none' },
                                    { value: 'pill', icon: Circle, label: 'Pílula', preview: 'rounded-full' },
                                ].map(style => (
                                    <button
                                        key={style.value}
                                        onClick={() => setBranding(prev => ({
                                            ...prev,
                                            site_theme: { ...(prev.site_theme || {}), border_radius: style.value as SiteTheme['border_radius'] }
                                        }))}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                                            (branding.site_theme?.border_radius || 'rounded') === style.value
                                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                                : 'border-border hover:border-foreground/30 bg-foreground/5'
                                        }`}
                                    >
                                        <div
                                            className={`w-16 h-10 border-2 border-muted-foreground/40 ${style.preview}`}
                                            style={{ backgroundColor: branding.site_theme?.primary_color || '#404F4F' }}
                                        />
                                        <span className="text-sm font-bold text-foreground">{style.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 flex justify-end">
                            <button
                                onClick={handleSaveMain}
                                disabled={saving}
                                className="px-12 py-2 min-w-[140px] bg-secondary text-secondary-foreground rounded-md font-bold hover:opacity-90 transition-opacity"
                            >
                                {saving ? 'Salvando...' : 'Salvar Aparência'}
                            </button>
                        </div>
                    </div>
                )}

                {/* SECTIONS TAB */}
                {activeTab === 'sections' && (
                    <div className="space-y-6">
                        <SectionSettingsPanel
                            sections={(branding as any)?.site_sections || {}}
                            onSectionsChange={(newSections: any) => setBranding(prev => ({
                                ...prev,
                                site_sections: newSections
                            } as any))}
                            tenantId={tenant?.id || ''}
                            tenantSlug={tenant?.slug || ''}
                            branding={branding}
                            setBranding={setBranding}
                            savedBranding={savedBranding}
                            onSave={handleSaveMain}
                            saving={saving}
                        />

                    </div>
                )}

                {/* FOOTER TAB (Address + Social) */}
                {activeTab === 'footer' && (
                    <div className="space-y-6">
                        {/* Address Section */}
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground">Localização</h3>
                                <p className="text-sm text-muted-foreground">Informações exibidas no rodapé do seu site.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Rua | Avenida</label>
                                    <input
                                        type="text"
                                        value={branding.address?.street || ''}
                                        onChange={(e) => updateAddress('street', e.target.value)}
                                        placeholder="Ex: Av. Atlântica"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Número</label>
                                    <input
                                        type="text"
                                        value={branding.address?.number || ''}
                                        onChange={(e) => updateAddress('number', e.target.value)}
                                        placeholder="Ex: 500"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Complemento</label>
                                    <input
                                        type="text"
                                        value={branding.address?.complement || ''}
                                        onChange={(e) => updateAddress('complement', e.target.value)}
                                        placeholder="Ex: Sala 201"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Bairro</label>
                                    <input
                                        type="text"
                                        value={branding.address?.neighborhood || ''}
                                        onChange={(e) => updateAddress('neighborhood', e.target.value)}
                                        placeholder="Ex: Centro"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Cidade</label>
                                    <input
                                        type="text"
                                        value={branding.address?.city || ''}
                                        onChange={(e) => updateAddress('city', e.target.value)}
                                        placeholder="Ex: Balneário Camboriú"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Estado (UF)</label>
                                    <input
                                        type="text"
                                        value={branding.address?.state || ''}
                                        onChange={(e) => updateAddress('state', e.target.value)}
                                        placeholder="Ex: SC"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">CEP</label>
                                    <input
                                        type="text"
                                        value={branding.address?.zip_code || ''}
                                        onChange={(e) => updateAddress('zip_code', e.target.value)}
                                        placeholder="00000-000"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Social Links Section */}
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground">Redes Sociais</h3>
                                <p className="text-sm text-muted-foreground">Links para as redes sociais exibidos no site.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Instagram</label>
                                    <input
                                        type="text"
                                        value={branding.social_links?.instagram || ''}
                                        onChange={(e) => updateSocial('instagram', e.target.value)}
                                        placeholder="https://instagram.com/sua_empresa"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Facebook</label>
                                    <input
                                        type="text"
                                        value={branding.social_links?.facebook || ''}
                                        onChange={(e) => updateSocial('facebook', e.target.value)}
                                        placeholder="https://facebook.com/sua_empresa"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">LinkedIn</label>
                                    <input
                                        type="text"
                                        value={branding.social_links?.linkedin || ''}
                                        onChange={(e) => updateSocial('linkedin', e.target.value)}
                                        placeholder="https://linkedin.com/company/sua_empresa"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">YouTube</label>
                                    <input
                                        type="text"
                                        value={branding.social_links?.youtube || ''}
                                        onChange={(e) => updateSocial('youtube', e.target.value)}
                                        placeholder="https://youtube.com/@sua_empresa"
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Policies Section */}
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground">Políticas e Termos</h3>
                                <p className="text-sm text-muted-foreground">Textos de privacidade e termos de serviço exibidos no rodapé.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Política de Privacidade</label>
                                    <textarea
                                        value={branding.privacy_policy || 'Sua privacidade é importante para nós. Coletamos apenas as informações necessárias para prestar nossos serviços imobiliários de forma eficiente e segura. Seus dados (nome, telefone e e-mail) são utilizados exclusivamente para entrar em contato sobre os properties de seu interesse e não são compartilhados com terceiros sem sua autorização. Garantimos a segurança das suas informações através de práticas modernas de proteção de dados. Você pode solicitar a exclusão de suas informações a qualquer momento através de nossos canais de atendimento.'}
                                        onChange={(e) => setBranding(prev => ({ ...prev, privacy_policy: e.target.value }))}
                                        placeholder="Insira o texto da sua Política de Privacidade aqui..."
                                        rows={4}
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all resize-none min-h-[120px]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80 ml-1 block uppercase tracking-wider">Termos de Serviço</label>
                                    <textarea
                                        value={branding.terms_of_service || 'Ao utilizar nosso site vitrine, você concorda com os seguintes termos: 1. As informações dos properties (preços, disponibilidade e características) estão sujeitas a alterações sem aviso prévio. 2. O conteúdo deste site é para fins informativos e não constitui uma proposta jurídica vinculante até a assinatura de contrato formal. 3. O uso de robôs ou scripts para extração de dados é proibido. 4. Todas as imagens e logotipos são protegidos por direitos autorais. Nos reservamos o direito de atualizar estes termos periodicamente para melhor atender nossos usuários.'}
                                        onChange={(e) => setBranding(prev => ({ ...prev, terms_of_service: e.target.value }))}
                                        placeholder="Insira o texto dos seus Termos de Serviço aqui..."
                                        rows={4}
                                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all resize-none min-h-[120px]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 flex justify-end">
                            <button
                                onClick={handleSaveMain}
                                disabled={saving}
                                className="px-12 py-2 min-w-[140px] bg-secondary text-secondary-foreground rounded-md font-bold hover:opacity-90 transition-opacity"
                            >
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
    )
}
