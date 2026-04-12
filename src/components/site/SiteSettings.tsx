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
    Palette
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/app/_actions/profile'
import { updateTenantBranding } from '@/app/_actions/tenant'
import { toast } from 'sonner'
import { Logo } from '@/components/shared/Logo'

interface BrandingData {
    logo_full?: string
    logo_header?: string
    logo_icon?: string
    logo_height?: number
    logo_header_height?: number
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
}

export function SiteSettings() {
    const [activeTab, setActiveTab] = useState<'branding' | 'footer'>('branding')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isUploading, setIsUploading] = useState<'logo_full' | 'logo_header' | 'logo_icon' | null>(null)
    const [profile, setProfile] = useState<any>(null)
    const [tenant, setTenant] = useState<any>(null)
    const [branding, setBranding] = useState<BrandingData>({})

    useEffect(() => {
        async function loadData() {
            const { profile: userProfile } = await getProfile()
            setProfile(userProfile)

            if (userProfile?.tenant_id) {
                const supabase = createClient()
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('*')
                    .eq('id', userProfile.tenant_id)
                    .single()

                if (tenantData) {
                    setTenant(tenantData)
                    if (tenantData.branding) {
                        setBranding(tenantData.branding)
                    }
                }
            }
            setLoading(false)
        }
        loadData()
    }, [])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo_full' | 'logo_header' | 'logo_icon') => {
        const file = e.target.files?.[0]
        if (!file || !profile?.tenant_id) return

        if (type === 'logo_full' || type === 'logo_header') {
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
            toast.success(`${type === 'logo_full' ? 'Logo do Site' : type === 'logo_header' ? 'Logo do Header' : 'Ícone'} carregado com sucesso!`)
        } catch (error: any) {
            console.error(`Error uploading ${type}:`, error)
            toast.error(`Erro ao carregar imagem: ${error.message}`)
        } finally {
            setIsUploading(null)
            e.target.value = ''
        }
    }

    const handleSaveMain = async () => {
        if (!profile?.tenant_id) return
        setSaving(true)

        const result = await updateTenantBranding(profile.tenant_id, branding)

        if (result.success) {
            toast.success('Configurações salvas com sucesso!')
            window.dispatchEvent(new CustomEvent('branding-updated', { detail: branding }))
        } else {
            toast.error('Erro ao salvar: ' + result.error)
        }
        setSaving(false)
    }

    const handleRemoveLogo = (type: 'logo_full' | 'logo_header' | 'logo_icon') => {
        const labels = {
            logo_full: 'logotipo principal',
            logo_header: 'logotipo do header',
            logo_icon: 'ícone'
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex items-center border-b border-border">
                <button
                    onClick={() => setActiveTab('branding')}
                    className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'branding' ? 'text-foreground border-b-[3px] active-tab-indicator' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Palette size={16} />
                    Identidade
                </button>
                <button
                    onClick={() => setActiveTab('footer')}
                    className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'footer' ? 'text-foreground border-b-[3px] active-tab-indicator' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <MapPin size={16} />
                    Rodapé
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* BRANDING TAB */}
                {activeTab === 'branding' && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground">Identidade Visual</h3>
                                <p className="text-sm text-muted-foreground">Logotipo e favicon exibidos no site e no dashboard.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {/* Logo Full (Site) */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-foreground">Logotipo Principal (Site)</label>
                                        <p className="text-xs text-muted-foreground">Exibido na vitrine. Recomendado: 5:1</p>
                                    </div>
                                    <div className="relative group min-h-[140px] rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors">
                                        {branding.logo_full ? (
                                            <>
                                                <div className="p-4">
                                                    <Logo size="lg" src={branding.logo_full} height={branding.logo_height || 50} />
                                                </div>
                                                <button onClick={() => handleRemoveLogo('logo_full')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
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
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo_full')} disabled={!!isUploading} />
                                            {isUploading === 'logo_full' && <Loader2 className="animate-spin text-white" />}
                                        </label>
                                    </div>
                                    {branding.logo_full && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-foreground/60 dark:text-muted-foreground uppercase">Ajustar Tamanho (Site)</label>
                                                <span className="text-[10px] font-bold text-foreground/60">{branding.logo_height || 50}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="20"
                                                max="60"
                                                value={branding.logo_height || 50}
                                                onChange={(e) => setBranding(prev => ({ ...prev, logo_height: parseInt(e.target.value) }))}
                                                onMouseUp={handleSaveMain}
                                                className="w-full h-1.5 bg-gray-200 dark:bg-muted rounded-lg appearance-none cursor-pointer accent-muted-foreground transition-colors"
                                            />
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-[9px] font-bold text-muted-foreground">20px</span>
                                                <span className="text-[9px] font-bold text-muted-foreground">60px</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Logo Header (System) */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-foreground">Logotipo do Header (Dashboard)</label>
                                        <p className="text-xs text-muted-foreground">Exibido no sistema interno.</p>
                                    </div>
                                    <div className="relative group min-h-[140px] rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors">
                                        {(branding.logo_header || branding.logo_full) ? (
                                            <>
                                                <div className="p-4">
                                                    <Logo
                                                        size="lg"
                                                        src={branding.logo_header || branding.logo_full}
                                                        height={branding.logo_header_height || (branding.logo_header ? 40 : branding.logo_height || 40)}
                                                    />
                                                </div>
                                                {(branding.logo_header || branding.logo_full) && (
                                                    <button onClick={() => handleRemoveLogo('logo_header')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center p-4">
                                                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                                <span className="text-xs text-muted-foreground">Upload Header Logo</span>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:bg-black/20 hover:opacity-100 transition-all">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo_header')} disabled={!!isUploading} />
                                            {isUploading === 'logo_header' && <Loader2 className="animate-spin text-white" />}
                                        </label>
                                    </div>
                                    {(branding.logo_header || branding.logo_full) && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-foreground/60 dark:text-muted-foreground uppercase">Ajustar Tamanho (Header)</label>
                                                <span className="text-[10px] font-bold text-foreground/60">{branding.logo_header_height || (branding.logo_header ? 40 : branding.logo_height || 40)}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="20"
                                                max="60"
                                                value={branding.logo_header_height || (branding.logo_header ? 40 : branding.logo_height || 40)}
                                                onChange={(e) => setBranding(prev => ({ ...prev, logo_header_height: parseInt(e.target.value) }))}
                                                onMouseUp={handleSaveMain}
                                                className="w-full h-1.5 bg-gray-200 dark:bg-muted rounded-lg appearance-none cursor-pointer accent-muted-foreground transition-colors"
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
                                        <label className="text-sm font-bold text-foreground">Ícone (Favicon)</label>
                                        <p className="text-xs text-muted-foreground">Recomendado: 200x200px (1:1)</p>
                                    </div>
                                    <div className="relative group aspect-square max-w-[140px] rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors">
                                        {branding.logo_icon ? (
                                            <>
                                                <img src={branding.logo_icon} className="w-full h-full object-contain p-4" alt="Icon" />
                                                <button onClick={() => handleRemoveLogo('logo_icon')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
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
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo_icon')} disabled={!!isUploading} />
                                            {isUploading === 'logo_icon' && <Loader2 className="animate-spin text-white" />}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FOOTER TAB (Address + Social) */}
                {activeTab === 'footer' && (
                    <div className="space-y-6">
                        {/* Address Section */}
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground">Localização da Imobiliária</h3>
                                <p className="text-sm text-muted-foreground">Informações de endereço exibidas no rodapé do seu site.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">Rua / Avenida</label>
                                    <input
                                        type="text"
                                        value={branding.address?.street || ''}
                                        onChange={(e) => updateAddress('street', e.target.value)}
                                        placeholder="Ex: Av. Atlântica"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">Número</label>
                                    <input
                                        type="text"
                                        value={branding.address?.number || ''}
                                        onChange={(e) => updateAddress('number', e.target.value)}
                                        placeholder="Ex: 500"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">Complemento</label>
                                    <input
                                        type="text"
                                        value={branding.address?.complement || ''}
                                        onChange={(e) => updateAddress('complement', e.target.value)}
                                        placeholder="Ex: Sala 201"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">Bairro</label>
                                    <input
                                        type="text"
                                        value={branding.address?.neighborhood || ''}
                                        onChange={(e) => updateAddress('neighborhood', e.target.value)}
                                        placeholder="Ex: Centro"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">Cidade</label>
                                    <input
                                        type="text"
                                        value={branding.address?.city || ''}
                                        onChange={(e) => updateAddress('city', e.target.value)}
                                        placeholder="Ex: Balneário Camboriú"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">Estado (UF)</label>
                                    <input
                                        type="text"
                                        value={branding.address?.state || ''}
                                        onChange={(e) => updateAddress('state', e.target.value)}
                                        placeholder="Ex: SC"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">CEP</label>
                                    <input
                                        type="text"
                                        value={branding.address?.zip_code || ''}
                                        onChange={(e) => updateAddress('zip_code', e.target.value)}
                                        placeholder="00000-000"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
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
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">Instagram</label>
                                    <input
                                        type="text"
                                        value={branding.social_links?.instagram || ''}
                                        onChange={(e) => updateSocial('instagram', e.target.value)}
                                        placeholder="https://instagram.com/sua_empresa"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">Facebook</label>
                                    <input
                                        type="text"
                                        value={branding.social_links?.facebook || ''}
                                        onChange={(e) => updateSocial('facebook', e.target.value)}
                                        placeholder="https://facebook.com/sua_empresa"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">LinkedIn</label>
                                    <input
                                        type="text"
                                        value={branding.social_links?.linkedin || ''}
                                        onChange={(e) => updateSocial('linkedin', e.target.value)}
                                        placeholder="https://linkedin.com/company/sua_empresa"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">YouTube</label>
                                    <input
                                        type="text"
                                        value={branding.social_links?.youtube || ''}
                                        onChange={(e) => updateSocial('youtube', e.target.value)}
                                        placeholder="https://youtube.com/@sua_empresa"
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
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
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">Política de Privacidade</label>
                                    <textarea
                                        value={branding.privacy_policy || 'Sua privacidade é importante para nós. Coletamos apenas as informações necessárias para prestar nossos serviços imobiliários de forma eficiente e segura. Seus dados (nome, telefone e e-mail) são utilizados exclusivamente para entrar em contato sobre os imóveis de seu interesse e não são compartilhados com terceiros sem sua autorização. Garantimos a segurança das suas informações através de práticas modernas de proteção de dados. Você pode solicitar a exclusão de suas informações a qualquer momento através de nossos canais de atendimento.'}
                                        onChange={(e) => setBranding(prev => ({ ...prev, privacy_policy: e.target.value }))}
                                        placeholder="Insira o texto da sua Política de Privacidade aqui..."
                                        rows={4}
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all resize-none min-h-[120px]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-800 ml-1 block uppercase tracking-wider">Termos de Serviço</label>
                                    <textarea
                                        value={branding.terms_of_service || 'Ao utilizar nosso site vitrine, você concorda com os seguintes termos: 1. As informações dos imóveis (preços, disponibilidade e características) estão sujeitas a alterações sem aviso prévio. 2. O conteúdo deste site é para fins informativos e não constitui uma proposta jurídica vinculante até a assinatura de contrato formal. 3. O uso de robôs ou scripts para extração de dados é proibido. 4. Todas as imagens e logotipos são protegidos por direitos autorais. Nos reservamos o direito de atualizar estes termos periodicamente para melhor atender nossos usuários.'}
                                        onChange={(e) => setBranding(prev => ({ ...prev, terms_of_service: e.target.value }))}
                                        placeholder="Insira o texto dos seus Termos de Serviço aqui..."
                                        rows={4}
                                        className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all resize-none min-h-[120px]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 flex justify-end">
                            <button
                                onClick={handleSaveMain}
                                disabled={saving}
                                className="px-8 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
