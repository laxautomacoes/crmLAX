'use client'

import { useState, useEffect } from 'react'
import { Image as ImageIcon, Upload, Loader2, Save, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/app/_actions/profile'
import { updateTenantBranding } from '@/app/_actions/tenant'
import { toast } from 'sonner'
import { Logo } from '@/components/shared/Logo'

interface BrandingData {
    logo_full?: string
    logo_icon?: string
    logo_height?: number
}

export function BrandingTab() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isUploading, setIsUploading] = useState<'logo_full' | 'logo_icon' | null>(null)
    const [profile, setProfile] = useState<any>(null)
    const [branding, setBranding] = useState<BrandingData>({})

    useEffect(() => {
        const handleGlobalSave = () => {
            handleSave()
        }
        window.addEventListener('trigger-save-settings', handleGlobalSave)
        return () => window.removeEventListener('trigger-save-settings', handleGlobalSave)
    }, [branding])

    useEffect(() => {
        async function loadData() {
            const { profile } = await getProfile()
            setProfile(profile)

            if (profile?.tenant_id) {
                const supabase = createClient()
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('branding')
                    .eq('id', profile.tenant_id)
                    .single()

                if (tenant?.branding) {
                    setBranding(tenant.branding)
                }
            }
            setLoading(false)
        }
        loadData()
    }, [])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo_full' | 'logo_icon') => {
        const file = e.target.files?.[0]
        if (!file || !profile?.tenant_id) return

        // Validação de proporção para o logotipo completo
        if (type === 'logo_full') {
            const isValidRatio = await new Promise<boolean>((resolve) => {
                const img = new Image()
                img.onload = () => {
                    const ratio = img.width / img.height
                    // Aceita uma pequena margem de erro na proporção (ex: 4.8 a 5.2 para 5:1)
                    resolve(Math.abs(ratio - 5) < 0.2)
                }
                img.onerror = () => resolve(false)
                img.src = URL.createObjectURL(file)
            })

            if (!isValidRatio) {
                toast.error('Proporção não aceita! O logotipo deve estar no padrão 5:1 (ex: 250x50px).')
                e.target.value = ''
                return
            }
        }

        setIsUploading(type)
        const supabase = createClient()

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${type}-${Date.now()}.${fileExt}`
            const filePath = `${profile.tenant_id}/${fileName}`

            // Usaremos o bucket 'branding'
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

            setBranding(prev => {
                const newBranding = { ...prev, [type]: publicUrl };
                // Disparar evento imediatamente após o upload para atualização visual instantânea
                window.dispatchEvent(new CustomEvent('branding-updated', { detail: newBranding }));
                return newBranding;
            })
            toast.success(`${type === 'logo_full' ? 'Logo' : 'Ícone'} carregado com sucesso!`)
        } catch (error: any) {
            console.error(`Error uploading ${type}:`, error)
            toast.error(`Erro ao carregar imagem: ${error.message}`)
        } finally {
            setIsUploading(null)
            e.target.value = ''
        }
    }

    const handleSave = async () => {
        if (!profile?.tenant_id) return
        setSaving(true)

        const result = await updateTenantBranding(profile.tenant_id, branding)

        if (result.success) {
            toast.success('Configurações de marca salvas!')
            // Disparar evento para atualizar outros componentes sem recarregar a página
            window.dispatchEvent(new CustomEvent('branding-updated', { detail: branding }))
        } else {
            toast.error('Erro ao salvar: ' + result.error)
        }
        setSaving(false)
    }

    const handleRemove = (type: 'logo_full' | 'logo_icon') => {
        setBranding(prev => {
            const newBranding = { ...prev, [type]: undefined };
            window.dispatchEvent(new CustomEvent('branding-updated', { detail: newBranding }));
            return newBranding;
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
            </div>
        )
    }

    const userRole = profile?.role?.toLowerCase() || '';
    const isSuperAdmin = ['superadmin', 'super_admin', 'super administrador', 'super admin', 'super_administrador'].includes(userRole);
    const hasBrandingAccess = ['admin', ...(['superadmin', 'super_admin', 'super administrador', 'super admin', 'super_administrador'])].includes(userRole);

    if (!hasBrandingAccess) {
        return (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground">Você não tem permissão para alterar o branding empresarial.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Branding</h3>
                        <p className="text-sm text-muted-foreground">Personalize o logotipo e ícone | favicon da empresa.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-stretch gap-8">
                    {/* Logotipo */}
                    <div className="flex-1 space-y-4 flex flex-col">
                        <div className="min-h-[80px] space-y-2">
                            <label className="text-lg font-bold text-foreground mb-1 block">Logotipo</label>
                            <p className="text-sm text-muted-foreground leading-none">Exibido na barra lateral expandida e nas mensagens.</p>
                            <p className="text-sm text-muted-foreground leading-none">Medidas de referência: 250x50 px (5:1)</p>
                            <p className="text-[11px] text-muted-foreground italic leading-none">Arquivos aceitos: JPG, PNG e WEBP</p>
                        </div>

                        <div className="relative group min-h-[120px] rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors">
                            {branding.logo_full ? (
                                <>
                                    <div className="flex items-center justify-center p-2">
                                        <Logo
                                            size="lg"
                                            src={branding.logo_full}
                                            height={branding.logo_height || 100}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm('Deseja remover o logotipo?')) {
                                                handleRemove('logo_full')
                                            }
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-all z-10"
                                        title="Remover Logotipo"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <span className="text-xs font-medium text-muted-foreground">Nenhum logotipo carregado</span>
                                </div>
                            )}

                            <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:bg-black/40 hover:opacity-100 transition-all">
                                <div className="text-white text-center">
                                    {isUploading === 'logo_full' ? (
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 mx-auto mb-1" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Trocar Logotipo</span>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'logo_full')}
                                    disabled={!!isUploading}
                                />
                            </label>
                        </div>

                        {branding.logo_full && (
                            <div className="flex items-center gap-4 mt-2 px-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Tamanho: {(branding.logo_height || 50) * 5}x{branding.logo_height || 50}px</label>
                                <input
                                    type="range"
                                    min="20"
                                    max="50"
                                    value={branding.logo_height || 50}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setBranding(prev => {
                                            const newBranding = { ...prev, logo_height: val };
                                            window.dispatchEvent(new CustomEvent('branding-updated', { detail: newBranding }));
                                            return newBranding;
                                        });
                                    }}
                                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-secondary"
                                />
                            </div>
                        )}
                    </div>

                    {/* Separador */}
                    <div className="hidden md:block w-px bg-border self-stretch opacity-80" />
                    <div className="block md:hidden h-px bg-border w-full opacity-80" />

                    {/* Ícone */}
                    <div className="flex-1 space-y-4 flex flex-col">
                        <div className="min-h-[80px] space-y-2">
                            <label className="text-lg font-bold text-foreground mb-1 block">Ícone | Favicon</label>
                            <p className="text-sm text-muted-foreground leading-none">Exibido na barra lateral recolhida e nas mensagens.</p>
                            <p className="text-sm text-muted-foreground leading-none">Medidas de referência: 200x200 px (1:1)</p>
                            <p className="text-[11px] text-muted-foreground italic leading-none">Arquivos aceitos: JPG, PNG e WEBP</p>
                        </div>

                        <div className="relative group aspect-square max-w-[120px] rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors">
                            {branding.logo_icon ? (
                                <>
                                    <img src={branding.logo_icon} alt="Logo Icon" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => {
                                            if (confirm('Deseja remover o ícone?')) {
                                                handleRemove('logo_icon')
                                            }
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-all z-10"
                                        title="Remover Ícone"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center p-2">
                                    <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                                    <span className="text-[10px] font-medium text-muted-foreground">Nenhum ícone</span>
                                </div>
                            )}

                            <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:bg-black/40 hover:opacity-100 transition-all">
                                <div className="text-white text-center p-1">
                                    {isUploading === 'logo_icon' ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5 mx-auto mb-1" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">Trocar Ícone</span>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'logo_icon')}
                                    disabled={!!isUploading}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 md:hidden"
            >
                {saving && <Loader2 size={18} className="animate-spin" />}
                Salvar Alterações
            </button>

            <div className="bg-muted/30 border border-border rounded-xl p-4">
                <p className="text-sm text-muted-foreground font-medium">
                    <strong className="text-foreground">Dica:</strong> Após salvar, as alterações serão aplicadas em todo o sistema. Se os logos não atualizarem imediatamente, tente recarregar a página para limpar o cache do navegador.
                </p>
            </div>
        </div>
    )
}