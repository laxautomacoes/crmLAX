'use client'

import { useState, useEffect } from 'react'
import { Image as ImageIcon, Upload, Loader2, Save, Trash2, Mail, Type, Palette, Eye, FileText, PenTool, Copy, Plus, Check, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/app/_actions/profile'
import { updateTenantEmailSettings, getEmailTemplates, saveEmailTemplate, deleteEmailTemplate } from '@/app/_actions/tenant'
import { toast } from 'sonner'
import { replacePlaceholders, markdownToEmailHtml, getInvitationEmailTemplate, getConfirmationEmailTemplate, getSuspensionEmailTemplate } from '@/lib/emails/templates'
import { MediaUpload } from '@/components/shared/MediaUpload'
import { FormRichTextarea } from '@/components/shared/forms/FormRichTextarea'
import { useRef } from 'react'

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
    const [savedTemplates, setSavedTemplates] = useState<any[]>([])
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
    const [newTemplateName, setNewTemplateName] = useState('')

    // Refs para os textareas
    const bodyRef = useRef<HTMLTextAreaElement>(null)
    const signatureRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
                    .select('email_settings, name')
                    .eq('id', userProfile.tenant_id)
                    .single()

                if (tenant?.email_settings) {
                    setSettings(tenant.email_settings as EmailSettings)
                }

                // Carregar templates da biblioteca
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

            setSettings(prev => ({ ...prev, logo_url: publicUrl }))
            toast.success('Logo de e-mail carregado!')
        } catch (error: any) {
            console.error('Error uploading logo:', error)
            toast.error(`Erro ao carregar logo: ${error.message}`)
        } finally {
            setIsUploading(false)
            e.target.value = ''
        }
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
            const current = prev.attachments?.[type] || []
            const updated = [...current]
            updated.splice(index, 1)
            
            return {
                ...prev,
                attachments: {
                    ...prev.attachments,
                    [type]: updated
                }
            }
        })
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Link copiado para a área de transferência!')
    }

    const onToolbarUpload = async (file: File) => {
        if (!profile?.tenant_id) return
        
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `email-content-${Date.now()}.${fileExt}`
            const filePath = `${profile.tenant_id}/${fileName}`
            const bucket = file.type.startsWith('image/') ? 'email-logos' : 'properties' // Usando buckets existentes
            
            const supabase = createClient()
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath)

            // Atualiza o estado de attachments para que a galeria reflita o novo arquivo
            const type = file.type.startsWith('image/') ? 'images' : 'documents'
            const newAttachment = type === 'images' ? publicUrl : { name: file.name, url: publicUrl }
            
            setSettings(prev => ({
                ...prev,
                attachments: {
                    ...prev.attachments,
                    [type]: [...(prev.attachments?.[type] || []), newAttachment]
                }
            }))

            toast.success('Arquivo carregado com sucesso!')
            return publicUrl
        } catch (error: any) {
            console.error('Error in toolbar upload:', error)
            toast.error('Erro ao carregar arquivo na toolbar')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-foreground/20" />
            </div>
        )
    }

    // Mock data para o preview
    const previewData = {
        nome: "João Silva",
        link: "https://crmlax.com/register?token=test",
        tenantName: profile?.tenants?.name || 'Sua Imobiliária'
    }

    const currentTemplate = settings.templates?.[activeTemplate] || {}
    const bodyMarkdown = currentTemplate.body || getDefaultBody(activeTemplate)
    
    // Determina qual função de template usar para o preview
    const getPreviewTemplateHtml = () => {
        const config = {
            ...settings,
            signature_html: settings.signature_html || getDefaultSignature(),
            templates: {
                [activeTemplate]: { ...currentTemplate, body: bodyMarkdown }
            }
        }

        switch(activeTemplate) {
            case 'confirmation':
                return getConfirmationEmailTemplate(previewData.link, previewData.tenantName, config).html
            case 'suspension':
                return getSuspensionEmailTemplate(previewData.tenantName, config).html
            default:
                return getInvitationEmailTemplate(previewData.link, previewData.tenantName, config).html
        }
    }

    const previewHtml = getPreviewTemplateHtml()

    return (
        <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 min-w-0 space-y-6">
                <h4 className="text-sm font-black text-foreground uppercase tracking-widest ml-1 mb-3">
                    Identidade Visual
                </h4>
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Upload */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-foreground ml-1">Logo Empresa</label>
                            <div className="relative aspect-[5/2] rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-background hover:bg-muted/10 transition-colors group shadow-sm">
                                {settings.logo_url ? (
                                    <img src={settings.logo_url} alt="Email Logo" className="max-h-full object-contain p-2" />
                                ) : (
                                    <div className="text-center">
                                        <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                                        <span className="text-[10px] text-muted-foreground">Recomendado: 250x50px</span>
                                    </div>
                                )}
                                <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:bg-black/40 group-hover:opacity-100 transition-all">
                                    <div className="text-white text-center">
                                        {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                </label>
                            </div>
                        </div>

                        {/* Cor Primária */}
                        <div className="space-y-3 md:ml-24">
                            <label className="text-sm font-bold text-foreground ml-1 block">Cor Destaque</label>
                            <div className="flex items-center gap-3">
                                <div className="relative group overflow-hidden rounded-xl h-12 w-12 border border-border shadow-sm">
                                    <input 
                                        type="color" 
                                        value={settings.primary_color || '#FFE600'} 
                                        onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                                        className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] cursor-pointer border-none appearance-none bg-transparent transition-transform hover:scale-110 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                                    />
                                    <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-inset ring-black/10" />
                                </div>
                                <input 
                                    type="text" 
                                    value={settings.primary_color || '#FFE600'} 
                                    onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                                    className="w-32 h-12 bg-background border border-border rounded-xl px-4 text-sm font-mono focus:ring-2 focus:ring-secondary/50 outline-none shadow-sm transition-all text-center"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1 mb-3">
                        <h4 className="text-sm font-black text-foreground uppercase tracking-widest">
                            Conteúdo
                        </h4>
                        
                        <div className="relative" ref={dropdownRef}>
                            <button 
                                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                className="bg-background border border-border rounded-xl px-4 py-2 text-xs font-bold outline-none hover:bg-muted/30 transition-all shadow-sm flex items-center gap-2 min-w-[180px] justify-between"
                            >
                                <span className="flex items-center gap-2">
                                    <Mail size={14} className="text-muted-foreground" />
                                    {activeTemplate === 'invitation' ? 'Convite Colaborador' : activeTemplate === 'confirmation' ? 'Confirmação de E-mail' : 'Aviso de Suspensão'}
                                </span>
                                <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showTypeDropdown && (
                                <div className="absolute right-0 mt-2 w-full min-w-[200px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {[
                                        { id: 'invitation', label: 'Convite Colaborador' },
                                        { id: 'confirmation', label: 'Confirmação de E-mail' },
                                        { id: 'suspension', label: 'Aviso de Suspensão' }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => {
                                                setActiveTemplate(type.id as any)
                                                setShowTypeDropdown(false)
                                            }}
                                            className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-muted/50 transition-colors flex items-center gap-3 group"
                                        >
                                            <div className="w-4 flex-shrink-0">
                                                {activeTemplate === type.id && <Check size={14} className="text-foreground" />}
                                            </div>
                                            <span className={activeTemplate === type.id ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}>
                                                {type.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">

                        <div className="space-y-3">
                            <div className="flex items-center justify-between ml-1">
                                <h4 className="text-sm font-black text-foreground uppercase tracking-widest">
                                    Biblioteca: {activeTemplate === 'invitation' ? 'Convites' : activeTemplate === 'confirmation' ? 'Confirmações' : 'Suspensões'}
                                </h4>
                                <button 
                                    onClick={() => setShowSaveTemplateModal(true)}
                                    className="text-[10px] font-black text-foreground uppercase tracking-widest hover:underline flex items-center gap-1"
                                >
                                    <Plus size={10} />
                                    Salvar Novo
                                </button>
                            </div>
                            <div className="bg-background border border-border rounded-xl p-4 space-y-3 shadow-inner">
                                {savedTemplates.filter(t => t.type === activeTemplate).length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {savedTemplates.filter(t => t.type === activeTemplate).map((t) => (
                                            <div key={t.id} className="group relative">
                                                <button 
                                                    onClick={() => handleLoadTemplate(t)}
                                                    className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold hover:border-foreground hover:text-foreground transition-all shadow-sm active:scale-95"
                                                >
                                                    {t.name}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteTemplate(t.id)}
                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground italic font-medium">Nenhum template salvo nesta categoria.</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-black text-foreground uppercase tracking-widest ml-1">Assunto</h4>
                            <input 
                                type="text"
                                shadow-sm
                                value={currentTemplate.subject || getDefaultSubject(activeTemplate)}
                                onChange={(e) => updateTemplate('subject', e.target.value)}
                                placeholder="Assunto do e-mail"
                                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-secondary/50 outline-none transition-all text-foreground"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-foreground uppercase tracking-widest">
                                    Corpo | Descrição
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Variáveis:</span>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => copyToClipboard('{{nome}}')}
                                            className="text-[10px] text-foreground font-black bg-muted hover:bg-secondary/20 px-2 py-0.5 rounded border border-border transition-colors outline-none"
                                            title="Clique para copiar"
                                        >
                                            {`{{nome}}`}
                                        </button>
                                        <button 
                                            onClick={() => copyToClipboard('{{link}}')}
                                            className="text-[10px] text-foreground font-black bg-muted hover:bg-secondary/20 px-2 py-0.5 rounded border border-border transition-colors outline-none"
                                            title="Clique para copiar"
                                        >
                                            {`{{link}}`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <FormRichTextarea 
                                value={currentTemplate.body || getDefaultBody(activeTemplate)}
                                onChange={(val) => updateTemplate('body', val)}
                                placeholder="Descreva o conteúdo do e-mail..."
                                className="rich-text-editor-body"
                                attachments={settings.attachments}
                                onUpload={onToolbarUpload}
                            />
                        </div>

                        <div className="space-y-3 pt-6 border-t border-border/50">
                            <h4 className="text-sm font-black text-foreground uppercase tracking-widest">
                                Assinatura
                            </h4>
                            <FormRichTextarea 
                                value={settings.signature_html || getDefaultSignature()}
                                onChange={(val) => setSettings(prev => ({ ...prev, signature_html: val }))}
                                placeholder="Atenciosamente, Sua Equipe"
                                className="rich-text-editor-signature"
                                attachments={settings.attachments}
                                onUpload={onToolbarUpload}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-black text-foreground uppercase tracking-widest ml-1">
                        Galeria
                    </h4>
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                        {profile?.tenant_id && (
                            <div className="space-y-6">
                                <MediaUpload 
                                    bucket="email-logos"
                                    pathPrefix={`${profile.tenant_id}/assets`}
                                    images={settings.attachments?.images || []}
                                    videos={settings.attachments?.videos || []}
                                    documents={settings.attachments?.documents || []}
                                    onUpload={handleMediaUpload}
                                    onRemove={handleMediaRemove}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-4 bg-secondary text-secondary-foreground font-bold rounded-2xl hover:opacity-90 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-secondary/10"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        Salvar Configurações
                    </button>
                </div>
            </div>

            {/* Live Preview */}
            <div className="md:w-[450px] md:sticky md:top-8 h-fit flex items-start py-8">
                <div className="w-full bg-card rounded-3xl shadow-2xl border border-border overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
                        {/* Fake Header/Envelope */}
                        <div className="bg-muted/50 border-b border-border p-6">
                            <h4 className="text-sm font-bold text-foreground">
                                {currentTemplate.subject || getDefaultSubject(activeTemplate)}
                            </h4>
                        </div>

                        <div className="w-full h-[600px] bg-white">
                            <iframe 
                                srcDoc={previewHtml}
                                className="w-full h-full border-none"
                                title="Email Preview"
                            />
                        </div>
                        <div className="p-6 bg-muted/30 border-t border-border text-center">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                {settings.footer_text || 'Enviado via CRM LAX — A inteligência de dados para sua imobiliária.'}
                            </p>
                        </div>
                    </div>
                </div>
            {showSaveTemplateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold mb-4">Salvar como Template</h3>
                        <p className="text-sm text-muted-foreground mb-4">Dê um nome para este template para encontrá-lo depois.</p>
                        <input 
                            type="text"
                            placeholder="Ex: Convite de Natal, Boas-vindas Verão..."
                            className="w-full bg-muted border border-border rounded-xl px-4 py-3 mb-6 outline-none focus:ring-2 focus:ring-secondary/50"
                            autoFocus
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowSaveTemplateModal(false)}
                                className="flex-1 py-3 border border-border rounded-xl font-bold hover:bg-muted transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveTemplate}
                                disabled={saving || !newTemplateName.trim()}
                                className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                Salvar Template
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
        case 'invitation':
            return 'Você foi convidado para participar da {{tenantName}}';
        case 'confirmation':
            return 'Confirme seu cadastro na {{tenantName}}';
        case 'suspension':
            return 'Aviso: Suspensão Temporária de Acesso - {{tenantName}}';
        default:
            return '';
    }
}

function getDefaultBody(template: string): string {
    switch(template) {
        case 'invitation':
            return '## Você foi convidado!\n\nOlá, você foi convidado para colaborar na equipe da **{{tenantName}}** no CRM LAX.\n\nClique no botão abaixo para aceitar o convite e configurar sua conta:\n\n[Aceitar Convite]({{link}})#button';
        case 'confirmation':
            return '## Bem-vindo(a)!\n\nFicamos felizes em ter você na equipe da **{{tenantName}}**.\n\nPor favor, confirme seu e-mail clicando no botão abaixo para ativar sua conta:\n\n[Confirmar E-mail]({{link}})#button';
        case 'suspension':
            return '## Acesso Suspenso\n\nInformamos que o acesso da empresa **{{tenantName}}** ao CRM LAX foi suspenso temporariamente por decision administrativa.\n\nContate o suporte: contato@laxperience.online';
        default:
            return '';
    }
}

function getDefaultSignature(): string {
    return 'Atenciosamente,\nSua Equipe';
}
