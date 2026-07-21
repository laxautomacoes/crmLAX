'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/shared/Modal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { formatPhone } from '@/lib/utils/phone'
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormActionSelect } from '@/components/shared/forms/FormActionSelect'
import type { FormActionSelectOption } from '@/components/shared/forms/FormActionSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { MediaUpload } from '@/components/shared/MediaUpload'
import { toast } from 'sonner'
import { createLead, updateLead, getLeadSources, createLeadSource, getLeadCampaigns, createLeadCampaign, updateLeadSource, deleteLeadSource, updateLeadCampaign, deleteLeadCampaign, getLeadDetails } from '@/app/_actions/leads'
import { getBrokers, getProfile } from '@/app/_actions/profile'
import { getNotesByLeadId, createNote, deleteNote, updateNote } from '@/app/_actions/notes'
import { PropertyAutocomplete } from '@/components/dashboard/properties/PropertyAutocomplete'
import { getPartners, createPartner } from '@/app/_actions/partners'
import { PartnerQuickModal } from '@/components/dashboard/shared/PartnerQuickModal'
import { MessageSquare, X, Sparkles, User, FileText, PenLine, ChevronRight, ChevronDown, Upload, MessageCircle, Trash2, MoreVertical, Loader2, AlertTriangle, Building2 } from 'lucide-react'
import { LeadWhatsAppConversation } from './LeadWhatsAppConversation'
import { sendWhatsAppMessage, getWhatsAppChat, sendWhatsAppMedia, refreshInstanceStatus, checkInstanceStatus } from '@/app/_actions/whatsapp'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from './PipelineBoard'
import {
    getLeadEnrollments,
    getFollowupSequences,
    enrollLeadInSequence,
    cancelEnrollment
} from '@/app/_actions/followup'

interface Broker {
    id: string
    full_name: string
    role?: string
}

interface NamedOption {
    id: string
    name: string
}

interface SelectedProperty {
    id: string
    title: string
}

interface ChatMessage {
    fromMe?: boolean
    message?: string
    text?: string
    mediaType?: 'image' | 'video' | 'audio' | 'document'
    mediaUrl?: string
    mediaName?: string
}

type EditableLead = Partial<Lead> & {
    id?: string
    lead_source?: string
    campaign?: string
    property_id?: string
    property_interest?: string
    date?: string | null
    avatar_url?: string | null
}

const LEAD_MODAL_INITIAL_SOURCES = ['Meta', 'Google', 'Portal', 'Indicação', 'Carteira', 'Parceria'] as const

export type LeadCreationMethod = 'manual' | 'import_bulk' | null

interface LeadModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string
    stages: Array<{ id: string; name: string }>
    onSuccess: () => void
    editingLead?: EditableLead // Para edição
    onSelectImportBulk?: () => void
    onMakeProposal?: (contactId: string, leadId: string) => void
}

interface NoteActionsDropdownProps {
    onEdit: () => void
    onDelete: () => void
}

function NoteActionsDropdown({ onEdit, onDelete }: NoteActionsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down')
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isOpen && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            if (spaceBelow < 120) {
                setOpenDirection('up')
            } else {
                setOpenDirection('down')
            }
        }
        setIsOpen(o => !o)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={handleToggle}
                className="p-1 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                title="Ações"
            >
                <MoreVertical size={14} />
            </button>
            {isOpen && (
                <div className={`absolute right-0 w-32 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-30 ${openDirection === 'up' ? 'bottom-full mb-1' : 'mt-1'
                    }`}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsOpen(false)
                            onEdit()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors text-left"
                    >
                        <PenLine size={12} className="text-blue-500" />
                        <span>Editar</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsOpen(false)
                            onDelete()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-red-500/10 transition-colors text-left"
                    >
                        <Trash2 size={12} className="text-red-500" />
                        <span>Excluir</span>
                    </button>
                </div>
            )}
        </div>
    )
}

