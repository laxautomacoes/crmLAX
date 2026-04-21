'use client'

import { useState, useEffect } from 'react'
import { Image as ImageIcon, Upload, Loader2, Trash2, Mail, Plus, Check, ChevronDown, Eye, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/app/_actions/profile'
import { updateTenantEmailSettings, getEmailTemplates, saveEmailTemplate, deleteEmailTemplate, sendTestEmailAction } from '@/app/_actions/tenant'
import { toast } from 'sonner'
import { getInvitationEmailTemplate, getConfirmationEmailTemplate, getSuspensionEmailTemplate } from '@/lib/emails/templates'
import { MediaUpload } from '@/components/shared/MediaUpload'
import { FormRichTextarea } from '@/components/shared/forms/FormRichTextarea'
import { useRef } from 'react'
import { EmailDomainSettings } from './EmailDomainSettings'

interface EmailSettings {
    logo_url?: string;
    primary_color?: string;
    signature_html?: string;
    footer_text?: string;
    templates?: Record<string, { subject?: string; body?: string }>;
    attachments?: {
        images: string[];
        videos: string[];
        documents: { name: string; url: string }[];
    };
    email_domain_resend_id?: string;
    email_domain_verified?: boolean;
    email_domain_status?: string;
    custom_domain?: string;
}

export function EmailSettingsForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [profile, setProfile] = useState<any>(null)
    const [settings, setSettings] = useState<EmailSettings>({})
    const [activeTemplate, setActiveTemplate] = useState('invitation')
    const [showTypeDropdown, setShowTypeDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const dropdownMobileRef = useRef<HTMLDivElement>(null)
    const [savedTemplates, setSavedTemplates] = useState<any[]>([])
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
    const [newTemplateName, setNewTemplateName] = useState('')
    const [showTestModal, setShowTestModal] = useState(false)
    const [showPreviewModal, setShowPreviewModal] = useState(false)
    const [sendingTest, setSendingTest] = useState(false)
    const [testRecipient, setTestRecipient] = useState('')

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
                dropdownMobileRef.current && !dropdownMobileRef.current.contains(event.target as Node)) {
                setShowTypeDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        async function loadData() {
            const { profile: userProfile } = await getProfile()
            setProfile(userProfile)

            if (userProfile?.tenant_id) {
                const supabase = createClient()
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('email_settings, name, custom_domain, email_domain_resend_id, email_domain_verified, email_domain_status')
                    .eq('id', userProfile.tenant_id)
                    .single()

                if (tenant) {
                    setSettings({
                        ...(tenant.email_settings as EmailSettings || {}),
                        custom_domain: tenant.custom_domain,
                        email_domain_resend_id: tenant.email_domain_resend_id,
                        email_domain_verified: tenant.email_domain_verified,
                        email_domain_status: tenant.email_domain_status
                    })
                }

                setIsLoadingTemplates(true)
                const templatesRes = await getEmailTemplates(userProfile.tenant_id)
                if (templatesRes.success) {
                    setSavedTemplates(templatesRes.data || [])
                }
                setIsLoadingTemplates(false)
            }
            setLoading(false)
        }
        loadData()
    }, [])

    useEffect(() => {
        if (profile?.email) {
            setTestRecipient(profile.email)
        }
    }, [profile])

    const refreshTemplates = async () => {
        if (!profile?.tenant_id) return
        const templatesRes = await getEmailTemplates(profile.tenant_id)
        if (templatesRes.success) {
            setSavedTemplates(templatesRes.data || [])
        }
    }

    const handleSaveTemplate = async () => {
        if (!profile?.tenant_id || !newTemplateName.trim()) return
        setSaving(true)

        const currentTemp = settings.templates?.[activeTemplate] || {}
        
        const result = await saveEmailTemplate({
            tenant_id: profile.tenant_id,
            name: newTemplateName,
            type: activeTemplate,
            subject: currentTemp.subject || '',
            body_html: currentTemp.body || getDefaultBody(activeTemplate),
            is_active: false
        })

        if (result.success) {
            toast.success('Template salvo na biblioteca!')
            setNewTemplateName('')
            setShowSaveTemplateModal(false)
            refreshTemplates()
        } else {
            toast.error('Erro ao salvar template: ' + result.error)
        }
        setSaving(false)
    }

    const handleLoadTemplate = (template: any) => {
        setSettings(prev => ({
            ...prev,
            templates: {
                ...prev.templates,
                [activeTemplate]: {
                    subject: template.subject,
                    body: template.body_html
                }
            }
        }))
        toast.success(`Template "${template.name}" carregado!`)
    }

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este template?')) return
        
        const result = await deleteEmailTemplate(id, profile.tenant_id)
        if (result.success) {
            toast.success('Template excluído!')
            refreshTemplates()
        } else {
            toast.error('Erro ao excluir: ' + result.error)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !profile?.tenant_id) return

        setIsUploading(true)
        const supabase = createClient()
        
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `email-logo-${Date.now()}.${fileExt}`
            const filePath = `${profile.tenant_id}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('email-logos')
                .upload(filePath, file, {
                    upsert: true,
                    cacheControl: '3600'
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('email-logos')
                .getPublicUrl(filePath)

            const newSettings = { ...settings, logo_url: publicUrl };
            setSettings(newSettings);
            await updateTenantEmailSettings(profile.tenant_id, newSettings);
            toast.success('Logo de e-mail atualizada!');
        } catch (error: any) {
            console.error('Error uploading logo:', error)
            toast.error(`Erro ao carregar logo: ${error.message}`)
        } finally {
            setIsUploading(false)
            e.target.value = ''
        }
    }

    const handleRemoveLogo = async () => {
        if (!profile?.tenant_id) return
        const newSettings = { ...settings, logo_url: undefined }
        setSettings(newSettings)
        await updateTenantEmailSettings(profile.tenant_id, newSettings)
        toast.success('Logo removida!')
    }

    const handleSave = async () => {
        if (!profile?.tenant_id) return
        setSaving(true)
        const result = await updateTenantEmailSettings(profile.tenant_id, settings)
        if (result.success) {
            toast.success('Configurações de e-mail salvas!')
        } else {
            toast.error('Erro ao salvar: ' + result.error)
        }
        setSaving(false)
    }

    const handleSendTest = async () => {
        if (!testRecipient.trim() || !profile?.tenant_id) return
        setSendingTest(true)
        const result = await sendTestEmailAction({
            to: testRecipient,
            type: activeTemplate as any,
            tenantName: profile.tenants?.name || 'CRM LAX',
            settings: {
                ...settings,
                signature_html: settings.signature_html || getDefaultSignature()
            }
        })
        if (result.success) {
            toast.success('E-mail de teste enviado com sucesso!')
            setShowTestModal(false)
        } else {
            toast.error('Erro ao enviar teste: ' + result.error)
        }
        setSendingTest(false)
    }

    const updateTemplate = (field: 'subject' | 'body', value: string) => {
        setSettings(prev => ({
            ...prev,
            templates: {
                ...prev.templates,
                [activeTemplate]: {
                    ...prev.templates?.[activeTemplate],
                    [field]: value
                }
            }
        }))
    }

    const handleMediaUpload = (type: 'images' | 'videos' | 'documents', urls: any[]) => {
        setSettings(prev => ({
            ...prev,
            attachments: {
                images: prev.attachments?.images || [],
                videos: prev.attachments?.videos || [],
                documents: prev.attachments?.documents || [],
                [type]: [...(prev.attachments?.[type] || []), ...urls]
            }
        }))
        toast.success('Arquivo adicionado à galeria!')
    }

    const handleMediaRemove = (type: 'images' | 'videos' | 'documents', index: number) => {
        setSettings(prev => {
            const attachments = prev.attachments || { images: [], videos: [], documents: [] }
            const current = attachments[type] || []
            const updated = [...current] as any[]
            updated.splice(index, 1)
            return {
                ...prev,
                attachments: {
                    images: attachments.images || [],
                    videos: attachments.videos || [],
                    documents: attachments.documents || [],
                    [type]: updated
                }
            }
        })
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Link copiado!')
    }

    const onToolbarUpload = async (file: File) => {
        if (!profile?.tenant_id) return
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `email-content-${Date.now()}.${fileExt}`
            const filePath = `${profile.tenant_id}/${fileName}`
            const bucket = file.type.startsWith('image/') ? 'email-logos' : 'properties'
            const supabase = createClient()
            const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file)
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
            const type: 'images' | 'documents' = file.type.startsWith('image/') ? 'images' : 'documents'
            const newAttachment = type === 'images' ? publicUrl : { name: file.name, url: publicUrl }
            setSettings(prev => {
                const attachments = prev.attachments || { images: [], videos: [], documents: [] }
                return {
                    ...prev,
                    attachments: {
                        images: attachments.images || [],
                        videos: attachments.videos || [],
                        documents: attachments.documents || [],
                        [type]: [...(attachments[type] || []), newAttachment]
                    }
                }
            })
            return publicUrl
        } catch (error: any) {
            toast.error('Erro ao carregar arquivo')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-foreground/20" />
            </div>
        )
    }

    const previewData = {
        nome: "João Silva",
        email: profile?.email || "contato@exemplo.com",
        empresa: profile?.tenants?.name || 'Sua Imobiliária',
        whatsapp: profile?.whatsapp_number || "(11) 99999-9999",
        link: "https://crmlax.com/register?token=test",
        tenantName: profile?.tenants?.name || 'Sua Imobiliária'
    }

    const currentTemplate = settings.templates?.[activeTemplate] || {}
    const bodyMarkdown = currentTemplate.body || getDefaultBody(activeTemplate)
    
    const getPreviewTemplateHtml = () => {
        const config = {
            ...settings,
            signature_html: settings.signature_html || getDefaultSignature(),
            templates: {
                [activeTemplate]: { ...currentTemplate, body: bodyMarkdown }
            }
        }
        switch(activeTemplate) {
            case 'confirmation': return getConfirmationEmailTemplate(previewData.link, previewData.tenantName, config, previewData).html
            case 'suspension': return getSuspensionEmailTemplate(previewData.tenantName, config, previewData).html
            default: return getInvitationEmailTemplate(previewData.link, previewData.tenantName, config, previewData).html
        }
    }

    const previewHtmlRaw = getPreviewTemplateHtml()
    const previewHtml = previewHtmlRaw.replace('</head>', '<style>html,body{scrollbar-width:none;-ms-overflow-style:none;margin:0;padding:0;width:100%;}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none;}.container{max-width:100%!important;padding-left:0!important;padding-right:0!important;}</style></head>')

    return (
        <div className="w-full space-y-8 pb-20">
            <div className="space-y-6">
                {profile?.tenant_id && (
                    <EmailDomainSettings 
                        tenantId={profile.tenant_id}
                        initialDomain={settings.custom_domain}
                        initialResendId={settings.email_domain_resend_id}
                        initialVerified={settings.email_domain_verified}
                        initialStatus={settings.email_domain_status}
                    />
                )}

                <h4 className="text-lg font-bold text-foreground text-center sm:text-left sm:ml-1 mb-6 sm:mb-3">
                    Identidade Visual
                </h4>
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-foreground text-center sm:text-left sm:ml-1 block">Logo Empresa</label>
                            <div className="relative aspect-[5/2] rounded-xl border border-solid border-border flex items-center justify-center overflow-hidden bg-background hover:bg-muted/10 transition-colors group shadow-sm">
                                {settings.logo_url ? (
                                    <>
                                        <img src={settings.logo_url} alt="Logo" className="max-h-full object-contain p-2" />
                                        <button onClick={handleRemoveLogo} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg">
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center text-muted-foreground">
                                        <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-20" />
                                        <span className="text-[10px]">Recomendado: 250x50px</span>
                                    </div>
                                )}
                                {!settings.logo_url && (
                                    <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:bg-black/40 group-hover:opacity-100 transition-all">
                                        <div className="text-white">{isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}</div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                    </label>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3 sm:md:ml-24">
                            <label className="text-sm font-bold text-foreground text-center sm:text-left sm:ml-1 block">Cor Destaque</label>
                            <div className="flex items-center justify-center sm:justify-start gap-3">
                                <div className="relative group overflow-hidden rounded-xl h-12 w-12 border border-border shadow-sm">
                                    <input type="color" value={settings.primary_color || '#FFE600'} onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))} className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] cursor-pointer border-none appearance-none bg-transparent" />
                                </div>
                                <input type="text" value={settings.primary_color || '#FFE600'} onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))} className="w-32 h-12 bg-background border border-border rounded-xl px-4 text-sm font-mono outline-none text-center" />
                            </div>
                        </div>
                    </div>
                </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:ml-1 mb-6 sm:mb-3 gap-4">
                        <h4 className="text-lg font-bold text-foreground text-center sm:text-left">Conteúdo</h4>
                        <div className="relative hidden sm:flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto" ref={dropdownRef}>
                            <button 
                                onClick={() => setShowPreviewModal(true)} 
                                className="hidden sm:flex w-full sm:w-auto bg-background border border-border rounded-lg sm:rounded-xl px-4 py-2.5 sm:py-2 text-xs font-bold hover:bg-muted/30 transition-all shadow-sm items-center justify-center gap-2"
                            >
                                <Eye size={14} className="text-muted-foreground" />
                                Visualizar E-mail
                            </button>
                            <button onClick={() => setShowTypeDropdown(!showTypeDropdown)} className="w-full sm:w-auto bg-background border border-border rounded-lg sm:rounded-xl px-4 py-2.5 sm:py-2 text-xs font-bold hover:bg-muted/30 transition-all shadow-sm flex items-center gap-2 sm:min-w-[180px] justify-center sm:justify-between text-left">
                                <span className="flex items-center gap-2 truncate">
                                    {activeTemplate === 'invitation' ? 'Convite Colaborador' : activeTemplate === 'confirmation' ? 'Confirmação de E-mail' : 'Aviso de Suspensão'}
                                </span>
                                <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showTypeDropdown && (
                                <div className="absolute right-0 top-full mt-2 w-full min-w-[200px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {[{ id: 'invitation', label: 'Convite Colaborador' }, { id: 'confirmation', label: 'Confirmação de E-mail' }, { id: 'suspension', label: 'Aviso de Suspensão' }].map((type) => (
                                        <button key={type.id} onClick={() => { setActiveTemplate(type.id as any); setShowTypeDropdown(false) }} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-muted/50 transition-colors flex items-center gap-3">
                                            <div className="w-4 shrink-0">{activeTemplate === type.id && <Check size={14} />}</div>
                                            <span className={activeTemplate === type.id ? 'text-foreground' : 'text-muted-foreground'}>{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Card Único de Conteúdo */}
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-8 shadow-sm overflow-visible">
                            {/* Seletor de Template - Mobile Only */}
                            <div className="sm:hidden relative" ref={dropdownMobileRef}>
                                <button 
                                    onClick={() => setShowTypeDropdown(!showTypeDropdown)} 
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-xs font-bold hover:bg-muted/30 transition-all shadow-sm flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        {activeTemplate === 'invitation' ? 'Convite Colaborador' : activeTemplate === 'confirmation' ? 'Confirmação de E-mail' : 'Aviso de Suspensão'}
                                    </span>
                                    <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {showTypeDropdown && (
                                    <>
                                        <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            {[{ id: 'invitation', label: 'Convite Colaborador' }, { id: 'confirmation', label: 'Confirmação de E-mail' }, { id: 'suspension', label: 'Aviso de Suspensão' }].map((type) => (
                                                <button 
                                                    key={type.id} 
                                                    onClick={() => { setActiveTemplate(type.id as any); setShowTypeDropdown(false) }} 
                                                    className="w-full px-4 py-4 text-left text-xs font-bold hover:bg-muted/50 transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                                                >
                                                    <div className="w-4 shrink-0">{activeTemplate === type.id && <Check size={14} />}</div>
                                                    <span className={activeTemplate === type.id ? 'text-foreground' : 'text-muted-foreground'}>{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setShowTypeDropdown(false)} />
                                    </>
                                )}
                            </div>
                            {/* Biblioteca */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-foreground">Biblioteca</h4>
                                    <button onClick={() => setShowSaveTemplateModal(true)} className="text-[10px] font-black text-foreground uppercase tracking-widest hover:underline flex items-center gap-1">
                                        <Plus size={10} /> Salvar Novo
                                    </button>
                                </div>
                                <div className="bg-background border border-border rounded-xl p-4 space-y-3 shadow-inner">
                                    {savedTemplates.filter(t => t.type === activeTemplate).length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {savedTemplates.filter(t => t.type === activeTemplate).map((t) => (
                                                <div key={t.id} className="group relative">
                                                    <button onClick={() => handleLoadTemplate(t)} className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold hover:border-foreground transition-all active:scale-95 shadow-sm">
                                                        {t.name}
                                                    </button>
                                                    <button onClick={() => handleDeleteTemplate(t.id)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground italic">Nenhum template salvo nesta categoria.</p>
                                    )}
                                </div>
                            </div>

                            {/* Assunto */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-foreground ml-1">Assunto</h4>
                                <input type="text" value={currentTemplate.subject || getDefaultSubject(activeTemplate)} onChange={(e) => updateTemplate('subject', e.target.value)} placeholder="Assunto do e-mail" className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-secondary/50 outline-none transition-all" />
                            </div>

                            {/* Descrição */}
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <h4 className="text-sm font-bold text-foreground">Descrição</h4>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Variáveis:</span>
                                        <div className="flex flex-wrap gap-1">
                                            <button onClick={() => copyToClipboard('{{nome}}')} className="text-[10px] text-foreground font-black bg-muted hover:bg-secondary/20 px-2 py-0.5 rounded border border-border transition-colors outline-none">{`{{nome}}`}</button>
                                            <button onClick={() => copyToClipboard('{{email}}')} className="text-[10px] text-foreground font-black bg-muted hover:bg-secondary/20 px-2 py-0.5 rounded border border-border transition-colors outline-none">{`{{email}}`}</button>
                                            <button onClick={() => copyToClipboard('{{empresa}}')} className="text-[10px] text-foreground font-black bg-muted hover:bg-secondary/20 px-2 py-0.5 rounded border border-border transition-colors outline-none">{`{{empresa}}`}</button>
                                            <button onClick={() => copyToClipboard('{{whatsapp}}')} className="text-[10px] text-foreground font-black bg-muted hover:bg-secondary/20 px-2 py-0.5 rounded border border-border transition-colors outline-none">{`{{whatsapp}}`}</button>
                                            <button onClick={() => copyToClipboard('{{link}}')} className="text-[10px] text-foreground font-black bg-muted hover:bg-secondary/20 px-2 py-0.5 rounded border border-border transition-colors outline-none">{`{{link}}`}</button>
                                        </div>
                                    </div>
                                </div>
                                <FormRichTextarea value={currentTemplate.body || getDefaultBody(activeTemplate)} onChange={(val) => updateTemplate('body', val)} placeholder="Descreva o conteúdo do e-mail..." className="rich-text-editor-body" attachments={settings.attachments} onUpload={onToolbarUpload} />
                            </div>

                            {/* Assinatura */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-foreground mb-3">Assinatura</h4>
                                <FormRichTextarea value={settings.signature_html || getDefaultSignature()} onChange={(val) => setSettings(prev => ({ ...prev, signature_html: val }))} placeholder="Atenciosamente, Sua Equipe" className="rich-text-editor-signature" attachments={settings.attachments} onUpload={onToolbarUpload} />
                                
                                {/* Visualizar E-mail - Mobile Only */}
                                <div className="pt-2 sm:hidden">
                                    <button 
                                        onClick={() => setShowPreviewModal(true)} 
                                        className="flex w-full bg-background border border-border rounded-lg px-4 py-3 text-xs font-bold hover:bg-muted/30 transition-all shadow-sm items-center justify-center gap-2"
                                    >
                                        <Eye size={14} className="text-muted-foreground" />
                                        Visualizar E-mail
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                <h4 className="text-lg font-bold text-foreground text-center sm:text-left sm:ml-1 mb-6 sm:mb-3">Galeria</h4>
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                    {profile?.tenant_id && (
                        <MediaUpload bucket="email-logos" pathPrefix={`${profile.tenant_id}/assets`} images={settings.attachments?.images || []} videos={settings.attachments?.videos || []} documents={settings.attachments?.documents || []} onUpload={handleMediaUpload} onRemove={handleMediaRemove} />
                    )}
                </div>

                <div className="pt-2">
                    <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-secondary text-secondary-foreground font-bold rounded-xl hover:opacity-90 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-secondary/10">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        Salvar configurações
                    </button>
                </div>
            </div>

            {/* Modais */}
            {showPreviewModal && (
                <div 
                    className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in duration-300"
                    onClick={() => setShowPreviewModal(false)}
                >
                    <div 
                        className="w-full max-w-[700px] h-[90vh] flex flex-col px-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Card Envolvente */}
                        <div className="flex-1 flex flex-col rounded-2xl border border-white/10 shadow-2xl p-4 bg-[#111] overflow-hidden">
                            {/* Botão Fechar */}
                            <div className="flex justify-end mb-2">
                                <button 
                                    onClick={() => setShowPreviewModal(false)}
                                    className="text-white/40 hover:text-white transition-colors p-1"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Card Assunto */}
                            <div className="bg-[#1A1A1A] rounded-xl border border-white/10 px-5 py-4 shrink-0 mb-2">
                                <p className="text-sm font-bold text-white">
                                    <span className="text-white/40">Assunto:</span>{' '}
                                    {currentTemplate.subject || getDefaultSubject(activeTemplate)}
                                </p>
                            </div>

                            {/* Preview do E-mail */}
                            <iframe 
                                srcDoc={previewHtml} 
                                className="flex-1 w-full border-none bg-transparent rounded-xl" 
                                title="Email Preview" 
                            />

                            {/* Botão Enviar Teste */}
                            <div className="pt-4 shrink-0">
                                <button 
                                    onClick={() => { setShowPreviewModal(false); setShowTestModal(true) }} 
                                    className="w-full py-3.5 bg-secondary text-secondary-foreground font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Mail size={16} /> 
                                    Enviar Teste
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showSaveTemplateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border">
                        <h3 className="text-lg font-bold mb-4">Salvar como Template</h3>
                        <p className="text-sm text-muted-foreground mb-4">Dê um nome para este template.</p>
                        <input type="text" placeholder="Ex: Convite de Natal..." className="w-full bg-muted border border-border rounded-xl px-4 py-3 mb-6 outline-none focus:ring-2 focus:ring-secondary/50" autoFocus value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} />
                        <div className="flex gap-3">
                            <button onClick={() => setShowSaveTemplateModal(false)} className="flex-1 py-3 border border-border rounded-xl font-bold hover:bg-muted transition-all text-foreground">Cancelar</button>
                            <button onClick={handleSaveTemplate} disabled={saving || !newTemplateName.trim()} className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 text-foreground">Salvar Template</button>
                        </div>
                    </div>
                </div>
            )}

            {showTestModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center text-secondary"><Mail size={20} /></div>
                            <h3 className="text-lg font-bold">Disparo de Teste</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">Enviaremos uma versão de teste para você.</p>
                        <div className="space-y-2 mb-8">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail de Destino</label>
                            <input type="email" placeholder="seu@email.com" className="w-full bg-muted border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary/50" autoFocus value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowTestModal(false)} className="flex-1 py-3 border border-border rounded-xl font-bold hover:bg-muted transition-all text-foreground">Cancelar</button>
                            <button onClick={handleSendTest} disabled={sendingTest || !testRecipient.trim()} className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 text-foreground">
                                {sendingTest && <Loader2 className="w-4 h-4 animate-spin" />} Enviar Agora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function getDefaultSubject(template: string): string {
    switch(template) {
        case 'invitation': return 'Você foi convidado para participar da {{tenantName}}'
        case 'confirmation': return 'Confirme seu cadastro na {{tenantName}}'
        case 'suspension': return 'Aviso: Suspensão Temporária de Acesso - {{tenantName}}'
        default: return ''
    }
}

function getDefaultBody(template: string): string {
    switch(template) {
        case 'invitation': return '## Você foi convidado!\n\nOlá, você foi convidado para colaborar na equipe da **{{tenantName}}** no CRM LAX.\n\nClique no botão abaixo para aceitar o convite e configurar sua conta:\n\n[Aceitar Convite]({{link}})#button'
        case 'confirmation': return '## Bem-vindo(a)!\n\nFicamos felizes em ter você na equipe da **{{tenantName}}**.\n\nPor favor, confirme seu e-mail clicando no botão abaixo para ativar sua conta:\n\n[Confirmar E-mail]({{link}})#button'
        case 'suspension': return '## Acesso Suspenso\n\nInformamos que o acesso da empresa **{{tenantName}}** ao CRM LAX foi suspenso temporariamente por decisão administrativa.\n\nContate o suporte: contato@laxperience.online'
        default: return ''
    }
}

function getDefaultSignature(): string {
    return 'Atenciosamente,\nSua Equipe'
}
