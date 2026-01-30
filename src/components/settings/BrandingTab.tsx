'use client'

import { useState, useEffect } from 'react'
import { Image as ImageIcon, Upload, Loader2, Save, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/app/_actions/profile'
import { updateTenantBranding } from '@/app/_actions/tenant'
import { toast } from 'sonner'

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

            setBranding(prev => ({ ...prev, [type]: publicUrl }))
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
        } else {
            toast.error('Erro ao salvar: ' + result.error)
        }
        setSaving(false)
    }

    const handleRemove = (type: 'logo_full' | 'logo_icon') => {
        setBranding(prev => ({ ...prev, [type]: undefined }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

    if (!isAdmin) {
        return (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground">Você não tem permissão para alterar a marca da empresa.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Marca da Empresa</h3>
                        <p className="text-sm text-muted-foreground">Personalize os logos que aparecem no sistema.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar Alterações
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Logo Completo */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-bold text-foreground mb-1 block">Logo Completo</label>
                                <p className="text-[11px] text-muted-foreground mb-3">Exibido na sidebar expandida e tela de login. Recomendado: retangular.</p>
                            </div>
                            {branding.logo_full && (
                                <div className="flex flex-col items-end gap-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Altura: {branding.logo_height || 200}px</label>
                                    <input 
                                        type="range" 
                                        min="200" 
                                        max="600" 
                                        value={branding.logo_height || 200}
                                        onChange={(e) => setBranding(prev => ({ ...prev, logo_height: parseInt(e.target.value) }))}
                                        className="w-32 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-secondary"
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="relative group aspect-[3/1] rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors">
                            {branding.logo_full ? (
                                <>
                                    <img 
                                          src={branding.logo_full} 
                                          alt="Logo Full" 
                                          style={{ height: `${branding.logo_height || 200}px` }}
                                          className="max-w-[80%] object-contain transition-all" 
                                      />
                                    <button
                                        onClick={() => handleRemove('logo_full')}
                                        className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <span className="text-xs font-medium text-muted-foreground">Nenhum logo carregado</span>
                                </div>
                            )}
                            
                            <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:bg-black/40 hover:opacity-100 transition-all">
                                <div className="text-white text-center">
                                    {isUploading === 'logo_full' ? (
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 mx-auto mb-1" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Trocar Logo</span>
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
                    </div>

                    {/* Ícone */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-foreground mb-1 block">Ícone (Favicon)</label>
                            <p className="text-[11px] text-muted-foreground mb-3">Exibido na sidebar recolhida e aba do navegador. Recomendado: 1:1 (quadrado).</p>
                        </div>
                        
                        <div className="relative group aspect-square max-w-[120px] rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors">
                            {branding.logo_icon ? (
                                <>
                                    <img src={branding.logo_icon} alt="Logo Icon" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => handleRemove('logo_icon')}
                                        className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
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

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-[11px] text-blue-500 font-medium">
                    <strong>Dica:</strong> Após salvar, as alterações serão aplicadas em todo o sistema. Se os logos não atualizarem imediatamente, tente recarregar a página para limpar o cache do navegador.
                </p>
            </div>
        </div>
    )
}