export function LeadModal({
    isOpen,
    onClose,
    tenantId,
    stages,
    onSuccess,
    editingLead,
    onSelectImportBulk,
    onMakeProposal
}: LeadModalProps) {
    const router = useRouter()
    const [creationMethod, setCreationMethod] = useState<LeadCreationMethod>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isAvatarZoomed, setIsAvatarZoomed] = useState(false)
    const [brokers, setBrokers] = useState<Broker[]>([])
    const [whatsappChat, setWhatsappChat] = useState<any[]>([])
    const [instanceStatus, setInstanceStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading')
    const [leadNotes, setLeadNotes] = useState<any[]>([])
    const [newNoteContent, setNewNoteContent] = useState('')
    const [isSavingNote, setIsSavingNote] = useState(false)
    const [showNotesHistory, setShowNotesHistory] = useState(true)
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
    const [editingNoteText, setEditingNoteText] = useState('')
    const [isSavingEditedNote, setIsSavingEditedNote] = useState(false)
    const [activeTab, setActiveTab] = useState<'info' | 'whatsapp'>('info')
    
    // States para controle de visitas nas notas
    const [isVisit, setIsVisit] = useState(false)
    const [visitNumber, setVisitNumber] = useState<number>(1)
    const [isRegisteredProperty, setIsRegisteredProperty] = useState(true)
    const [selectedVisitProperty, setSelectedVisitProperty] = useState<any>(null)
    const [unregisteredVisitProperty, setUnregisteredVisitProperty] = useState('')

    const toggleNoteExpanded = (noteId: string) => {
        setExpandedNotes(prev => ({
            ...prev,
            [noteId]: !prev[noteId]
        }))
    }

    const formatNoteDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return dateStr
        }
    }

    const getFirstSentence = (text: string) => {
        if (!text) return ''
        const firstLine = text.split('\n')[0].trim()
        return firstLine || 'Nota...'
    }

    const loadLeadNotes = useCallback(async () => {
        if (!editingLead?.id) return
        const res = await getNotesByLeadId(editingLead.id)
        if (res.success && res.data) {
            setLeadNotes(res.data)
        }
    }, [editingLead?.id])

    const loadFollowupData = useCallback(async () => {
        if (!tenantId) return
        try {
            const seqRes = await getFollowupSequences()
            if (seqRes.success && seqRes.data) {
                setFollowupSequences(seqRes.data)
            }
            if (editingLead?.id) {
                const enrollRes = await getLeadEnrollments(editingLead.id)
                if (enrollRes.success && enrollRes.data) {
                    setLeadEnrollments(enrollRes.data)
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados de follow-up:', error)
        }
    }, [tenantId, editingLead?.id])

    const handleEnrollInSequence = async () => {
        if (!selectedSequenceId || !editingLead?.id) return
        setIsProcessingFollowup(true)
        try {
            const res = await enrollLeadInSequence(editingLead.id, selectedSequenceId)
            if (res.success) {
                const followupStage = stages.find(s => s.name.toLowerCase().includes('follow'))
                
                if (followupStage && leadData.stage_id !== followupStage.id) {
                    const updateRes = await updateLead(tenantId, editingLead.id, { stage_id: followupStage.id })
                    if (updateRes.success) {
                        setLeadData(prev => ({ ...prev, stage_id: followupStage.id }))
                        toast.success('Sequência iniciada! O lead foi movido para a etapa de Follow-up.')
                        onSuccess() // To refresh the Kanban board
                    } else {
                        toast.success('Lead inscrito na sequência com sucesso!')
                    }
                } else {
                    toast.success('Lead inscrito na sequência com sucesso!')
                }
                
                setSelectedSequenceId('')
                loadFollowupData()
            } else {
                toast.error('Erro ao inscrever lead: ' + res.error)
            }
        } catch (error) {
            console.error('Erro ao inscrever lead:', error)
            toast.error('Ocorreu um erro ao inscrever o lead.')
        } finally {
            setIsProcessingFollowup(false)
        }
    }

    const handleCancelEnrollment = async (enrollmentId: string) => {
        setIsProcessingFollowup(true)
        try {
            const res = await cancelEnrollment(enrollmentId)
            if (res.success) {
                toast.success('Inscrição cancelada com sucesso!')
                loadFollowupData()
            } else {
                toast.error('Erro ao cancelar inscrição: ' + res.error)
            }
        } catch (error) {
            console.error('Erro ao cancelar inscrição:', error)
            toast.error('Ocorreu um erro ao cancelar a inscrição.')
        } finally {
            setIsProcessingFollowup(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            loadFollowupData()
            setSelectedSequenceId('')
        } else {
            setLeadEnrollments([])
            setFollowupSequences([])
        }
    }, [isOpen, loadFollowupData])


    useEffect(() => {
        if (isOpen) {
            setActiveTab('info')
            if (editingLead?.id) {
                loadLeadNotes()
            }
        } else {
            setLeadNotes([])
        }
    }, [isOpen, editingLead?.id, loadLeadNotes])

    const handleAddNote = async () => {
        const contentStr = newNoteContent.trim()
        const isNoteEmpty = !contentStr
        if ((isNoteEmpty && !isVisit) || !editingLead?.id || !tenantId) return
        setIsSavingNote(true)
        try {
            const defaultVisitText = isRegisteredProperty 
                ? `Visita ao imóvel cadastrada.` 
                : `Visita ao imóvel cadastrada: ${unregisteredVisitProperty.trim()}`

            const noteData: any = {
                content: contentStr || defaultVisitText,
                lead_id: editingLead.id,
                contact_id: editingLead.contact_id || null,
                date: new Date().toISOString().split('T')[0],
                is_visit: isVisit
            }

            if (isVisit) {
                noteData.visit_number = visitNumber
                if (isRegisteredProperty && selectedVisitProperty) {
                    noteData.property_id = selectedVisitProperty.id
                } else if (!isRegisteredProperty && unregisteredVisitProperty.trim()) {
                    noteData.visit_unregistered_property = unregisteredVisitProperty.trim()
                }
            }

            const res = await createNote(tenantId, noteData)
            if (res.success) {
                toast.success(isVisit ? 'Visita registrada com sucesso!' : 'Nota adicionada com sucesso!')
                setNewNoteContent('')
                setIsVisit(false)
                setVisitNumber(1)
                setIsRegisteredProperty(true)
                setSelectedVisitProperty(null)
                setUnregisteredVisitProperty('')
                loadLeadNotes()
            } else {
                toast.error('Erro ao adicionar nota: ' + res.error)
            }
        } catch (error) {
            console.error('Erro ao adicionar nota:', error)
            toast.error('Ocorreu um erro ao salvar a nota')
        } finally {
            setIsSavingNote(false)
        }
    }

    const handleDeleteNote = (noteId: string) => {
        setNoteToDelete(noteId)
    }

    const executeDeleteNote = async (noteId: string) => {
        if (noteId === 'legacy') {
            try {
                const res = await updateLead(tenantId, editingLead!.id!, { notes: '' })
                if (res.success) {
                    toast.success('Observações do lead excluídas!')
                    setLeadData(prev => ({ ...prev, notes: '' }))
                    if (editingLead) {
                        editingLead.notes = ''
                    }
                    onSuccess()
                } else {
                    toast.error('Erro ao excluir observações: ' + res.error)
                }
            } catch (error) {
                console.error('Erro ao excluir observações:', error)
                toast.error('Ocorreu um erro ao excluir as observações')
            }
            return
        }

        try {
            const res = await deleteNote(noteId)
            if (res.success) {
                toast.success('Nota excluída com sucesso!')
                loadLeadNotes()
            } else {
                toast.error('Erro ao excluir nota: ' + res.error)
            }
        } catch (error) {
            console.error('Erro ao excluir nota:', error)
            toast.error('Ocorreu um erro ao excluir a nota')
        }
    }

    const handleSaveEditedNote = async (noteId: string) => {
        if (!editingNoteText.trim()) return
        setIsSavingEditedNote(true)
        try {
            if (noteId === 'legacy') {
                const res = await updateLead(tenantId, editingLead!.id!, { notes: editingNoteText.trim() })
                if (res.success) {
                    toast.success('Observações do lead atualizadas!')
                    setLeadData(prev => ({ ...prev, notes: editingNoteText.trim() }))
                    if (editingLead) {
                        editingLead.notes = editingNoteText.trim()
                    }
                    setEditingNoteId(null)
                    onSuccess()
                } else {
                    toast.error('Erro ao atualizar observações: ' + res.error)
                }
            } else {
                const res = await updateNote(noteId, { content: editingNoteText.trim() })
                if (res.success) {
                    toast.success('Nota atualizada com sucesso!')
                    setEditingNoteId(null)
                    loadLeadNotes()
                } else {
                    toast.error('Erro ao atualizar nota: ' + res.error)
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar nota:', error)
            toast.error('Ocorreu um erro ao atualizar a nota')
        } finally {
            setIsSavingEditedNote(false)
        }
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsAvatarZoomed(false)
            }
        }
        if (isAvatarZoomed) {
            window.addEventListener('keydown', handleKeyDown)
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isAvatarZoomed])
    const [userRole, setUserRole] = useState<string>('user')
    const [sources, setSources] = useState<string[]>([])
    const [sourcesRaw, setSourcesRaw] = useState<NamedOption[]>([])
    const [campaigns, setCampaigns] = useState<string[]>([])
    const [campaignsRaw, setCampaignsRaw] = useState<NamedOption[]>([])
    const [isAddingSource, setIsAddingSource] = useState(false)
    const [isAddingCampaign, setIsAddingCampaign] = useState(false)
    const [newSource, setNewSource] = useState('')
    const [newCampaign, setNewCampaign] = useState('')
    const [editingSourceOption, setEditingSourceOption] = useState<FormActionSelectOption | null>(null)
    const [editingCampaignOption, setEditingCampaignOption] = useState<FormActionSelectOption | null>(null)
    const [deletingSourceOption, setDeletingSourceOption] = useState<FormActionSelectOption | null>(null)
    const [deletingCampaignOption, setDeletingCampaignOption] = useState<FormActionSelectOption | null>(null)
    const [editName, setEditName] = useState('')
    const [partners, setPartners] = useState<any[]>([])
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)

    const [followupSequences, setFollowupSequences] = useState<any[]>([])
    const [leadEnrollments, setLeadEnrollments] = useState<any[]>([])
    const [selectedSequenceId, setSelectedSequenceId] = useState<string>('')
    const [isProcessingFollowup, setIsProcessingFollowup] = useState(false)
    const [enrollmentToCancel, setEnrollmentToCancel] = useState<string | null>(null)
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

    const [leadData, setLeadData] = useState({
        name: '',
        phone: '',
        email: '',
        interest: '',
        lead_source: '',
        campaign: '',
        property_id: '',
        property_interest: '',
        selectedProperty: null as SelectedProperty | null,
        date: new Date().toISOString().split('T')[0],
        value: '',
        notes: '',
        stage_id: '',
        assigned_to: '',
        images: [] as string[],
        videos: [] as string[],
        documents: [] as { name: string; url: string }[],
        partner_id: '',
        partner_split: '',
        partner_role: ''
    })

    useEffect(() => {
        async function fetchPartners() {
            if (isOpen && tenantId) {
                const res = await getPartners(tenantId)
                if (res.success && res.data) {
                    setPartners(res.data)
                }
            }
        }
        fetchPartners()
    }, [isOpen, tenantId])

    const handlePartnerCreated = async (newPartner: any) => {
        setPartners(prev => [...prev, newPartner].sort((a, b) => a.name.localeCompare(b.name)))
        
        let updatedCampaign = leadData.campaign
        if (leadData.lead_source.toLowerCase().includes('parceria')) {
            updatedCampaign = newPartner.name
            if (!campaigns.includes(newPartner.name)) {
                setCampaigns(prev => [...prev, newPartner.name])
                await createLeadCampaign(tenantId, leadData.lead_source, newPartner.name)
                const campRes = await getLeadCampaigns(tenantId, leadData.lead_source)
                if (campRes.success) {
                    setCampaignsRaw((campRes.data || []) as NamedOption[])
                }
            }
        }

        setLeadData(prev => ({
            ...prev,
            partner_id: newPartner.id,
            campaign: updatedCampaign
        }))
    }


    // Quando o modal abre para novo lead, reseta o método de criação
    useEffect(() => {
        if (isOpen && !editingLead) {
            setCreationMethod(null)
        }
    }, [isOpen, editingLead])

    const handleSendWhatsAppMessage = async (text: string) => {
        if (!editingLead?.phone) {
            toast.error('Lead não possui telefone cadastrado');
            return;
        }
        const res = await sendWhatsAppMessage(editingLead.phone, text, editingLead.id);
        if (res.error) {
            throw new Error(res.error);
        }

        const newMsg = {
            id: Math.random().toString(),
            text: text,
            fromMe: true,
            timestamp: new Date().toISOString()
        };

        // Atualizar de forma reativa o chat local
        setWhatsappChat(prev => [...prev, newMsg]);

        // Atualizar prop na memória
        if (editingLead) {
            (editingLead as any).whatsapp_chat = [...((editingLead as any).whatsapp_chat || []), newMsg];
        }
    }

    const handleSendWhatsAppMedia = useCallback(async (file: File) => {
        if (!editingLead?.phone) {
            throw new Error('Lead não possui telefone cadastrado');
        }

        const supabase = createClient();
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `whatsapp-media/${fileName}`;

        // Upload para Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('crm-attachments')
            .upload(filePath, file, { cacheControl: '3600' });

        if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
            .from('crm-attachments')
            .getPublicUrl(filePath);

        // Determinar tipo da mídia
        let mediaType: 'image' | 'video' | 'document' | 'audio' = 'document';
        if (file.type.startsWith('image/')) mediaType = 'image';
        else if (file.type.startsWith('video/')) mediaType = 'video';
        else if (file.type.startsWith('audio/')) mediaType = 'audio';

        const res = await sendWhatsAppMedia(
            editingLead.phone,
            publicUrl,
            mediaType,
            file.name,
            undefined,
            editingLead.id
        );

        if (res.error) throw new Error(res.error);

        // Atualizar chat local com a mídia enviada
        const newMsg = {
            id: `local-media-${Date.now()}`,
            text: '',
            fromMe: true,
            timestamp: new Date().toISOString(),
            mediaType,
            mediaUrl: publicUrl,
            mediaName: file.name
        };
        setWhatsappChat(prev => [...prev, newMsg]);
    }, [editingLead])

    const firstStageId = stages[0]?.id ?? ''

    useEffect(() => {
        async function fetchContext() {
            const { profile } = await getProfile()
            if (profile) {
                setUserRole(profile.role)
                if (profile.role === 'admin' || profile.role === 'superadmin') {
                    const res = await getBrokers(tenantId)
                    if (res.success) {
                        setBrokers(res.data || [])
                    }
                }
            }

            const sourcesRes = await getLeadSources(tenantId)
            if (sourcesRes.success) {
                // Mesclar iniciais com as do banco
                const dbSourcesData = (sourcesRes.data || []) as NamedOption[]
                setSourcesRaw(dbSourcesData)
                const dbSources = dbSourcesData.map((s) => s.name)
                const merged = Array.from(new Set([...LEAD_MODAL_INITIAL_SOURCES, ...dbSources]))
                setSources(merged)
            } else {
                setSourcesRaw([])
                setSources([...LEAD_MODAL_INITIAL_SOURCES])
            }
        }
        if (isOpen) fetchContext()
    }, [isOpen, tenantId])

    useEffect(() => {
        async function fetchCampaigns() {
            if (leadData.lead_source) {
                const res = await getLeadCampaigns(tenantId, leadData.lead_source)
                if (res.success) {
                    const dbCampaignsData = (res.data || []) as NamedOption[]
                    setCampaignsRaw(dbCampaignsData)
                    setCampaigns(dbCampaignsData.map((c) => c.name))
                } else {
                    setCampaignsRaw([])
                    setCampaigns([])
                }
            } else {
                setCampaignsRaw([])
                setCampaigns([])
            }
        }
        fetchCampaigns()
    }, [leadData.lead_source, tenantId])

    useEffect(() => {
        if (!isOpen) return;

        if (editingLead) {
            setWhatsappChat((editingLead as any).whatsapp_chat || [])
            setLeadData({
                name: editingLead.name || '',
                phone: editingLead.phone ? formatPhone(editingLead.phone) : '',
                email: editingLead.email || '',
                interest: editingLead.interest || '',
                lead_source: editingLead.lead_source || '',
                campaign: editingLead.campaign || '',
                property_id: editingLead.property_id || '',
                property_interest: editingLead.property_interest || '',
                selectedProperty: editingLead.property_id ? { id: editingLead.property_id, title: editingLead.interest || '' } : null,
                date: editingLead.date || new Date().toISOString().split('T')[0],
                value: editingLead.value ? formatCurrencyBRL(Math.round(Number(editingLead.value) * 100).toString()) : '',
                notes: editingLead.notes || '',
                stage_id: editingLead.status || firstStageId,
                assigned_to: editingLead.assigned_to || '',
                images: Array.isArray(editingLead.images) ? editingLead.images : [],
                videos: Array.isArray(editingLead.videos) ? editingLead.videos : [],
                documents: Array.isArray(editingLead.documents) ? editingLead.documents : [],
                partner_id: (editingLead as any).partner_id || '',
                partner_split: (editingLead as any).partner_split ? (editingLead as any).partner_split.toString() : '',
                partner_role: (editingLead as any).partner_role || ''
            })

            // Carrega os dados pesados (notes, images, videos, documents, chat) sob demanda
            const fetchHeavyData = async () => {
                if (!editingLead.id) return;
                const result = await getLeadDetails(editingLead.id);
                if (result.success && result.data) {
                    setWhatsappChat(result.data.whatsapp_chat || []);
                    setLeadData(prev => ({
                        ...prev,
                        notes: result.data.notes || prev.notes,
                        images: Array.isArray(result.data.images) ? result.data.images : prev.images,
                        videos: Array.isArray(result.data.videos) ? result.data.videos : prev.videos,
                        documents: Array.isArray(result.data.documents) ? result.data.documents : prev.documents,
                    }));
                }
            };
            fetchHeavyData();
        } else {
            setWhatsappChat([])
            setLeadData({
                name: '',
                phone: '',
                email: '',
                interest: '',
                lead_source: '',
                campaign: '',
                property_id: '',
                property_interest: '',
                selectedProperty: null,
                date: new Date().toISOString().split('T')[0],
                value: '',
                notes: '',
                stage_id: firstStageId,
                assigned_to: '',
                images: [],
                videos: [],
                documents: [],
                partner_id: '',
                partner_split: '',
                partner_role: ''
            })
        }
    }, [editingLead, isOpen, firstStageId])

    // Polling de atualização do histórico do chat — apenas quando a aba WhatsApp está ativa
    useEffect(() => {
        if (!isOpen || !editingLead?.id || activeTab !== 'whatsapp') return;

        const interval = setInterval(async () => {
            const { chat, error } = await getWhatsAppChat(editingLead.id!);
            if (!error && chat) {
                // Atualiza de forma reativa apenas se o chat local diferir do banco
                setWhatsappChat(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(chat)) {
                        return chat;
                    }
                    return prev;
                });
            }
        }, 8000); // Executa a cada 8 segundos (apenas na aba WhatsApp)

        return () => clearInterval(interval);
    }, [isOpen, editingLead?.id, activeTab]);

    // Verificação inicial do status WhatsApp (chamada pesada, apenas 1x na abertura)
    useEffect(() => {
        if (!isOpen || !editingLead) return;

        setInstanceStatus('loading');

        const fetchInitialStatus = async () => {
            try {
                const res = await refreshInstanceStatus();
                if (res.error) {
                    setInstanceStatus('disconnected');
                } else {
                    setInstanceStatus(res.status === 'connected' ? 'connected' : 'disconnected');
                }
            } catch {
                setInstanceStatus('disconnected');
            }
        };

        fetchInitialStatus();
        // Sem intervalo — chamada pesada apenas uma vez
    }, [isOpen, editingLead?.id]);

    // Polling leve de status WhatsApp — lê apenas do banco de dados (a cada 60s)
    useEffect(() => {
        if (!isOpen || !editingLead) return;

        const pollStatus = async () => {
            try {
                const res = await checkInstanceStatus();
                setInstanceStatus(res.status === 'connected' ? 'connected' : 'disconnected');
            } catch {
                setInstanceStatus('disconnected');
            }
        };

        const interval = setInterval(pollStatus, 60000);

        return () => clearInterval(interval);
    }, [isOpen, editingLead?.id]);

    const handleMediaUpload = (type: 'images' | 'videos' | 'documents', files: string[] | { name: string; url: string }[]) => {
        setLeadData(prev => ({
            ...prev,
            [type]: [...prev[type], ...files]
        }))
    }

    const handleMediaRemove = (type: 'images' | 'videos' | 'documents', index: number) => {
        setLeadData(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async () => {
        if (!leadData.name || !leadData.phone || !tenantId) {
            toast.error('Nome e Telefone são obrigatórios')
            return
        }

        if (!leadData.stage_id) {
            toast.error('Por favor, selecione um estágio')
            return
        }

        setIsLoading(true)
        try {
            // Se o usuário escreveu uma nova origem, salvar primeiro
            let finalSource = leadData.lead_source
            if (isAddingSource && newSource.trim()) {
                const res = await createLeadSource(tenantId, newSource.trim())
                if (res.success) {
                    finalSource = newSource.trim()
                }
            }

            // Se o usuário escreveu uma nova campanha, salvar primeiro
            let finalCampaign = leadData.campaign
            if (isAddingCampaign && newCampaign.trim()) {
                const res = await createLeadCampaign(tenantId, finalSource, newCampaign.trim())
                if (res.success) {
                    finalCampaign = newCampaign.trim()
                }
            }

            let finalPartnerId = leadData.partner_id || null
            let finalPartnerRole = leadData.partner_role || null
            
            if (finalSource.toLowerCase().includes('parceria') && finalCampaign) {
                const matchedPartner = partners.find(p => p.name.toLowerCase().trim() === finalCampaign.toLowerCase().trim())
                if (matchedPartner) {
                    finalPartnerId = matchedPartner.id
                    if (!finalPartnerRole) {
                        finalPartnerRole = 'buyer_agent'
                    }
                } else {
                    const partnerRes = await createPartner(tenantId, {
                        name: finalCampaign
                    })
                    if (partnerRes.success && partnerRes.data) {
                        finalPartnerId = partnerRes.data.id
                        if (!finalPartnerRole) {
                            finalPartnerRole = 'buyer_agent'
                        }
                    }
                }
            }

            const dataToSubmit = {
                ...leadData,
                lead_source: finalSource,
                campaign: finalCampaign,
                value: leadData.value ? parseCurrencyBRL(leadData.value) : 0,
                partner_split: leadData.partner_split ? Number(leadData.partner_split) : null,
                partner_id: finalPartnerId,
                partner_role: finalPartnerRole
            }

            let result;
            if (editingLead?.id) {
                result = await updateLead(tenantId, editingLead.id, dataToSubmit)
            } else {
                if (selectedSequenceId) {
                    const followupStage = stages.find(s => s.name.toLowerCase().includes('follow'))
                    if (followupStage) {
                        dataToSubmit.stage_id = followupStage.id
                    }
                }
                result = await createLead(tenantId, dataToSubmit)
                if (result.success && result.data?.id && selectedSequenceId) {
                    try {
                        const enrollRes = await enrollLeadInSequence(result.data.id, selectedSequenceId)
                        if (!enrollRes.success) {
                            console.error('Erro ao inscrever lead criado na sequência:', enrollRes.error)
                            toast.error(`Lead criado, mas falhou ao inscrever na sequência: ${enrollRes.error}`)
                        }
                    } catch (enrollErr) {
                        console.error('Erro ao inscrever lead criado na sequência:', enrollErr)
                    }
                }
            }

            if (result.success) {
                toast.success(editingLead ? 'Lead atualizado com sucesso!' : 'Lead criado com sucesso!')
                onSuccess()
                if (!editingLead) {
                    onClose()
                }
            } else {
                toast.error('Erro ao processar lead: ' + result.error)
            }
        } catch (error) {
            console.error('Erro ao salvar lead:', error)
            toast.error('Ocorreu um erro ao salvar o lead')
        } finally {
            setIsLoading(false)
        }
    }

    const showMethodSelection = !editingLead && creationMethod === null

    const handleSelectMethod = (method: LeadCreationMethod) => {
        if (method === 'import_bulk') {
            onSelectImportBulk?.()
        } else {
            setCreationMethod('manual')
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { setCreationMethod(null); onClose() }}
            title={
                <h3 className="text-sm md:text-base font-black text-foreground uppercase tracking-wider md:tracking-widest truncate">
                    {editingLead ? "Editar Lead" : "Novo Lead"}
                </h3>
            }
            size={editingLead ? '2xl' : (showMethodSelection ? 'md' : 'xl')}
            align={editingLead ? 'center' : 'top'}
            fullHeight={!!editingLead}
            className={editingLead ? "md:h-[94vh] md:max-h-[94vh] [&>div:last-child]:!pb-2 md:[&>div:last-child]:!pb-3 [&>div:last-child]:!pt-2 md:[&>div:last-child]:!pt-3" : ""}
            extraHeaderContent={
                showMethodSelection ? undefined : (
                    <div className="flex items-center gap-3">

                        {editingLead?.id && editingLead?.contact_id && onMakeProposal && (
                            editingLead.has_proposal ? (
                                <button
                                    type="button"
                                    onClick={() => onMakeProposal(editingLead.contact_id!, editingLead.id!)}
                                    className="px-4 py-1.5 border border-foreground/30 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-lg font-bold text-sm whitespace-nowrap flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.97]"
                                    title="Ver Proposta"
                                >
                                    <span
                                        className="w-4 h-4 flex items-center justify-center text-[9px] font-black rounded-full shrink-0"
                                        style={{ backgroundColor: '#FFE600', color: '#1a1a1a' }}
                                    >
                                        P
                                    </span>
                                    <span className="hidden sm:inline">Em Proposta</span>
                                    <span className="sm:hidden">Proposta</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onMakeProposal(editingLead.contact_id!, editingLead.id!)}
                                    className="px-4 py-1.5 border border-border bg-card text-foreground rounded-lg font-bold text-sm hover:bg-muted shadow-sm active:scale-[0.97] transition-all whitespace-nowrap"
                                >
                                    <span className="hidden sm:inline">Fazer Proposta</span>
                                    <span className="sm:hidden">Proposta</span>
                                </button>
                            )
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="px-4 py-1.5 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm hover:opacity-90 shadow-sm active:scale-[0.97] transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                            {isLoading ? "Processando..." : (
                                editingLead ? (
                                    <>
                                        <span className="hidden sm:inline">Salvar Alterações</span>
                                        <span className="sm:hidden">Salvar</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="hidden sm:inline">Criar Lead</span>
                                        <span className="sm:hidden">Criar</span>
                                    </>
                                )
                            )}
                        </button>
                    </div>
                )
            }
        >
            {showMethodSelection ? (
                <div className="py-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 ml-1">
                        Como deseja cadastrar?
                    </p>
                    <div className="flex flex-col gap-2">
                        {/* Preenchimento Manual */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectMethod('manual')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSelectMethod('manual')}
                            className="group flex items-center gap-4 bg-foreground/5 hover:bg-foreground/10 border border-border/40 hover:border-emerald-500/30 rounded-lg px-4 py-4 transition-all text-left cursor-pointer"
                        >
                            <div className="p-2.5 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors shrink-0">
                                <PenLine size={20} className="text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground">Preenchimento Manual</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed font-normal normal-case tracking-normal">
                                    Preencha todos os campos do lead manualmente
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0" />
                        </div>

                        {/* Importação com IA ou Planilha */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectMethod('import_bulk')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSelectMethod('import_bulk')}
                            className="group flex items-center gap-4 bg-foreground/5 hover:bg-foreground/10 border border-border/40 hover:border-purple-500/30 rounded-lg px-4 py-4 transition-all text-left cursor-pointer"
                        >
                            <div className="p-2.5 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors shrink-0">
                                <Sparkles size={20} className="text-purple-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-foreground">Importar com IA ou Planilha</p>
                                    <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-wider rounded-md">IA</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed font-normal normal-case tracking-normal">
                                    Importe um ou múltiplos leads a partir de prints (fotos), PDFs ou planilhas
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {editingLead && (
                        <div className="flex items-center border-b border-border lg:hidden shrink-0">
                            <button
                                type="button"
                                onClick={() => setActiveTab('info')}
                                className={`flex-1 py-2.5 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'info' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <FileText size={14} />
                                Informações
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('whatsapp')}
                                className={`flex-1 py-2.5 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'whatsapp' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <MessageCircle size={14} />
                                WhatsApp
                            </button>
                        </div>
                    )}
                    <div className={editingLead ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:max-h-[calc(94vh-90px)] overflow-visible" : "space-y-6"}>
                        <div className={editingLead ? `space-y-6 lg:overflow-y-auto lg:max-h-[calc(94vh-90px)] pr-2 no-scrollbar ${activeTab === 'info' ? 'block' : 'hidden lg:block'}` : "space-y-6"}>
                            <div className="space-y-8 pb-4">
                                {/* Seção: Dados Pessoais */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Dados Pessoais</h3>
                                        {editingLead?.id && editingLead?.contact_id && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCreationMethod(null)
                                                    onClose()
                                                    router.push(`/clients?openId=${editingLead.contact_id}`)
                                                }}
                                                className="px-3 py-1 border border-border bg-card text-foreground rounded-lg font-bold text-xs hover:bg-muted shadow-sm active:scale-[0.97] transition-all whitespace-nowrap"
                                                title="Ver ficha completa do cliente"
                                            >
                                                Cliente
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Linha 1: Nome + Avatar */}
                                        <div className="col-span-1 md:col-span-2 flex items-end gap-4">
                                            <div className="flex-1">
                                                <FormInput
                                                    label="Nome completo"
                                                    value={leadData.name}
                                                    onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                                                    placeholder="Ex: João Silva"
                                                />
                                            </div>
                                            {editingLead && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAvatarZoomed(true)}
                                                    className="w-11 h-11 rounded-full overflow-hidden bg-muted flex items-center justify-center text-foreground flex-shrink-0 border border-border/10 mb-1 cursor-zoom-in hover:opacity-90 active:scale-[0.97] transition-all focus:outline-none"
                                                    title="Clique para ampliar a foto"
                                                >
                                                    {editingLead.avatar_url ? (
                                                        <img src={editingLead.avatar_url} alt={leadData.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={20} />
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Linha 2: Telefone e Email */}
                                        <div>
                                            <FormInput
                                                label="Telefone"
                                                value={leadData.phone}
                                                onChange={(e) => setLeadData({ ...leadData, phone: formatPhone(e.target.value) })}
                                                placeholder="(48) 99999 9999"
                                                rightElement={
                                                    leadData.phone && (
                                                        <a
                                                            href={`https://wa.me/55${leadData.phone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-emerald-500 hover:text-emerald-600 transition-colors p-1"
                                                            title="Conversar WhatsApp"
                                                        >
                                                            <MessageCircle size={16} />
                                                        </a>
                                                    )
                                                }
                                            />
                                        </div>
                                        <div>
                                            <FormInput
                                                label="E-mail"
                                                type="email"
                                                value={leadData.email}
                                                onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                                                placeholder="joao@email.com"
                                            />
                                        </div>

                                        {/* Linha 3: Responsável e Criado em */}
                                        {(userRole === 'admin' || userRole === 'superadmin') && (
                                            <div>
                                                <FormSelect
                                                    label="Responsável"
                                                    value={leadData.assigned_to}
                                                    onChange={(e) => setLeadData({ ...leadData, assigned_to: e.target.value })}
                                                    options={[
                                                        { value: '', label: 'Não atribuído' },
                                                        ...brokers.filter(b => b.role !== 'admin' && b.role !== 'superadmin').map(b => ({ value: b.id, label: b.full_name }))
                                                    ]}
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <FormInput
                                                label="Criado em"
                                                type="date"
                                                value={leadData.date}
                                                onChange={(e) => setLeadData({ ...leadData, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção: Captação */}
                                <div className="space-y-4 pt-8 border-t border-border/50">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Captação</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            {!isAddingSource ? (
                                                <FormActionSelect
                                                    label="Origem"
                                                    value={leadData.lead_source}
                                                    placeholder="Selecionar origem"
                                                    onChange={(val) => {
                                                        if (val === 'ADD_NEW') {
                                                            setIsAddingSource(true)
                                                        } else {
                                                            setLeadData({ ...leadData, lead_source: val })
                                                        }
                                                    }}
                                                    options={[
                                                        ...sources.map(s => {
                                                            const rawMatch = sourcesRaw.find(r => r.name === s)
                                                            const isInitial = (LEAD_MODAL_INITIAL_SOURCES as readonly string[]).includes(s)
                                                            return {
                                                                value: s,
                                                                label: s,
                                                                id: rawMatch?.id,
                                                                isCustom: !isInitial && !!rawMatch
                                                            }
                                                        }),
                                                        { value: 'ADD_NEW', label: '+ Outra' }
                                                    ]}
                                                    onEdit={(option) => {
                                                        setEditingSourceOption(option)
                                                        setEditName(option.label)
                                                    }}
                                                    onDelete={(option) => {
                                                        setDeletingSourceOption(option)
                                                    }}
                                                />
                                            ) : (
                                                <FormInput
                                                    label="Origem (Nova)"
                                                    value={newSource}
                                                    onChange={(e) => setNewSource(e.target.value)}
                                                    placeholder="Ex: WhatsApp"
                                                    rightElement={
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsAddingSource(false)
                                                                setNewSource('')
                                                            }}
                                                            className="text-muted-foreground hover:text-foreground p-1"
                                                            title="Cancelar"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    }
                                                />
                                            )}
                                        </div>
                                        <div>
                                            {!isAddingCampaign ? (
                                                <FormActionSelect
                                                    label={leadData.lead_source.toLowerCase().includes('indica') ? 'Quem indicou?' : leadData.lead_source.toLowerCase().includes('parceria') ? 'Qual parceiro?' : 'Campanha'}
                                                    value={leadData.campaign}
                                                    disabled={!leadData.lead_source}
                                                    placeholder={leadData.lead_source ? (leadData.lead_source.toLowerCase().includes('indica') ? 'Selecionar quem indicou' : leadData.lead_source.toLowerCase().includes('parceria') ? 'Selecionar parceiro' : 'Selecionar Campanha') : 'Selecionar origem primeiro'}
                                                    onChange={(val) => {
                                                        if (val === 'ADD_NEW') {
                                                            setIsAddingCampaign(true)
                                                        } else {
                                                            let matchedPartnerId = leadData.partner_id
                                                            let matchedPartnerRole = leadData.partner_role
                                                            if (leadData.lead_source.toLowerCase().includes('parceria')) {
                                                                const matchedPartner = partners.find(p => p.name.toLowerCase().trim() === val.toLowerCase().trim())
                                                                if (matchedPartner) {
                                                                    matchedPartnerId = matchedPartner.id
                                                                    if (!matchedPartnerRole) {
                                                                        matchedPartnerRole = 'buyer_agent'
                                                                    }
                                                                } else {
                                                                    matchedPartnerId = ''
                                                                }
                                                            }
                                                            setLeadData({ 
                                                                ...leadData, 
                                                                campaign: val,
                                                                partner_id: matchedPartnerId,
                                                                partner_role: matchedPartnerRole
                                                            })
                                                        }
                                                    }}
                                                    options={[
                                                        ...campaigns.map(c => {
                                                            const rawMatch = campaignsRaw.find(r => r.name === c)
                                                            return {
                                                                value: c,
                                                                label: c,
                                                                id: rawMatch?.id,
                                                                isCustom: !!rawMatch
                                                            }
                                                        }),
                                                        { value: 'ADD_NEW', label: '+ Outra' }
                                                    ]}
                                                    onEdit={(option) => {
                                                        setEditingCampaignOption(option)
                                                        setEditName(option.label)
                                                    }}
                                                    onDelete={(option) => {
                                                        setDeletingCampaignOption(option)
                                                    }}
                                                />
                                            ) : (
                                                <FormInput
                                                    label={leadData.lead_source.toLowerCase().includes('indica') ? 'Quem indicou? (Novo)' : leadData.lead_source.toLowerCase().includes('parceria') ? 'Qual parceiro? (Novo)' : 'Campanha (Nova)'}
                                                    value={newCampaign}
                                                    onChange={(e) => setNewCampaign(e.target.value)}
                                                    placeholder={leadData.lead_source.toLowerCase().includes('indica') ? 'Ex: João Silva' : leadData.lead_source.toLowerCase().includes('parceria') ? 'Ex: CR Ronaldo' : 'Ex: Verão 2026'}
                                                    rightElement={
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsAddingCampaign(false)
                                                                setNewCampaign('')
                                                            }}
                                                            className="text-muted-foreground hover:text-foreground p-1"
                                                            title="Cancelar"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    }
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Seção: Interesse */}
                                <div className="space-y-4 pt-8 border-t border-border/50">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Interesse</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <PropertyAutocomplete
                                                tenantId={tenantId}
                                                label="Imóvel Cadastrado"
                                                placeholder="Digite o nome do imóvel"
                                                showIcon={false}
                                                selectedItem={leadData.selectedProperty}
                                                onSelect={(property) => setLeadData({ ...leadData, interest: property.title, property_id: property.id, property_interest: property.title, selectedProperty: property })}
                                                onClear={() => setLeadData({ ...leadData, interest: '', property_id: '', property_interest: '', selectedProperty: null })}
                                            />
                                        </div>
                                        <div>
                                            <FormInput
                                                label="Imóvel de Interesse (texto livre)"
                                                value={leadData.property_interest}
                                                onChange={(e) => setLeadData({ ...leadData, property_interest: e.target.value })}
                                                placeholder="Ex: Apto 3 dormitórios na praia..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção: Parceria Comercial */}
                                <div className="space-y-4 pt-8 border-t border-border/50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Parceria Comercial</h3>
                                        <button
                                            type="button"
                                            onClick={() => setIsPartnerModalOpen(true)}
                                            className="px-3 py-2 bg-secondary text-secondary-foreground border border-transparent rounded-lg font-bold text-sm hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 w-[120px]"
                                        >
                                            Novo Parceiro
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <FormSelect
                                                label="Parceiro"
                                                value={leadData.partner_id}
                                                onChange={async (e) => {
                                                    const partnerId = e.target.value
                                                    let updatedCampaign = leadData.campaign
                                                    
                                                    if (leadData.lead_source.toLowerCase().includes('parceria')) {
                                                        const p = partners.find(part => part.id === partnerId)
                                                        if (p) {
                                                            updatedCampaign = p.name
                                                            // Se a campanha correspondente ainda não existir nas opções, criar no BD e na lista local
                                                            if (!campaigns.includes(p.name)) {
                                                                setCampaigns(prev => [...prev, p.name])
                                                                await createLeadCampaign(tenantId, leadData.lead_source, p.name)
                                                                // Atualiza também campaignsRaw para ter o id correto da campanha
                                                                const campRes = await getLeadCampaigns(tenantId, leadData.lead_source)
                                                                if (campRes.success) {
                                                                    setCampaignsRaw((campRes.data || []) as NamedOption[])
                                                                }
                                                            }
                                                        } else {
                                                            updatedCampaign = ''
                                                        }
                                                    }
                                                    
                                                    setLeadData(prev => ({ 
                                                        ...prev, 
                                                        partner_id: partnerId,
                                                        campaign: updatedCampaign
                                                    }))
                                                }}
                                                options={[
                                                    { value: '', label: 'Nenhum (Sem Parceria)' },
                                                    ...partners.map(p => ({
                                                        value: p.id,
                                                        label: p.company ? `${p.name} (${p.company})` : p.name
                                                    }))
                                                ]}
                                            />
                                        </div>
                                        <div>
                                            <FormInput
                                                label="Comissão (%)"
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={leadData.partner_split}
                                                onChange={(e) => setLeadData({ ...leadData, partner_split: e.target.value })}
                                                placeholder="Ex: 50"
                                                disabled={!leadData.partner_id}
                                            />
                                        </div>
                                        <div>
                                            <FormSelect
                                                label="Ativo"
                                                value={leadData.partner_role}
                                                onChange={(e) => setLeadData({ ...leadData, partner_role: e.target.value })}
                                                disabled={!leadData.partner_id}
                                                options={[
                                                    { value: '', label: 'Selecione o papel' },
                                                    { value: 'buyer_agent', label: 'Trouxe Lead' },
                                                    { value: 'seller_agent', label: 'Trouxe Imóvel' }
                                                ]}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção: Negociação */}
                                <div className="space-y-4 pt-8 border-t border-border/50">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Negociação</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <FormSelect
                                                label="Estágio"
                                                value={leadData.stage_id}
                                                onChange={(e) => setLeadData({ ...leadData, stage_id: e.target.value })}
                                                options={[
                                                    { value: '', label: 'Selecione um estágio' },
                                                    ...stages.map(s => ({ value: s.id, label: s.name }))
                                                ]}
                                            />
                                        </div>
                                        <div>
                                            <FormInput
                                                label="Valor Estimado"
                                                value={leadData.value}
                                                onChange={(e) => setLeadData({ ...leadData, value: formatCurrencyBRL(e.target.value) })}
                                                placeholder="0,00"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção: Acompanhamento (Follow-up) */}
                                <div className="space-y-4 pt-8 border-t border-border/50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Acompanhamento (Follow-up)</h3>
                                        <Link
                                            href="/marketing/follow-up"
                                            className="px-4 py-1.5 border border-border bg-card text-foreground rounded-lg font-bold text-sm hover:bg-muted shadow-sm active:scale-[0.97] transition-all whitespace-nowrap"
                                        >
                                            Gerenciar
                                        </Link>
                                    </div>

                                    {editingLead ? (
                                        <div className="space-y-4">
                                            {/* Nova Inscrição */}
                                            {followupSequences.length > 0 && (
                                                <div className="flex items-end gap-3 pt-2">
                                                    <div className="flex-1">
                                                        <FormSelect
                                                            label="Inscrever em nova sequência"
                                                            value={selectedSequenceId}
                                                            onChange={(e) => setSelectedSequenceId(e.target.value)}
                                                            options={[
                                                                { value: '', label: 'Selecione uma sequência...' },
                                                                ...followupSequences
                                                                    .filter((s: any) => !leadEnrollments.some((e: any) => e.sequence_id === s.id && e.status === 'active'))
                                                                    .map((s: any) => ({ value: s.id, label: s.name + (s.is_active ? '' : ' (Inativa)') }))
                                                            ]}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleEnrollInSequence}
                                                        disabled={isProcessingFollowup || !selectedSequenceId}
                                                        className="px-4 py-2 bg-secondary text-secondary-foreground border border-transparent rounded-lg font-bold text-sm hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 w-[120px]"
                                                    >
                                                        {isProcessingFollowup ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            'Inscrever'
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Lista de Inscrições Ativas */}
                                            {leadEnrollments.filter((e: any) => e.status !== 'cancelled' && e.status !== 'paused').length > 0 ? (
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-bold text-foreground ml-1 mb-2">Inscrições Ativas</label>
                                                    <div className="space-y-2">
                                                        {leadEnrollments.filter((e: any) => e.status !== 'cancelled' && e.status !== 'paused').map((enrollment: any) => {
                                                            const isActive = enrollment.status === 'active';
                                                            return (
                                                                <div
                                                                    key={enrollment.id}
                                                                    className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/40 text-sm"
                                                                >
                                                                    <div>
                                                                        <p className="font-semibold text-foreground">
                                                                            {enrollment.followup_sequences?.name || 'Sequência'}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                                            Status: <span className={`font-bold ${isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                                                                {isActive ? 'Ativo' : enrollment.status === 'completed' ? 'Concluído' : 'Cancelado'}
                                                                            </span>
                                                                            {isActive && enrollment.next_action_at && (
                                                                                <>
                                                                                    {' • '}Próximo envio: <span className="font-medium text-foreground">
                                                                                        {new Date(enrollment.next_action_at).toLocaleString('pt-BR', {
                                                                                            day: '2-digit',
                                                                                            month: '2-digit',
                                                                                            hour: '2-digit',
                                                                                            minute: '2-digit'
                                                                                        })}
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    {isActive && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleCancelEnrollment(enrollment.id)}
                                                                            disabled={isProcessingFollowup}
                                                                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors cursor-pointer"
                                                                            title="Cancelar acompanhamento"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic">Nenhum acompanhamento ativo para este lead no momento.</p>
                                            )}
                                        </div>
                                    ) : (
                                        /* Modo de Criação: Campo único opcional */
                                        <div>
                                            <FormSelect
                                                label="Inscrever em sequência de follow-up (Opcional)"
                                                value={selectedSequenceId}
                                                onChange={(e) => setSelectedSequenceId(e.target.value)}
                                                options={[
                                                    { value: '', label: 'Nenhuma sequência' },
                                                    ...followupSequences.map((s: any) => ({ value: s.id, label: s.name + (s.is_active ? '' : ' (Inativa)') }))
                                                ]}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Seção: Notas */}
                                <div className="space-y-4 pt-8 border-t border-border/50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Notas</h3>
                                        {editingLead && (
                                            <button
                                                type="button"
                                                onClick={handleAddNote}
                                                disabled={isSavingNote || (!newNoteContent.trim() && (!isVisit || (isRegisteredProperty && !selectedVisitProperty) || (!isRegisteredProperty && !unregisteredVisitProperty.trim())))}
                                                className="px-3 py-2 bg-secondary text-secondary-foreground border border-transparent rounded-lg font-bold text-sm hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 w-[120px]"
                                            >
                                                {isSavingNote ? 'Adicionando...' : 'Adicionar Nota'}
                                            </button>
                                        )}
                                    </div>

                                    {!editingLead ? (
                                        <FormTextarea
                                            value={leadData.notes}
                                            onChange={(e) => setLeadData({ ...leadData, notes: e.target.value })}
                                            rows={3}
                                            placeholder="Alguma observação importante sobre o lead (será salva como primeira nota)..."
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Campo para adicionar nova nota */}
                                            <div className="space-y-2">
                                                <textarea
                                                    value={newNoteContent}
                                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                                    rows={2}
                                                    placeholder={isVisit ? "Observações sobre a visita (opcional)..." : "Escreva uma nova nota sobre o lead..."}
                                                    className="w-full bg-background border border-muted-foreground/30 rounded-lg p-3 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                                                />
                                            </div>

                                            {/* Checkbox de Visita */}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="lead-is-visit-checkbox"
                                                    checked={isVisit}
                                                    onChange={(e) => {
                                                        setIsVisit(e.target.checked)
                                                        if (e.target.checked) {
                                                            const visitsCount = leadNotes.filter(n => n.is_visit).length
                                                            setVisitNumber(visitsCount + 1)
                                                        }
                                                    }}
                                                    className="rounded border-muted-foreground/30 text-secondary focus:ring-secondary cursor-pointer h-4 w-4"
                                                />
                                                <label htmlFor="lead-is-visit-checkbox" className="text-xs font-bold text-foreground cursor-pointer select-none">
                                                    Registrar como Visita
                                                </label>
                                            </div>

                                            {/* Detalhes da Visita */}
                                            {isVisit && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="flex flex-col">
                                                        <label className="text-xs font-bold text-foreground ml-1 mb-2">Visita</label>
                                                        <select
                                                            value={visitNumber}
                                                            onChange={(e) => setVisitNumber(Number(e.target.value))}
                                                            className="h-[38px] w-full bg-background border border-muted-foreground/30 rounded-lg px-3 text-sm text-foreground outline-none focus:border-primary transition-colors"
                                                        >
                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                                                <option key={num} value={num}>{num}ª Visita</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <label className="text-xs font-bold text-foreground ml-1 mb-2">Tipo de Imóvel</label>
                                                        <div className="flex items-center gap-4 h-[38px]">
                                                            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer font-medium">
                                                                <input
                                                                    type="radio"
                                                                    name="leadPropertyType"
                                                                    checked={isRegisteredProperty}
                                                                    onChange={() => setIsRegisteredProperty(true)}
                                                                    className="text-secondary focus:ring-secondary h-4 w-4"
                                                                />
                                                                Cadastrado
                                                            </label>
                                                            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer font-medium">
                                                                <input
                                                                    type="radio"
                                                                    name="leadPropertyType"
                                                                    checked={!isRegisteredProperty}
                                                                    onChange={() => setIsRegisteredProperty(false)}
                                                                    className="text-secondary focus:ring-secondary h-4 w-4"
                                                                />
                                                                Não Cadastrado
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        {isRegisteredProperty ? (
                                                            <PropertyAutocomplete
                                                                tenantId={tenantId}
                                                                label="Imóvel Cadastrado"
                                                                placeholder="Busque o imóvel cadastrado..."
                                                                selectedItem={selectedVisitProperty}
                                                                onSelect={(prop) => setSelectedVisitProperty(prop)}
                                                                onClear={() => setSelectedVisitProperty(null)}
                                                            />
                                                        ) : (
                                                            <FormInput
                                                                label="Nome/Descrição do Imóvel"
                                                                value={unregisteredVisitProperty}
                                                                onChange={(e) => setUnregisteredVisitProperty(e.target.value)}
                                                                placeholder="Digite a identificação ou endereço do imóvel..."
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Timeline das Notas (Collapsible Dropdown) */}
                                            <div className="space-y-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNotesHistory(!showNotesHistory)}
                                                    className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-foreground uppercase tracking-wider transition-colors cursor-pointer"
                                                >
                                                    <span>Notas salvas ({leadNotes.length + (leadData.notes ? 1 : 0)})</span>
                                                    <div className="flex items-center gap-1">
                                                        {showNotesHistory ? <ChevronDown className="rotate-180 transition-transform" size={14} /> : <ChevronDown className="transition-transform" size={14} />}
                                                    </div>
                                                </button>

                                                {showNotesHistory && (() => {
                                                    const sortedNotes = [...leadNotes]
                                                    if (leadData.notes) {
                                                        sortedNotes.push({
                                                            id: 'legacy',
                                                            content: leadData.notes,
                                                            created_at: editingLead?.date || new Date(0).toISOString(),
                                                            profiles: {
                                                                full_name: 'Observação de Cadastro'
                                                            }
                                                        })
                                                    }
                                                    sortedNotes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

                                                    return (
                                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                                                            {sortedNotes.length === 0 && (
                                                                <p className="text-xs text-muted-foreground text-center py-4">
                                                                    Nenhuma nota registrada para este lead ainda.
                                                                </p>
                                                            )}

                                                            {sortedNotes.map((note) => {
                                                                const isExpanded = !!expandedNotes[note.id]
                                                                const isEditing = editingNoteId === note.id
                                                                const isLegacy = note.id === 'legacy'

                                                                if (isEditing) {
                                                                    return (
                                                                        <div
                                                                            key={note.id}
                                                                            className="p-3 bg-background border border-border/40 rounded-lg space-y-2"
                                                                        >
                                                                            <textarea
                                                                                value={editingNoteText}
                                                                                onChange={(e) => setEditingNoteText(e.target.value)}
                                                                                disabled={isSavingEditedNote}
                                                                                rows={6}
                                                                                className="w-full text-sm p-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-secondary/50 resize-y font-medium text-foreground"
                                                                            />
                                                                            <div className="flex items-center justify-end gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setEditingNoteId(null)}
                                                                                    disabled={isSavingEditedNote}
                                                                                    className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                                                                                >
                                                                                    Cancelar
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleSaveEditedNote(note.id)}
                                                                                    disabled={isSavingEditedNote || !editingNoteText.trim()}
                                                                                    className="px-2.5 py-1.5 text-[10px] font-bold bg-secondary text-secondary-foreground hover:opacity-90 active:scale-[0.97] rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                                                                >
                                                                                    {isSavingEditedNote ? 'Salvando...' : 'Salvar'}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                }

                                                                return (
                                                                    <div
                                                                        key={note.id}
                                                                        onClick={() => toggleNoteExpanded(note.id)}
                                                                        className="p-3 bg-background border border-border/40 rounded-lg hover:border-muted-foreground/20 transition-all relative group cursor-pointer"
                                                                    >
                                                                        {!isExpanded ? (
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                                    <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                                                                                    {note.is_visit ? (
                                                                                        <span className="flex items-center gap-1.5 text-sm font-bold text-foreground truncate flex-1 leading-none">
                                                                                            <span className="bg-[#FFE600] text-[#404F4F] px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                                                                                                {note.visit_number}ª Visita
                                                                                            </span>
                                                                                            {note.properties ? (
                                                                                                <span className="truncate">
                                                                                                    {note.properties.title}
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="truncate text-muted-foreground italic">
                                                                                                    {note.visit_unregistered_property}
                                                                                                </span>
                                                                                            )}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-sm font-medium text-foreground truncate flex-1 leading-none">
                                                                                            {getFirstSentence(note.content)}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                                                                                        {formatNoteDate(note.created_at)}
                                                                                    </span>
                                                                                    <NoteActionsDropdown
                                                                                        onEdit={() => {
                                                                                            setEditingNoteId(note.id)
                                                                                            setEditingNoteText(note.content)
                                                                                        }}
                                                                                        onDelete={() => handleDeleteNote(note.id)}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex gap-2 items-start">
                                                                                <ChevronRight
                                                                                    size={14}
                                                                                    className="text-muted-foreground transition-transform rotate-90 shrink-0 mt-0.5"
                                                                                />
                                                                                <div className="flex-1 min-w-0 space-y-2">
                                                                                    <div className="flex items-center justify-between mb-1.5 select-none">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className={isLegacy ? "text-[10px] font-bold text-muted-foreground uppercase tracking-wider" : "text-[10px] font-bold text-accent-icon"}>
                                                                                                {isLegacy ? "Observação de Cadastro" : (note.profiles?.full_name || 'Corretor')}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                                                                {formatNoteDate(note.created_at)}
                                                                                            </span>
                                                                                            <NoteActionsDropdown
                                                                                                onEdit={() => {
                                                                                                    setEditingNoteId(note.id)
                                                                                                    setEditingNoteText(note.content)
                                                                                                }}
                                                                                                onDelete={() => handleDeleteNote(note.id)}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    {note.is_visit && (
                                                                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                                            <span className="bg-[#FFE600] text-[#404F4F] px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                                                                                                {note.visit_number}ª Visita
                                                                                            </span>
                                                                                            {note.properties ? (
                                                                                                <Link
                                                                                                    href={`/properties/${note.properties.type}/${note.properties.slug || note.properties.id}`}
                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                    className="text-xs font-bold text-accent-icon hover:underline flex items-center gap-1 bg-[#404F4F]/10 dark:bg-white/10 px-2 py-0.5 rounded"
                                                                                                >
                                                                                                    <Building2 size={12} />
                                                                                                    {note.properties.title}
                                                                                                </Link>
                                                                                            ) : (
                                                                                                <span className="text-xs font-medium text-muted-foreground italic bg-muted px-2 py-0.5 rounded">
                                                                                                    {note.visit_unregistered_property} (Não cadastrado)
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed font-medium">
                                                                                        {note.content}
                                                                                    </p>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            toggleNoteExpanded(note.id)
                                                                                        }}
                                                                                        className={isLegacy ? "text-[10px] font-bold text-muted-foreground mt-1 hover:underline cursor-pointer block" : "text-[10px] font-bold text-accent-icon mt-1 hover:underline cursor-pointer block"}
                                                                                    >
                                                                                        Ver menos
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Seção: Mídias e Docs */}
                                <div className="space-y-4 pt-8 border-t border-border/50">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Mídias e Docs</h3>
                                    <MediaUpload
                                        pathPrefix={`leads/${tenantId}`}
                                        images={leadData.images}
                                        videos={leadData.videos}
                                        documents={leadData.documents}
                                        onUpload={handleMediaUpload}
                                        onRemove={handleMediaRemove}
                                    />
                                </div>

                            </div>
                        </div>

                        {/* Coluna Direita: Emulador WhatsApp */}
                        {editingLead && (
                            <div className={`flex flex-col h-[500px] lg:h-full lg:max-h-[calc(94vh-90px)] shrink-0 pb-1 mt-6 lg:mt-0 ${activeTab === 'whatsapp' ? 'flex' : 'hidden lg:flex'}`}>
                                <LeadWhatsAppConversation
                                    chat={whatsappChat}
                                    leadName={editingLead.name}
                                    avatarUrl={editingLead.avatar_url || undefined}
                                    phone={editingLead.phone}
                                    onSendMessage={handleSendWhatsAppMessage}
                                    onSendMedia={handleSendWhatsAppMedia}
                                    instanceStatus={instanceStatus}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Zoom do Avatar */}
            {isAvatarZoomed && editingLead && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsAvatarZoomed(false)}
                >
                    <div
                        className="relative max-w-sm w-full mx-4 bg-card rounded-lg p-6 shadow-2xl border border-border/10 flex flex-col items-center animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setIsAvatarZoomed(false)}
                            className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <div className="w-48 h-48 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shadow-lg mb-4">
                            {editingLead.avatar_url ? (
                                <img
                                    src={editingLead.avatar_url}
                                    alt={leadData.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User size={96} className="text-muted-foreground" />
                            )}
                        </div>
                        <h4 className="text-base font-bold text-foreground text-center">
                            {leadData.name || "Sem nome"}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            Foto do Lead
                        </p>
                    </div>
                </div>
            )}

            {isPartnerModalOpen && (
                <PartnerQuickModal
                    isOpen={isPartnerModalOpen}
                    onClose={() => setIsPartnerModalOpen(false)}
                    onSuccess={handlePartnerCreated}
                    tenantId={tenantId}
                />
            )}

            <ConfirmModal
                isOpen={!!enrollmentToCancel}
                zIndex={110}
                title="Cancelar Acompanhamento"
                message="Deseja realmente cancelar esta inscrição de follow-up?"
                confirmLabel="Confirmar"
                onConfirm={async () => {
                    if (enrollmentToCancel) {
                        await handleCancelEnrollment(enrollmentToCancel)
                        setEnrollmentToCancel(null)
                    }
                }}
                onCancel={() => setEnrollmentToCancel(null)}
                isLoading={isProcessingFollowup}
            />

            <ConfirmModal
                isOpen={!!noteToDelete}
                zIndex={110}
                title="Excluir Nota"
                message={noteToDelete === 'legacy' ? "Deseja realmente excluir a observação de cadastro do lead?" : "Deseja realmente excluir esta nota?"}
                confirmLabel="Excluir"
                onConfirm={async () => {
                    if (noteToDelete) {
                        await executeDeleteNote(noteToDelete)
                        setNoteToDelete(null)
                    }
                }}
                onCancel={() => setNoteToDelete(null)}
            />

            {/* Modal Editar Origem */}
            <Modal
                isOpen={!!editingSourceOption}
                onClose={() => setEditingSourceOption(null)}
                title="Editar Origem"
                size="sm"
                zIndex={110}
                footer={
                    <div className="flex w-full gap-3">
                        <button
                            type="button"
                            onClick={() => setEditingSourceOption(null)}
                            className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium border border-border"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!editingSourceOption?.id || !editName.trim()) return
                                const res = await updateLeadSource(editingSourceOption.id, editName.trim())
                                if (res.success) {
                                    toast.success('Origem atualizada com sucesso!')
                                    // Se estava selecionada, atualiza o valor
                                    if (leadData.lead_source === editingSourceOption.value) {
                                        setLeadData({ ...leadData, lead_source: editName.trim() })
                                    }
                                    // Refresh sources
                                    const sourcesRes = await getLeadSources(tenantId)
                                    if (sourcesRes.success) {
                                        const dbSourcesData = (sourcesRes.data || []) as NamedOption[]
                                        setSourcesRaw(dbSourcesData)
                                        const dbSources = dbSourcesData.map((s) => s.name)
                                        const merged = Array.from(new Set([...LEAD_MODAL_INITIAL_SOURCES, ...dbSources]))
                                        setSources(merged)
                                    }
                                } else {
                                    toast.error('Erro ao atualizar origem')
                                }
                                setEditingSourceOption(null)
                            }}
                            className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                        >
                            Salvar
                        </button>
                    </div>
                }
            >
                <div className="py-2">
                    <FormInput
                        label="Nome da Origem"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Ex: WhatsApp"
                    />
                </div>
            </Modal>

            {/* Modal Excluir Origem */}
            <ConfirmModal
                isOpen={!!deletingSourceOption}
                zIndex={110}
                title="Excluir Origem"
                message={
                    <span>
                        <span className="block">Deseja realmente excluir a origem "{deletingSourceOption?.label}"?</span>
                        <span className="block">Leads já cadastrados com essa origem não serão afetados.</span>
                    </span>
                }
                confirmLabel="Excluir"
                onConfirm={async () => {
                    if (!deletingSourceOption?.id) return
                    const res = await deleteLeadSource(deletingSourceOption.id)
                    if (res.success) {
                        toast.success('Origem excluída com sucesso!')
                        if (leadData.lead_source === deletingSourceOption.value) {
                            setLeadData({ ...leadData, lead_source: '' })
                        }
                        const sourcesRes = await getLeadSources(tenantId)
                        if (sourcesRes.success) {
                            const dbSourcesData = (sourcesRes.data || []) as NamedOption[]
                            setSourcesRaw(dbSourcesData)
                            const dbSources = dbSourcesData.map((s) => s.name)
                            const merged = Array.from(new Set([...LEAD_MODAL_INITIAL_SOURCES, ...dbSources]))
                            setSources(merged)
                        }
                    } else {
                        toast.error('Erro ao excluir origem')
                    }
                    setDeletingSourceOption(null)
                }}
                onCancel={() => setDeletingSourceOption(null)}
            />

            {/* Modal Editar Campanha */}
            <Modal
                isOpen={!!editingCampaignOption}
                onClose={() => setEditingCampaignOption(null)}
                title={leadData.lead_source.toLowerCase().includes('indica') ? 'Editar Indicação' : leadData.lead_source.toLowerCase().includes('parceria') ? 'Editar Parceiro' : 'Editar Campanha'}
                size="sm"
                zIndex={110}
                footer={
                    <div className="flex w-full gap-3">
                        <button
                            type="button"
                            onClick={() => setEditingCampaignOption(null)}
                            className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium border border-border"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!editingCampaignOption?.id || !editName.trim()) return
                                const res = await updateLeadCampaign(editingCampaignOption.id, editName.trim())
                                if (res.success) {
                                    toast.success('Atualizado com sucesso!')
                                    if (leadData.campaign === editingCampaignOption.value) {
                                        setLeadData({ ...leadData, campaign: editName.trim() })
                                    }
                                    const campRes = await getLeadCampaigns(tenantId, leadData.lead_source)
                                    if (campRes.success) {
                                        const dbCampaignsData = (campRes.data || []) as NamedOption[]
                                        setCampaignsRaw(dbCampaignsData)
                                        setCampaigns(dbCampaignsData.map((c) => c.name))
                                    }
                                } else {
                                    toast.error('Erro ao atualizar')
                                }
                                setEditingCampaignOption(null)
                            }}
                            className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                        >
                            Salvar
                        </button>
                    </div>
                }
            >
                <div className="py-2">
                    <FormInput
                        label={leadData.lead_source.toLowerCase().includes('indica') ? 'Nome de quem indicou' : leadData.lead_source.toLowerCase().includes('parceria') ? 'Nome do parceiro' : 'Nome da campanha'}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Novo nome"
                    />
                </div>
            </Modal>

            {/* Modal Excluir Campanha */}
            <ConfirmModal
                isOpen={!!deletingCampaignOption}
                zIndex={110}
                title={leadData.lead_source.toLowerCase().includes('indica') ? 'Excluir Indicação' : leadData.lead_source.toLowerCase().includes('parceria') ? 'Excluir Parceiro' : 'Excluir Campanha'}
                message={
                    <span>
                        <span className="block">Deseja realmente excluir "{deletingCampaignOption?.label}"?</span>
                        <span className="block">Leads já cadastrados não serão afetados.</span>
                    </span>
                }
                confirmLabel="Excluir"
                onConfirm={async () => {
                    if (!deletingCampaignOption?.id) return
                    const res = await deleteLeadCampaign(deletingCampaignOption.id)
                    if (res.success) {
                        toast.success('Excluído com sucesso!')
                        if (leadData.campaign === deletingCampaignOption.value) {
                            setLeadData({ ...leadData, campaign: '' })
                        }
                        const campRes = await getLeadCampaigns(tenantId, leadData.lead_source)
                        if (campRes.success) {
                            const dbCampaignsData = (campRes.data || []) as NamedOption[]
                            setCampaignsRaw(dbCampaignsData)
                            setCampaigns(dbCampaignsData.map((c) => c.name))
                        }
                    } else {
                        toast.error('Erro ao excluir')
                    }
                    setDeletingCampaignOption(null)
                }}
                onCancel={() => setDeletingCampaignOption(null)}
            />
        </Modal>
    )
}
