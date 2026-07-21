'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { MediaUpload } from '@/components/shared/MediaUpload'
import { MediaPreviewModal } from '@/components/shared/MediaPreviewModal'
import { LeadTemperatureBadge } from '@/components/dashboard/leads/LeadTemperatureBadge'
import { formatPhone } from '@/lib/utils/phone'
import { fetchAddressByCep, formatCEP, fetchCepByAddress, ViaCEPResponse } from '@/lib/utils/cep'
import { createNewClient, updateClient, clearContactNotes } from '@/app/_actions/clients'
import { analyzeLeadProbability } from '@/app/_actions/ai-analysis'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User, Filter, Sparkles, MessageCircle, Search, Loader2,
    ChevronDown, MapPin, FileText, Image as ImageIcon, Video, DollarSign, Pen,
    ChevronRight, PenLine, Trash2, MoreVertical, Building2, CheckSquare, Archive, Edit2
} from 'lucide-react'
import { PropertyAutocomplete } from '@/components/dashboard/properties/PropertyAutocomplete'
import { ClientProposalsTab } from './ClientProposalsTab'
import { LeadDocumentsTab } from '@/components/dashboard/leads/LeadDocumentsTab'
import { LeadFinanceTab } from '@/components/dashboard/leads/LeadFinanceTab'
import { getLeadFinancials } from '@/app/_actions/leads-finance'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { getNotesByContactId, createNote, deleteNote, updateNote } from '@/app/_actions/notes'
import { translatePropertyType } from '@/utils/property-translations'

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
                <div className={`absolute right-0 w-32 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-30 ${openDirection === 'up' ? 'bottom-full mb-1' : 'mt-1'}`}>
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

interface ClientModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string
    profileId: string
    editingClient?: any | null
    onSuccess: () => void
    initialTab?: 'info' | 'leads' | 'proposals' | 'documents' | 'financeiro' | 'ai'
    initialProposalLeadId?: string | null
}

export function ClientModal({
    isOpen,
    onClose,
    tenantId,
    profileId,
    editingClient,
    onSuccess,
    initialTab,
    initialProposalLeadId
}: ClientModalProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'leads' | 'proposals' | 'documents' | 'financeiro' | 'ai'>(initialTab || 'info')
    const [pendingProposalLeadId, setPendingProposalLeadId] = useState<string | null>(initialProposalLeadId || null)
    const [loading, setLoading] = useState(false)
    const [cepLoading, setCepLoading] = useState(false)
    const [searchResults, setSearchResults] = useState<ViaCEPResponse[]>([])
    const [showResults, setShowResults] = useState(false)
    const resultsRef = useRef<HTMLDivElement>(null)
    const [comSearchResults, setComSearchResults] = useState<ViaCEPResponse[]>([])
    const [showComResults, setShowComResults] = useState(false)
    const comResultsRef = useRef<HTMLDivElement>(null)

    // Sincronizar quando vem de fora (ex: LeadModal → Fazer Proposta)
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab)
        if (initialProposalLeadId) setPendingProposalLeadId(initialProposalLeadId)
    }, [initialTab, initialProposalLeadId])

    // AI State
    const [isAnalyzed, setIsAnalyzed] = useState(false)
    const [analysisLoading, setAnalysisLoading] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<string | null>(null)

    const [clientNotes, setClientNotes] = useState<any[]>([])
    const [newNoteContent, setNewNoteContent] = useState('')
    const [isSavingNote, setIsSavingNote] = useState(false)
    const [showNotesHistory, setShowNotesHistory] = useState(true)
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
    const [editingNoteText, setEditingNoteText] = useState('')
    const [isSavingEditedNote, setIsSavingEditedNote] = useState(false)
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

    // States para controle de visitas nas notas
    const [isVisit, setIsVisit] = useState(false)
    const [visitNumber, setVisitNumber] = useState<number>(1)
    const [isRegisteredProperty, setIsRegisteredProperty] = useState(true)
    const [selectedVisitProperty, setSelectedVisitProperty] = useState<any>(null)
    const [unregisteredVisitProperty, setUnregisteredVisitProperty] = useState('')

    const toggleNoteExpanded = (noteId: string) => {
        setExpandedNotes(prev => ({ ...prev, [noteId]: !prev[noteId] }))
    }

    const formatNoteDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        } catch { return dateStr }
    }

    const getFirstSentence = (text: string) => {
        if (!text) return ''
        const firstLine = text.split('\n')[0].trim()
        return firstLine || 'Nota...'
    }

    const loadClientNotes = async () => {
        if (!editingClient?.id) return
        const res = await getNotesByContactId(editingClient.id)
        if (res.success && res.data) {
            setClientNotes(res.data)
        }
    }

    useEffect(() => {
        if (isOpen && editingClient?.id) {
            loadClientNotes()
        } else {
            setClientNotes([])
        }
    }, [isOpen, editingClient?.id])

    const handleAddNote = async () => {
        const contentStr = newNoteContent.trim()
        const isNoteEmpty = !contentStr
        if ((isNoteEmpty && !isVisit) || !editingClient?.id || !tenantId) return
        setIsSavingNote(true)
        try {
            const defaultVisitText = isRegisteredProperty
                ? `Visita ao imóvel cadastrada.`
                : `Visita ao imóvel cadastrada: ${unregisteredVisitProperty.trim()}`

            const noteData: any = {
                content: contentStr || defaultVisitText,
                contact_id: editingClient.id,
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
                loadClientNotes()
            } else {
                toast.error('Erro ao adicionar nota: ' + res.error)
            }
        } catch (error) {
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
                const res = await clearContactNotes(editingClient!.id!)
                if (res.success) {
                    toast.success('Observações do cliente excluídas!')
                    setFormData(prev => ({ ...prev, notes: '' }))
                    if (editingClient) editingClient.notes = ''
                    onSuccess()
                } else {
                    toast.error('Erro ao excluir observações: ' + res.error)
                }
            } catch (error) {
                toast.error('Ocorreu um erro ao excluir as observações')
            }
            return
        }
        try {
            console.log('[DEBUG] Tentando excluir nota com ID:', noteId)
            const res = await deleteNote(noteId)
            console.log('[DEBUG] Resultado deleteNote:', res)
            if (res.success) {
                toast.success('Nota excluída com sucesso!')
                loadClientNotes()
            } else {
                toast.error('Erro ao excluir nota: ' + res.error)
                console.error('[DEBUG] Erro na exclusão:', res.error)
            }
        } catch (error) {
            console.error('[DEBUG] Exceção ao excluir nota:', error)
            toast.error('Ocorreu um erro ao excluir a nota')
        }
    }

    const handleSaveEditedNote = async (noteId: string) => {
        if (!editingNoteText.trim()) return
        setIsSavingEditedNote(true)
        try {
            if (noteId === 'legacy') {
                const res = await updateClient(editingClient!.id!, { notes: editingNoteText.trim() })
                if (res.success) {
                    toast.success('Observações atualizadas!')
                    setFormData(prev => ({ ...prev, notes: editingNoteText.trim() }))
                    if (editingClient) editingClient.notes = editingNoteText.trim()
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
                    loadClientNotes()
                } else {
                    toast.error('Erro ao atualizar nota: ' + res.error)
                }
            }
        } catch (error) {
            toast.error('Ocorreu um erro ao atualizar a nota')
        } finally {
            setIsSavingEditedNote(false)
        }
    }

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        interest: '',
        cpf: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        address_zip_code: '',
        com_address_street: '',
        com_address_number: '',
        com_address_complement: '',
        com_address_neighborhood: '',
        com_address_city: '',
        com_address_state: '',
        com_address_zip_code: '',
        com_address_same: false,
        marital_status: '',
        birth_date: '',
        contact_type: [] as string[],
        property_regime: '',
        spouse_name: '',
        spouse_email: '',
        spouse_phone: '',
        spouse_cpf: '',
        spouse_birth_date: '',
        spouse_instagram: '',
        spouse_linkedin: '',
        spouse_rg_cnh: '',
        spouse_rg_cnh_date: '',
        spouse_issuing_agency: '',
        spouse_profession: '',
        spouse_naturalness: '',
        spouse_nationality: '',
        spouse_favorite_team: '',
        spouse_marital_status: '',
        spouse_property_regime: '',
        spouse_marriage_date: '',
        spouse_father_name: '',
        spouse_mother_name: '',
        marriage_date: '',
        rg_cnh: '',
        rg_cnh_date: '',
        issuing_agency: '',
        profession: '',
        naturalness: '',
        nationality: '',
        father_name: '',
        mother_name: '',
        instagram: '',
        linkedin: '',
        favorite_team: '',
        notes: '',
        images: [] as string[],
        videos: [] as string[],
        documents: [] as { name: string; url: string }[]
    })

    // Preencher form quando editando
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab || 'info')
        }
    }, [isOpen, initialTab])

    useEffect(() => {
        if (!isOpen) return

        if (editingClient) {
            setFormData({
                name: editingClient.name || '',
                email: editingClient.email || '',
                phone: editingClient.phone ? formatPhone(editingClient.phone) : '',
                interest: editingClient.interest || '',
                cpf: editingClient.cpf || '',
                address_street: editingClient.address_street || '',
                address_number: editingClient.address_number || '',
                address_complement: editingClient.address_complement || '',
                address_neighborhood: editingClient.address_neighborhood || '',
                address_city: editingClient.address_city || '',
                address_state: editingClient.address_state || '',
                address_zip_code: editingClient.address_zip_code || '',
                com_address_street: editingClient.com_address_street || '',
                com_address_number: editingClient.com_address_number || '',
                com_address_complement: editingClient.com_address_complement || '',
                com_address_neighborhood: editingClient.com_address_neighborhood || '',
                com_address_city: editingClient.com_address_city || '',
                com_address_state: editingClient.com_address_state || '',
                com_address_zip_code: editingClient.com_address_zip_code || '',
                com_address_same: editingClient.com_address_same || false,
                marital_status: editingClient.marital_status || '',
                birth_date: editingClient.birth_date || '',
                contact_type: editingClient.contact_type || [],
                property_regime: editingClient.property_regime || '',
                spouse_name: editingClient.spouse_name || '',
                spouse_email: editingClient.spouse_email || '',
                spouse_phone: editingClient.spouse_phone ? formatPhone(editingClient.spouse_phone) : '',
                spouse_cpf: editingClient.spouse_cpf || '',
                spouse_birth_date: editingClient.spouse_birth_date || '',
                spouse_instagram: editingClient.spouse_instagram || '',
                spouse_linkedin: editingClient.spouse_linkedin || '',
                spouse_rg_cnh: editingClient.spouse_rg_cnh || '',
                spouse_rg_cnh_date: editingClient.spouse_rg_cnh_date || '',
                spouse_issuing_agency: editingClient.spouse_issuing_agency || '',
                spouse_profession: editingClient.spouse_profession || '',
                spouse_naturalness: editingClient.spouse_naturalness || '',
                spouse_nationality: editingClient.spouse_nationality || '',
                spouse_favorite_team: editingClient.spouse_favorite_team || '',
                spouse_marital_status: editingClient.spouse_marital_status || '',
                spouse_property_regime: editingClient.spouse_property_regime || '',
                spouse_marriage_date: editingClient.spouse_marriage_date || '',
                spouse_father_name: editingClient.spouse_father_name || '',
                spouse_mother_name: editingClient.spouse_mother_name || '',
                marriage_date: editingClient.marriage_date || '',
                rg_cnh: editingClient.rg_cnh || '',
                rg_cnh_date: editingClient.rg_cnh_date || '',
                issuing_agency: editingClient.issuing_agency || '',
                profession: editingClient.profession || '',
                naturalness: editingClient.naturalness || '',
                nationality: editingClient.nationality || '',
                father_name: editingClient.father_name || '',
                mother_name: editingClient.mother_name || '',
                instagram: editingClient.instagram || '',
                linkedin: editingClient.linkedin || '',
                favorite_team: editingClient.favorite_team || '',
                notes: editingClient.notes || '',
                images: editingClient.images || [],
                videos: editingClient.videos || [],
                documents: editingClient.documents || []
            })
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                interest: '',
                cpf: '',
                address_street: '',
                address_number: '',
                address_complement: '',
                address_neighborhood: '',
                address_city: '',
                address_state: '',
                address_zip_code: '',
                com_address_street: '',
                com_address_number: '',
                com_address_complement: '',
                com_address_neighborhood: '',
                com_address_city: '',
                com_address_state: '',
                com_address_zip_code: '',
                com_address_same: false,
                marital_status: '',
                birth_date: '',
                contact_type: [],
                property_regime: '',
                spouse_name: '',
                spouse_email: '',
                spouse_phone: '',
                spouse_cpf: '',
                spouse_birth_date: '',
                spouse_instagram: '',
                spouse_linkedin: '',
                spouse_rg_cnh: '',
                spouse_rg_cnh_date: '',
                spouse_issuing_agency: '',
                spouse_profession: '',
                spouse_naturalness: '',
                spouse_nationality: '',
                spouse_favorite_team: '',
                spouse_marital_status: '',
                spouse_property_regime: '',
                spouse_marriage_date: '',
                spouse_father_name: '',
                spouse_mother_name: '',
                marriage_date: '',
                rg_cnh: '',
                rg_cnh_date: '',
                issuing_agency: '',
                profession: '',
                naturalness: '',
                nationality: '',
                father_name: '',
                mother_name: '',
                instagram: '',
                linkedin: '',
                favorite_team: '',
                notes: '',
                images: [],
                videos: [],
                documents: []
            })
        }

        // Reset AI
        setIsAnalyzed(false)
        setAnalysisResult(null)
    }, [isOpen, editingClient, initialTab])

    // Click outside para fechar resultado de CEP
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
            if (comResultsRef.current && !comResultsRef.current.contains(event.target as Node)) {
                setShowComResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMediaUpload = (type: 'images' | 'videos' | 'documents', files: any[]) => {
        setFormData(prev => ({
            ...prev,
            [type]: [...prev[type], ...files]
        }))
    }

    const handleMediaRemove = (type: 'images' | 'videos' | 'documents', index: number) => {
        setFormData(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }))
    }

    const handleCepChange = async (cep: string) => {
        const formattedCep = formatCEP(cep)
        const digitsOnly = formattedCep.replace(/\D/g, '')

        if (digitsOnly.length < 8) {
            setFormData(prev => ({
                ...prev,
                address_zip_code: formattedCep,
                address_street: '',
                address_neighborhood: '',
                address_city: '',
                address_state: '',
                address_complement: '',
                address_number: ''
            }))
        } else {
            setFormData(prev => ({ ...prev, address_zip_code: formattedCep }))
        }

        if (digitsOnly.length === 8) {
            setCepLoading(true)
            try {
                const address = await fetchAddressByCep(formattedCep)
                if (address) {
                    setFormData(prev => ({
                        ...prev,
                        address_street: address.logradouro || prev.address_street,
                        address_neighborhood: address.bairro || prev.address_neighborhood,
                        address_city: address.localidade || prev.address_city,
                        address_state: address.uf || prev.address_state,
                        address_zip_code: formattedCep
                    }))
                }
            } finally {
                setCepLoading(false)
            }
        }
    }

    const handleSearchAddress = async () => {
        const { address_street: rua, address_city: cidade, address_state: estado } = formData

        if (!estado || estado.length !== 2) {
            toast.error('Informe o estado (UF) com 2 letras')
            return
        }
        if (!cidade || cidade.length < 3) {
            toast.error('Informe a cidade (mínimo 3 letras)')
            return
        }
        if (!rua || rua.length < 3) {
            toast.error('Informe a rua (mínimo 3 letras)')
            return
        }

        setCepLoading(true)
        try {
            const results = await fetchCepByAddress(estado, cidade, rua)
            setSearchResults(results)
            setShowResults(true)
            if (results.length === 0) {
                toast.error('Nenhum CEP encontrado para este endereço')
            }
        } catch (error) {
            console.error('Error searching address:', error)
            toast.error('Erro ao buscar endereço')
        } finally {
            setCepLoading(false)
        }
    }

    const selectAddress = (address: ViaCEPResponse) => {
        setFormData(prev => ({
            ...prev,
            address_street: address.logradouro,
            address_neighborhood: address.bairro,
            address_city: address.localidade,
            address_state: address.uf,
            address_zip_code: formatCEP(address.cep)
        }))
        setShowResults(false)
    }

    const handleComCepChange = async (cep: string) => {
        const formattedCep = formatCEP(cep)
        const digitsOnly = formattedCep.replace(/\D/g, '')

        if (digitsOnly.length < 8) {
            setFormData(prev => ({
                ...prev,
                com_address_zip_code: formattedCep,
                com_address_street: '',
                com_address_neighborhood: '',
                com_address_city: '',
                com_address_state: '',
                com_address_complement: '',
                com_address_number: ''
            }))
        } else {
            setFormData(prev => ({ ...prev, com_address_zip_code: formattedCep }))
        }

        if (digitsOnly.length === 8) {
            setCepLoading(true)
            try {
                const address = await fetchAddressByCep(formattedCep)
                if (address) {
                    setFormData(prev => ({
                        ...prev,
                        com_address_street: address.logradouro || prev.com_address_street,
                        com_address_neighborhood: address.bairro || prev.com_address_neighborhood,
                        com_address_city: address.localidade || prev.com_address_city,
                        com_address_state: address.uf || prev.com_address_state,
                        com_address_zip_code: formattedCep
                    }))
                }
            } finally {
                setCepLoading(false)
            }
        }
    }

    const handleComSearchAddress = async () => {
        const { com_address_street: rua, com_address_city: cidade, com_address_state: estado } = formData

        if (!estado || estado.length !== 2) {
            toast.error('Informe o estado (UF) com 2 letras')
            return
        }
        if (!cidade || cidade.length < 3) {
            toast.error('Informe a cidade (mínimo 3 letras)')
            return
        }
        if (!rua || rua.length < 3) {
            toast.error('Informe a rua (mínimo 3 letras)')
            return
        }

        setCepLoading(true)
        try {
            const results = await fetchCepByAddress(estado, cidade, rua)
            setComSearchResults(results)
            setShowComResults(true)
            if (results.length === 0) {
                toast.error('Nenhum CEP encontrado para este endereço')
            }
        } catch (error) {
            console.error('Error searching address:', error)
            toast.error('Erro ao buscar endereço')
        } finally {
            setCepLoading(false)
        }
    }

    const selectComAddress = (address: ViaCEPResponse) => {
        setFormData(prev => ({
            ...prev,
            com_address_street: address.logradouro,
            com_address_neighborhood: address.bairro,
            com_address_city: address.localidade,
            com_address_state: address.uf,
            com_address_zip_code: formatCEP(address.cep)
        }))
        setShowComResults(false)
    }

    const handleComAddressSameChange = (checked: boolean) => {
        setFormData(prev => {
            if (checked) {
                return {
                    ...prev,
                    com_address_same: true,
                    com_address_street: prev.address_street,
                    com_address_number: prev.address_number,
                    com_address_complement: prev.address_complement,
                    com_address_neighborhood: prev.address_neighborhood,
                    com_address_city: prev.address_city,
                    com_address_state: prev.address_state,
                    com_address_zip_code: prev.address_zip_code,
                };
            } else {
                return {
                    ...prev,
                    com_address_same: false,
                    com_address_street: '',
                    com_address_number: '',
                    com_address_complement: '',
                    com_address_neighborhood: '',
                    com_address_city: '',
                    com_address_state: '',
                    com_address_zip_code: '',
                };
            }
        });
    }

    // Sincronização em tempo real do endereço comercial com o residencial quando com_address_same for true
    useEffect(() => {
        if (formData.com_address_same) {
            setFormData(prev => {
                if (
                    prev.com_address_street !== prev.address_street ||
                    prev.com_address_number !== prev.address_number ||
                    prev.com_address_complement !== prev.address_complement ||
                    prev.com_address_neighborhood !== prev.address_neighborhood ||
                    prev.com_address_city !== prev.address_city ||
                    prev.com_address_state !== prev.address_state ||
                    prev.com_address_zip_code !== prev.address_zip_code
                ) {
                    return {
                        ...prev,
                        com_address_street: prev.address_street,
                        com_address_number: prev.address_number,
                        com_address_complement: prev.address_complement,
                        com_address_neighborhood: prev.address_neighborhood,
                        com_address_city: prev.address_city,
                        com_address_state: prev.address_state,
                        com_address_zip_code: prev.address_zip_code,
                    };
                }
                return prev;
            });
        }
    }, [
        formData.com_address_same,
        formData.address_street,
        formData.address_number,
        formData.address_complement,
        formData.address_neighborhood,
        formData.address_city,
        formData.address_state,
        formData.address_zip_code
    ]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let res;
            if (editingClient?.id) {
                res = await updateClient(editingClient.id, formData)
            } else {
                res = await createNewClient(tenantId, formData)
            }

            if (res.success) {
                toast.success(editingClient ? 'Cliente atualizado!' : 'Cliente criado com sucesso!')
                onSuccess()
                if (!editingClient) {
                    onClose()
                }
            } else {
                toast.error('Erro: ' + res.error)
            }
        } catch (err) {
            toast.error('Erro inesperado')
        } finally {
            setLoading(false)
        }
    }

    const handleAnalyze = async () => {
        setAnalysisLoading(true)
        try {
            const result = await analyzeLeadProbability({
                tenant_id: tenantId,
                profile_id: profileId,
                name: editingClient?.name || '',
                phone: editingClient?.phone || '',
                source: editingClient?.interest || '',
                interactions: [editingClient?.notes || '']
            })
            if (result.success) {
                setAnalysisResult(result.analysis)
                setIsAnalyzed(true)
            } else {
                toast.error('Erro ao gerar análise.')
            }
        } catch (error) {
            toast.error('Erro na conexão com IA.')
        } finally {
            setAnalysisLoading(false)
        }
    }

    const isEditing = !!editingClient?.id

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                    {isEditing ? "Editar Cliente" : "Novo Cliente"}
                </h3>
            }
            size="2xl"
            align="top"
            fullHeight={true}
            className="rounded-lg"
            extraHeaderContent={
                <button
                    type="submit"
                    form="client-modal-form"
                    disabled={loading}
                    className="bg-secondary text-secondary-foreground font-bold px-4 py-1.5 rounded-md hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-sm whitespace-nowrap"
                >
                    {loading ? 'Salvando...' : (isEditing ? 'Atualizar Dados' : 'Criar Cliente')}
                </button>
            }
        >
            <div className="flex flex-col h-full">
                {/* Tabs — só para clientes existentes */}
                {isEditing && (
                    <div className="w-full flex items-center border-b border-border overflow-x-auto no-scrollbar mb-6 shrink-0">
                        <button
                            type="button"
                            role="tab"
                            onClick={() => setActiveTab('info')}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-base font-bold transition-all relative whitespace-nowrap border-b-[3px] ${activeTab === 'info' ? 'bg-secondary text-secondary-foreground rounded-t-lg border-transparent' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
                        >
                            <User size={14} strokeWidth={1} />
                            Informações
                        </button>
                        <button
                            type="button"
                            role="tab"
                            onClick={() => setActiveTab('leads')}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-base font-bold transition-all relative whitespace-nowrap border-b-[3px] ${activeTab === 'leads' ? 'bg-secondary text-secondary-foreground rounded-t-lg border-transparent' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
                        >
                            <Filter size={14} strokeWidth={1} />
                            Leads
                        </button>
                        <button
                            type="button"
                            role="tab"
                            onClick={() => setActiveTab('proposals')}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-base font-bold transition-all relative whitespace-nowrap border-b-[3px] ${activeTab === 'proposals' ? 'bg-secondary text-secondary-foreground rounded-t-lg border-transparent' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
                        >
                            <Pen size={14} strokeWidth={1} className="-scale-x-100" />
                            Propostas
                        </button>
                        <button
                            type="button"
                            role="tab"
                            onClick={() => setActiveTab('documents')}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-base font-bold transition-all relative whitespace-nowrap border-b-[3px] ${activeTab === 'documents' ? 'bg-secondary text-secondary-foreground rounded-t-lg border-transparent' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
                        >
                            <FileText size={14} strokeWidth={1} />
                            Documentos
                        </button>
                        <button
                            type="button"
                            role="tab"
                            onClick={() => setActiveTab('financeiro')}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-base font-bold transition-all relative whitespace-nowrap border-b-[3px] ${activeTab === 'financeiro' ? 'bg-secondary text-secondary-foreground rounded-t-lg border-transparent' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
                        >
                            <DollarSign size={14} strokeWidth={1} />
                            Financeiro
                        </button>
                        <button
                            type="button"
                            role="tab"
                            onClick={() => setActiveTab('ai')}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-base font-bold transition-all relative whitespace-nowrap border-b-[3px] ${activeTab === 'ai' ? 'bg-secondary text-secondary-foreground rounded-t-lg border-transparent' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
                        >
                            <Sparkles size={14} strokeWidth={1} />
                            Análise IA
                        </button>
                    </div>
                )}

                {/* Tab: Informações */}
                {activeTab === 'info' && (
                    <form id="client-modal-form" onSubmit={handleSubmit} className="space-y-8 px-1 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Dados Pessoais */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Dados Pessoais</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 flex flex-col md:flex-row md:items-end gap-4">
                                    <div className="flex-1">
                                        <FormInput
                                            label="Nome Completo"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ex: João Silva"
                                        />
                                    </div>
                                    {/* Tipo de Contato */}
                                    <div className="flex items-center gap-3 pb-[10px] shrink-0">
                                        {[
                                            { value: 'comprador', label: 'Comprador' },
                                            { value: 'vendedor', label: 'Vendedor' },
                                            { value: 'construtora', label: 'Construtora' }
                                        ].map(option => {
                                            const isChecked = formData.contact_type.includes(option.value)
                                            return (
                                                <label
                                                    key={option.value}
                                                    className="flex items-center gap-1.5 cursor-pointer select-none group"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            const updated = isChecked
                                                                ? formData.contact_type.filter((t: string) => t !== option.value)
                                                                : [...formData.contact_type, option.value]
                                                            setFormData({ ...formData, contact_type: updated })
                                                        }}
                                                        className="w-4 h-4 rounded border-muted-foreground/40 bg-foreground/5 text-secondary focus:ring-secondary/30 focus:ring-offset-0 cursor-pointer accent-[#FFE600]"
                                                    />
                                                    <span className={`text-xs font-bold transition-colors ${isChecked ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground/80'}`}>
                                                        {option.label}
                                                    </span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormInput
                                        label="Telefone"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                        placeholder="(48) 99999 9999"
                                        rightElement={
                                            formData.phone && (
                                                <a
                                                    href={`https://wa.me/55${formData.phone.replace(/\D/g, '')}`}
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
                                    <FormInput
                                        label="E-mail"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="joao@exemplo.com"
                                    />
                                    <FormInput
                                        label="Instagram"
                                        value={formData.instagram}
                                        onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                                        placeholder="@usuario"
                                    />
                                    <FormInput
                                        label="Linkedin"
                                        value={formData.linkedin}
                                        onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                                        placeholder="linkedin.com/in/..."
                                    />
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormInput
                                        label="CPF"
                                        value={formData.cpf}
                                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                        placeholder="000.000.000-00"
                                    />
                                    <FormInput
                                        label="RG | CNH"
                                        value={formData.rg_cnh}
                                        onChange={e => setFormData({ ...formData, rg_cnh: e.target.value })}
                                        placeholder="Digite o documento"
                                    />
                                    <FormInput
                                        label="Data expedição | Data validade"
                                        value={formData.rg_cnh_date}
                                        onChange={e => setFormData({ ...formData, rg_cnh_date: e.target.value })}
                                        placeholder="ex: dd/mm/aaaa | dd/mm/aaaa"
                                    />
                                    <FormInput
                                        label="Órgão Expedidor"
                                        value={formData.issuing_agency}
                                        onChange={e => setFormData({ ...formData, issuing_agency: e.target.value })}
                                        placeholder="ex: SSP/SC"
                                    />
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormInput
                                        label="Profissão"
                                        value={formData.profession}
                                        onChange={e => setFormData({ ...formData, profession: e.target.value })}
                                        placeholder="Ex: Corretor de Imóveis"
                                    />
                                    <FormInput
                                        label="Naturalidade"
                                        value={formData.naturalness}
                                        onChange={e => setFormData({ ...formData, naturalness: e.target.value })}
                                        placeholder="Ex: Florianópolis - SC"
                                    />
                                    <FormInput
                                        label="Nacionalidade"
                                        value={formData.nationality}
                                        onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                                        placeholder="Ex: Brasileira"
                                    />
                                    <FormInput
                                        label="Time Coração"
                                        value={formData.favorite_team}
                                        onChange={e => setFormData({ ...formData, favorite_team: e.target.value })}
                                        placeholder="Time do coração"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormInput
                                        label="Data Nascimento"
                                        type="date"
                                        value={formData.birth_date}
                                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                    />
                                    <FormSelect
                                        label="Estado Civil"
                                        value={formData.marital_status}
                                        onChange={e => setFormData({ ...formData, marital_status: e.target.value })}
                                        options={[
                                            { value: '', label: 'Selecione...' },
                                            { value: 'Solteiro(a)', label: 'Solteiro(a)' },
                                            { value: 'Casado(a)', label: 'Casado(a)' },
                                            { value: 'Divorciado(a)', label: 'Divorciado(a)' },
                                            { value: 'Viúvo(a)', label: 'Viúvo(a)' },
                                            { value: 'União Estável', label: 'União Estável' }
                                        ]}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormSelect
                                        label="Regime Casamento"
                                        value={formData.property_regime}
                                        onChange={e => setFormData({ ...formData, property_regime: e.target.value })}
                                        options={[
                                            { value: '', label: 'Selecione...' },
                                            { value: 'Comunhão Parcial', label: 'Comunhão Parcial' },
                                            { value: 'Comunhão Universal', label: 'Comunhão Universal' },
                                            { value: 'Separação Total', label: 'Separação Total' },
                                            { value: 'Separação Obrigatória', label: 'Separação Obrigatória' },
                                            { value: 'Participação Final nos Aquestos', label: 'Participação Final nos Aquestos' }
                                        ]}
                                    />
                                    <FormInput
                                        label="Data Casamento"
                                        type="date"
                                        value={formData.marriage_date}
                                        onChange={e => setFormData({ ...formData, marriage_date: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormInput
                                        label="Nome do Pai"
                                        value={formData.father_name}
                                        onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                                        placeholder="Nome completo do pai"
                                    />
                                    <FormInput
                                        label="Nome da Mãe"
                                        value={formData.mother_name}
                                        onChange={e => setFormData({ ...formData, mother_name: e.target.value })}
                                        placeholder="Nome completo da mãe"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Cônjuge | Sócio */}
                        <div className="space-y-4 pt-8 border-t border-border/50">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Cônjuge | Sócio</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <FormInput
                                        label="Nome Completo"
                                        value={formData.spouse_name}
                                        onChange={e => setFormData({ ...formData, spouse_name: e.target.value })}
                                        placeholder="Nome do cônjuge ou sócio"
                                    />
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormInput
                                        label="Telefone"
                                        value={formData.spouse_phone}
                                        onChange={e => setFormData({ ...formData, spouse_phone: formatPhone(e.target.value) })}
                                        placeholder="(48) 99999 9999"
                                        rightElement={
                                            formData.spouse_phone && (
                                                <a
                                                    href={`https://wa.me/55${formData.spouse_phone.replace(/\D/g, '')}`}
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
                                    <FormInput
                                        label="E-mail"
                                        type="email"
                                        value={formData.spouse_email}
                                        onChange={e => setFormData({ ...formData, spouse_email: e.target.value })}
                                        placeholder="email@exemplo.com"
                                    />
                                    <FormInput
                                        label="Instagram"
                                        value={formData.spouse_instagram}
                                        onChange={e => setFormData({ ...formData, spouse_instagram: e.target.value })}
                                        placeholder="@usuario"
                                    />
                                    <FormInput
                                        label="Linkedin"
                                        value={formData.spouse_linkedin}
                                        onChange={e => setFormData({ ...formData, spouse_linkedin: e.target.value })}
                                        placeholder="linkedin.com/in/..."
                                    />
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormInput
                                        label="CPF"
                                        value={formData.spouse_cpf}
                                        onChange={e => setFormData({ ...formData, spouse_cpf: e.target.value })}
                                        placeholder="000.000.000-00"
                                    />
                                    <FormInput
                                        label="RG | CNH"
                                        value={formData.spouse_rg_cnh}
                                        onChange={e => setFormData({ ...formData, spouse_rg_cnh: e.target.value })}
                                        placeholder="Digite o documento"
                                    />
                                    <FormInput
                                        label="Data expedição | Data validade"
                                        value={formData.spouse_rg_cnh_date}
                                        onChange={e => setFormData({ ...formData, spouse_rg_cnh_date: e.target.value })}
                                        placeholder="ex: dd/mm/aaaa | dd/mm/aaaa"
                                    />
                                    <FormInput
                                        label="Órgão Expedidor"
                                        value={formData.spouse_issuing_agency}
                                        onChange={e => setFormData({ ...formData, spouse_issuing_agency: e.target.value })}
                                        placeholder="ex: SSP/SC"
                                    />
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormInput
                                        label="Profissão"
                                        value={formData.spouse_profession}
                                        onChange={e => setFormData({ ...formData, spouse_profession: e.target.value })}
                                        placeholder="Ex: Corretor de Imóveis"
                                    />
                                    <FormInput
                                        label="Naturalidade"
                                        value={formData.spouse_naturalness}
                                        onChange={e => setFormData({ ...formData, spouse_naturalness: e.target.value })}
                                        placeholder="Ex: Florianópolis - SC"
                                    />
                                    <FormInput
                                        label="Nacionalidade"
                                        value={formData.spouse_nationality}
                                        onChange={e => setFormData({ ...formData, spouse_nationality: e.target.value })}
                                        placeholder="Ex: Brasileira"
                                    />
                                    <FormInput
                                        label="Time Coração"
                                        value={formData.spouse_favorite_team}
                                        onChange={e => setFormData({ ...formData, spouse_favorite_team: e.target.value })}
                                        placeholder="Time do coração"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormInput
                                        label="Data Nascimento"
                                        type="date"
                                        value={formData.spouse_birth_date}
                                        onChange={e => setFormData({ ...formData, spouse_birth_date: e.target.value })}
                                    />
                                    <FormSelect
                                        label="Estado Civil"
                                        value={formData.spouse_marital_status}
                                        onChange={e => setFormData({ ...formData, spouse_marital_status: e.target.value })}
                                        options={[
                                            { value: '', label: 'Selecione...' },
                                            { value: 'Solteiro(a)', label: 'Solteiro(a)' },
                                            { value: 'Casado(a)', label: 'Casado(a)' },
                                            { value: 'Divorciado(a)', label: 'Divorciado(a)' },
                                            { value: 'Viúvo(a)', label: 'Viúvo(a)' },
                                            { value: 'União Estável', label: 'União Estável' }
                                        ]}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormSelect
                                        label="Regime Casamento"
                                        value={formData.spouse_property_regime}
                                        onChange={e => setFormData({ ...formData, spouse_property_regime: e.target.value })}
                                        options={[
                                            { value: '', label: 'Selecione...' },
                                            { value: 'Comunhão Parcial', label: 'Comunhão Parcial' },
                                            { value: 'Comunhão Universal', label: 'Comunhão Universal' },
                                            { value: 'Separação Total', label: 'Separação Total' },
                                            { value: 'Separação Obrigatória', label: 'Separação Obrigatória' },
                                            { value: 'Participação Final nos Aquestos', label: 'Participação Final nos Aquestos' }
                                        ]}
                                    />
                                    <FormInput
                                        label="Data Casamento"
                                        type="date"
                                        value={formData.spouse_marriage_date}
                                        onChange={e => setFormData({ ...formData, spouse_marriage_date: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormInput
                                        label="Nome do Pai"
                                        value={formData.spouse_father_name}
                                        onChange={e => setFormData({ ...formData, spouse_father_name: e.target.value })}
                                        placeholder="Nome completo do pai"
                                    />
                                    <FormInput
                                        label="Nome da Mãe"
                                        value={formData.spouse_mother_name}
                                        onChange={e => setFormData({ ...formData, spouse_mother_name: e.target.value })}
                                        placeholder="Nome completo da mãe"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Endereço Residencial */}
                        <div className="space-y-4 pt-8 border-t border-border/50">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">
                                Endereço Residencial
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-3 gap-y-6">
                                <div className="sm:col-span-1 lg:col-span-3">
                                    <FormInput
                                        label={
                                            <div className="flex items-center gap-1">
                                                CEP <span className="text-[9px] lowercase font-normal opacity-70">(digite para buscar endereço)</span>
                                            </div>
                                        }
                                        value={formData.address_zip_code}
                                        onChange={e => handleCepChange(e.target.value)}
                                        placeholder="00000-000"
                                        disabled={cepLoading}
                                    />
                                </div>
                                <div className="sm:col-span-2 lg:col-span-7 relative" ref={resultsRef}>
                                    <FormInput
                                        label="Avenida | Rua"
                                        value={formData.address_street}
                                        onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                        placeholder="Rua / Avenida"
                                        rightElement={
                                            <button
                                                type="button"
                                                onClick={handleSearchAddress}
                                                className="p-1 hover:bg-muted rounded-md transition-colors text-foreground"
                                                title="Buscar CEP por endereço"
                                                disabled={cepLoading}
                                            >
                                                {cepLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                            </button>
                                        }
                                    />

                                    {showResults && (
                                        <div className="absolute z-50 w-full mt-1 bg-card border border-muted-foreground/30 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            {searchResults.length > 0 ? (
                                                searchResults.map((result, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => selectAddress(result)}
                                                        className="w-full text-left px-4 py-2 hover:bg-secondary/10 border-b border-muted-foreground/10 last:border-0 transition-colors"
                                                    >
                                                        <div className="text-sm font-medium">{result.logradouro}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {result.bairro}, {result.localidade} - {result.uf} | CEP: {result.cep}
                                                        </div>
                                                    </button>
                                                ))
                                            ) : !cepLoading && (
                                                <div className="p-4 text-center text-sm text-muted-foreground">
                                                    Nenhum endereço encontrado.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="sm:col-span-1 lg:col-span-2">
                                    <FormInput
                                        label="Nº"
                                        value={formData.address_number}
                                        onChange={e => setFormData({ ...formData, address_number: e.target.value })}
                                        placeholder="123"
                                    />
                                </div>
                                <div className="sm:col-span-1 lg:col-span-3">
                                    <FormInput
                                        label="Complemento"
                                        value={formData.address_complement}
                                        onChange={e => setFormData({ ...formData, address_complement: e.target.value })}
                                        placeholder="Apto, Bloco, etc"
                                    />
                                </div>
                                <div className="sm:col-span-1 lg:col-span-3">
                                    <FormInput
                                        label="Bairro"
                                        value={formData.address_neighborhood}
                                        onChange={e => setFormData({ ...formData, address_neighborhood: e.target.value })}
                                        placeholder="Bairro"
                                    />
                                </div>
                                <div className="sm:col-span-1 lg:col-span-4">
                                    <FormInput
                                        label="Cidade"
                                        value={formData.address_city}
                                        onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                                        placeholder="Cidade"
                                    />
                                </div>
                                <div className="sm:col-span-1 lg:col-span-2">
                                    <FormInput
                                        label="Estado"
                                        value={formData.address_state}
                                        onChange={e => setFormData({ ...formData, address_state: e.target.value })}
                                        maxLength={2}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Endereço Comercial */}
                        <div className="space-y-4 pt-8 border-t border-border/50">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">
                                    Endereço Comercial
                                </h3>
                                <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                                    <input
                                        type="checkbox"
                                        checked={formData.com_address_same || false}
                                        onChange={e => handleComAddressSameChange(e.target.checked)}
                                        className="w-4 h-4 rounded border-muted-foreground/40 bg-foreground/5 text-secondary focus:ring-secondary/30 focus:ring-offset-0 cursor-pointer accent-[#FFE600]"
                                    />
                                    <span className={`text-xs font-bold transition-colors ${formData.com_address_same ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground/80'}`}>
                                        Mesmo Residencial
                                    </span>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-3 gap-y-6">
                                <div className="sm:col-span-1 lg:col-span-3">
                                    <FormInput
                                        label={
                                            <div className="flex items-center gap-1">
                                                CEP <span className="text-[9px] lowercase font-normal opacity-70">(digite para buscar endereço)</span>
                                            </div>
                                        }
                                        value={formData.com_address_zip_code}
                                        onChange={e => handleComCepChange(e.target.value)}
                                        placeholder="00000-000"
                                        disabled={cepLoading || formData.com_address_same}
                                    />
                                </div>
                                <div className="sm:col-span-2 lg:col-span-7 relative" ref={comResultsRef}>
                                    <FormInput
                                        label="Avenida | Rua"
                                        value={formData.com_address_street}
                                        onChange={e => setFormData({ ...formData, com_address_street: e.target.value })}
                                        placeholder="Rua / Avenida"
                                        disabled={formData.com_address_same}
                                        rightElement={
                                            !formData.com_address_same && (
                                                <button
                                                    type="button"
                                                    onClick={handleComSearchAddress}
                                                    className="p-1 hover:bg-muted rounded-md transition-colors text-foreground"
                                                    title="Buscar CEP por endereço"
                                                    disabled={cepLoading}
                                                >
                                                    {cepLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                                </button>
                                            )
                                        }
                                    />

                                    {showComResults && (
                                        <div className="absolute z-50 w-full mt-1 bg-card border border-muted-foreground/30 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            {comSearchResults.length > 0 ? (
                                                comSearchResults.map((result, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => selectComAddress(result)}
                                                        className="w-full text-left px-4 py-2 hover:bg-secondary/10 border-b border-muted-foreground/10 last:border-0 transition-colors"
                                                    >
                                                        <div className="text-sm font-medium">{result.logradouro}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {result.bairro}, {result.localidade} - {result.uf} | CEP: {result.cep}
                                                        </div>
                                                    </button>
                                                ))
                                            ) : !cepLoading && (
                                                <div className="p-4 text-center text-sm text-muted-foreground">
                                                    Nenhum endereço encontrado.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="sm:col-span-1 lg:col-span-2">
                                    <FormInput
                                        label="Nº"
                                        value={formData.com_address_number}
                                        onChange={e => setFormData({ ...formData, com_address_number: e.target.value })}
                                        placeholder="123"
                                        disabled={formData.com_address_same}
                                    />
                                </div>
                                <div className="sm:col-span-1 lg:col-span-3">
                                    <FormInput
                                        label="Complemento"
                                        value={formData.com_address_complement}
                                        onChange={e => setFormData({ ...formData, com_address_complement: e.target.value })}
                                        placeholder="Apto, Bloco, etc"
                                        disabled={formData.com_address_same}
                                    />
                                </div>
                                <div className="sm:col-span-1 lg:col-span-3">
                                    <FormInput
                                        label="Bairro"
                                        value={formData.com_address_neighborhood}
                                        onChange={e => setFormData({ ...formData, com_address_neighborhood: e.target.value })}
                                        placeholder="Bairro"
                                        disabled={formData.com_address_same}
                                    />
                                </div>
                                <div className="sm:col-span-1 lg:col-span-4">
                                    <FormInput
                                        label="Cidade"
                                        value={formData.com_address_city}
                                        onChange={e => setFormData({ ...formData, com_address_city: e.target.value })}
                                        placeholder="Cidade"
                                        disabled={formData.com_address_same}
                                    />
                                </div>
                                <div className="sm:col-span-1 lg:col-span-2">
                                    <FormInput
                                        label="Estado"
                                        value={formData.com_address_state}
                                        onChange={e => setFormData({ ...formData, com_address_state: e.target.value })}
                                        maxLength={2}
                                        disabled={formData.com_address_same}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Imóveis Visitados / Interesse */}
                        {editingClient && (
                            <div className="space-y-4 pt-8 border-t border-border/50">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Leads</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Interesses dos Leads */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-foreground ml-1">Leads</h4>
                                        {(!editingClient.leads || editingClient.leads.length === 0) ? (
                                            <div className="bg-background/50 p-4 rounded-lg border border-border/40 text-center">
                                                <p className="text-xs text-muted-foreground italic">Nenhum interesse registrado em leads.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                                {editingClient.leads.map((lead: any) => {
                                                    const interestText = lead.property_interest || lead.properties?.title || lead.interest
                                                    if (!interestText) return null
                                                    return (
                                                        <div key={lead.id} className="p-3 bg-background border border-border/40 rounded-lg flex items-center justify-between gap-3 shadow-sm hover:border-muted-foreground/20 transition-all">
                                                            <div className="flex-1 min-w-0">

                                                                {lead.properties ? (
                                                                    <Link
                                                                        href={`/properties/${lead.properties.type}/${lead.properties.slug || lead.properties.id}`}
                                                                        className="text-xs font-bold text-accent-icon hover:underline truncate block"
                                                                    >
                                                                        {lead.properties.title}
                                                                    </Link>
                                                                ) : (
                                                                    <span className="text-xs font-medium text-foreground truncate block">
                                                                        {interestText}
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] text-muted-foreground block mt-0.5">
                                                                    Status: {lead.status_name || lead.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Histórico de Visitas */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-foreground ml-1">Visitas</h4>
                                        {clientNotes.filter(n => n.is_visit).length === 0 ? (
                                            <div className="bg-background/50 p-4 rounded-lg border border-border/40 text-center">
                                                <p className="text-xs text-muted-foreground italic">Nenhuma visita registrada para este cliente.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                                {clientNotes.filter(n => n.is_visit).map((visit) => (
                                                    <div key={visit.id} className="p-3 bg-background border border-border/40 rounded-lg flex items-center justify-between gap-3 shadow-sm hover:border-muted-foreground/20 transition-all">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                                <span className="bg-[#FFE600] text-[#404F4F] px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                                                                    {visit.visit_number}ª Visita
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {visit.date ? new Date(visit.date).toLocaleDateString('pt-BR') : '—'}
                                                                </span>
                                                            </div>
                                                            {visit.properties ? (
                                                                <Link
                                                                    href={`/properties/${visit.properties.type}/${visit.properties.slug || visit.properties.id}`}
                                                                    className="text-xs font-bold text-accent-icon hover:underline truncate block"
                                                                >
                                                                    {visit.properties.title}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-xs font-medium text-muted-foreground italic truncate block">
                                                                    {visit.visit_unregistered_property} (Não cadastrado)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notas */}
                        <div className="space-y-4 pt-8 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Notas</h3>
                                {editingClient && (
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

                            {!editingClient ? (
                                <FormTextarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Alguma observação importante sobre o cliente (será salva como primeira nota)..."
                                    rows={3}
                                />
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <textarea
                                            value={newNoteContent}
                                            onChange={(e) => setNewNoteContent(e.target.value)}
                                            rows={2}
                                            placeholder={isVisit ? "Observações sobre a visita (opcional)..." : "Escreva uma nova nota sobre o cliente..."}
                                            className="w-full bg-background border border-muted-foreground/30 rounded-lg p-3 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                                        />
                                    </div>

                                    {/* Checkbox de Visita */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="client-is-visit-checkbox"
                                            checked={isVisit}
                                            onChange={(e) => {
                                                setIsVisit(e.target.checked)
                                                if (e.target.checked) {
                                                    const visitsCount = clientNotes.filter(n => n.is_visit).length
                                                    setVisitNumber(visitsCount + 1)
                                                }
                                            }}
                                            className="rounded border-muted-foreground/30 text-secondary focus:ring-secondary cursor-pointer h-4 w-4"
                                        />
                                        <label htmlFor="client-is-visit-checkbox" className="text-xs font-bold text-foreground cursor-pointer select-none">
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
                                                            name="clientPropertyType"
                                                            checked={isRegisteredProperty}
                                                            onChange={() => setIsRegisteredProperty(true)}
                                                            className="text-secondary focus:ring-secondary h-4 w-4"
                                                        />
                                                        Cadastrado
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer font-medium">
                                                        <input
                                                            type="radio"
                                                            name="clientPropertyType"
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

                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowNotesHistory(!showNotesHistory)}
                                            className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-foreground uppercase tracking-wider transition-colors cursor-pointer"
                                        >
                                            <span>Notas salvas ({clientNotes.length + (formData.notes ? 1 : 0)})</span>
                                            <div className="flex items-center gap-1">
                                                {showNotesHistory ? <ChevronDown className="rotate-180 transition-transform" size={14} /> : <ChevronDown className="transition-transform" size={14} />}
                                            </div>
                                        </button>

                                        {showNotesHistory && (() => {
                                            const sortedNotes = [...clientNotes]
                                            if (formData.notes) {
                                                sortedNotes.push({
                                                    id: 'legacy',
                                                    content: formData.notes,
                                                    created_at: editingClient?.created_at || new Date(0).toISOString(),
                                                    profiles: { full_name: 'Observação de Cadastro' }
                                                })
                                            }
                                            sortedNotes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

                                            return (
                                                <div className="space-y-3 pr-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {sortedNotes.length === 0 && (
                                                        <p className="text-xs text-muted-foreground text-center py-4">
                                                            Nenhuma nota registrada para este cliente ainda.
                                                        </p>
                                                    )}

                                                    {sortedNotes.map((note) => {
                                                        const isExpanded = !!expandedNotes[note.id]
                                                        const isEditing = editingNoteId === note.id
                                                        const isLegacy = note.id === 'legacy'

                                                        if (isEditing) {
                                                            return (
                                                                <div key={note.id} className="p-3 bg-background border border-border/40 rounded-lg space-y-2">
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

                        {/* Mídias e Docs */}
                        <div className="space-y-4 pt-8 border-t border-border/50">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Mídias e Docs</h3>
                            <MediaUpload
                                pathPrefix={`clients/${tenantId}`}
                                images={formData.images}
                                videos={formData.videos}
                                documents={formData.documents}
                                onUpload={handleMediaUpload}
                                onRemove={handleMediaRemove}
                            />
                        </div>
                    </form>
                )}

                {/* Tab: Leads */}
                {activeTab === 'leads' && isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex-1 min-h-0 overflow-y-auto">
                        <ClientLeadsTab client={editingClient} clientNotes={clientNotes} onMakeProposal={(leadId: string) => {
                            setPendingProposalLeadId(leadId)
                            setActiveTab('proposals')
                        }} />
                    </div>
                )}

                {/* Tab: Propostas */}
                {activeTab === 'proposals' && isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col flex-1 min-h-0">
                        <ClientProposalsTab
                            client={editingClient}
                            tenantId={tenantId}
                            initialLeadId={pendingProposalLeadId}
                            onConsumeInitialLead={() => setPendingProposalLeadId(null)}
                            onSuccess={onSuccess}
                        />
                    </div>
                )}

                {/* Tab: Documentos */}
                {activeTab === 'documents' && isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex-1 min-h-0 overflow-y-auto">
                        <ClientLeadSelectorTab
                            client={editingClient}
                            tenantId={tenantId}
                            renderTab={(leadId, leadName, propertyInterest) => (
                                <LeadDocumentsTab
                                    leadId={leadId}
                                    tenantId={tenantId}
                                    leadName={leadName}
                                    propertyInterest={propertyInterest}
                                    userRole="admin"
                                />
                            )}
                            emptyMessage="Selecione um lead para gerenciar documentos."
                        />
                    </div>
                )}

                {/* Tab: Financeiro */}
                {activeTab === 'financeiro' && isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col flex-1 min-h-0">
                        <ClientFinanceSelectorTab
                            client={editingClient}
                            tenantId={tenantId}
                        />
                    </div>
                )}

                {/* Tab: Análise IA */}
                {activeTab === 'ai' && isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex-1 min-h-0 overflow-y-auto">
                        <ClientAITab
                            isAnalyzed={isAnalyzed}
                            analysisLoading={analysisLoading}
                            analysisResult={analysisResult}
                            handleAnalyze={handleAnalyze}
                            setIsAnalyzed={setIsAnalyzed}
                        />
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={!!noteToDelete}
                onCancel={() => setNoteToDelete(null)}
                title="Excluir Nota"
                message={noteToDelete === 'legacy' ? "Deseja realmente excluir a observação de cadastro do cliente?" : "Deseja realmente excluir esta nota? Esta ação não poderá ser desfeita."}
                confirmLabel="Excluir"
                onConfirm={async () => {
                    if (noteToDelete) {
                        await executeDeleteNote(noteToDelete)
                        setNoteToDelete(null)
                    }
                }}
            />
        </Modal>
    )
}

// ─── Wrapper com seletor de Lead para Docs/Financeiro ────────────────

function ClientLeadSelectorTab({
    client,
    tenantId,
    renderTab,
    emptyMessage
}: {
    client: any
    tenantId: string
    renderTab: (leadId: string, leadName: string, propertyInterest: string, assignedTo?: string) => React.ReactNode
    emptyMessage: string
}) {
    const leads = client?.leads || []
    const [openLeadId, setOpenLeadId] = useState<string | null>(leads.length === 1 ? leads[0].id : null)

    return (
        <div className="space-y-4 px-1 pb-4">
            {leads.length === 0 ? (
                <div className="bg-background hover:bg-gray-50 dark:hover:bg-muted/30 p-8 rounded-lg border border-border/40 text-center transition-all">
                    <FileText size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhum lead vinculado a este cliente.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {leads.map((lead: any) => {
                        const isOpen = openLeadId === lead.id;
                        return (
                            <div key={lead.id} className="bg-background rounded-xl border border-border shadow-sm">
                                <button
                                    onClick={() => setOpenLeadId(isOpen ? null : lead.id)}
                                    className={`w-full p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left ${isOpen ? 'rounded-t-xl' : 'rounded-xl'}`}
                                >
                                    <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
                                        <span className="text-base font-bold text-foreground truncate block">
                                            {lead.property_interest || lead.properties?.title || lead.source || `Lead ${new Date(lead.created_at).toLocaleDateString('pt-BR')}`}
                                        </span>
                                        {(() => {
                                            const details = lead.properties?.details || {};
                                            const apto = details.endereco?.apto || details.apto;
                                            const vagas = details.vagas;
                                            const hobbyBox = details.hobby_box_numeracao || (details.hobby_box === 'Sim' ? 'Sim' : details.hobby_box);
                                            
                                            const specs = [];
                                            if (apto) specs.push(`Apto ${apto}`);
                                            if (vagas) specs.push(`${vagas} Vaga(s)`);
                                            if (hobbyBox) specs.push(`Hobby Box ${hobbyBox === 'Sim' ? '' : hobbyBox}`.trim());

                                            return (
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground font-medium">
                                                    {specs.length > 0 && (
                                                        <>
                                                            <span className="text-foreground/80 font-bold">{specs.join(' • ')}</span>
                                                            <span className="text-border/50 px-1">•</span>
                                                        </>
                                                    )}
                                                    <span>Criado em: {new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                                                    {(lead.last_interaction_at || lead.updated_at) && (
                                                        <>
                                                            <span className="text-border/50 px-1">•</span>
                                                            <span>Atualizado em: {new Date(lead.last_interaction_at || lead.updated_at).toLocaleDateString('pt-BR')}</span>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                    <ChevronDown
                                        className={`shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                        size={20}
                                    />
                                </button>
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 border-t border-border/40 space-y-4">
                                                {renderTab(
                                                    lead.id,
                                                    client.name || '',
                                                    lead.property_interest || lead.properties?.title || '',
                                                    lead.assigned_to
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── Aba Leads ──────────────────────────────────────────────────────

function ClientLeadsTab({
    client,
    clientNotes,
    onMakeProposal
}: {
    client: any;
    clientNotes: any[];
    onMakeProposal?: (leadId: string) => void
}) {
    return (
        <div className="space-y-6 px-1 pb-4">
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Leads e Interesses</h3>
                <div className="space-y-3">
                    {client.leads && client.leads.length > 0 ? (
                        client.leads.map((lead: any) => (
                            <LeadCardDropdown
                                key={lead.id}
                                lead={lead}
                                clientNotes={clientNotes}
                                onMakeProposal={onMakeProposal}
                            />
                        ))
                    ) : (
                        <div className="bg-background hover:bg-gray-50 dark:hover:bg-muted/30 p-6 rounded-lg border border-border/40 text-center transition-all">
                            <p className="text-xs text-muted-foreground">Nenhum lead vinculado a este cliente ainda.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function LeadCardDropdown({
    lead,
    clientNotes = [],
    onMakeProposal
}: {
    lead: any;
    clientNotes?: any[];
    onMakeProposal?: (leadId: string) => void
}) {
    const [isOpen, setIsOpen] = useState(false)
    const hasAttachments = lead.images?.length > 0 || lead.videos?.length > 0 || lead.documents?.length > 0
    const brokerName = lead.assigned_user?.full_name || lead.profiles?.full_name || 'Não atribuído'
    const leadVisits = clientNotes.filter((n: any) => n.is_visit && n.lead_id === lead.id)

    return (
        <div className="bg-background rounded-xl border border-border shadow-sm">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left ${isOpen ? 'rounded-t-xl' : 'rounded-xl'}`}
            >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <span className="text-base font-bold text-foreground truncate block">
                        {lead.property_interest || lead.properties?.title || lead.source || 'Interesse não especificado'}
                    </span>
                    {(() => {
                        const c = lead.status_color
                        const isLight = c && ['#FFFFFF', '#FACC15', '#FDE047', '#FEF08A', '#FCD34D'].includes(c.toUpperCase())
                        return (
                            <span
                                className="px-2.5 py-0.5 text-xs font-medium rounded-full uppercase whitespace-nowrap shrink-0"
                                style={c ? {
                                    backgroundColor: c,
                                    color: isLight ? '#1a1a1a' : '#ffffff',
                                } : {
                                    backgroundColor: 'var(--secondary)',
                                    color: 'var(--foreground)',
                                    opacity: 0.6
                                }}
                            >
                                {lead.status_name || lead.status}
                            </span>
                        )
                    })()}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {lead.partner_id && (
                        <div className="relative group flex items-center" title={lead.partners?.name ? `Parceria - ${lead.partners.name}` : "Parceria"}>
                            <span className="w-5 h-5 min-w-[20px] min-h-[20px] aspect-square flex items-center justify-center text-[10px] font-black rounded-full shrink-0 bg-blue-600 text-white dark:bg-blue-600 dark:text-white cursor-default leading-none shadow-sm">
                                P
                            </span>
                        </div>
                    )}
                    {lead.has_proposal && (
                        <LeadProposalBadgeDropdown
                            leadId={lead.id}
                            onProposalClick={onMakeProposal}
                        />
                    )}
                    <LeadTemperatureBadge lastInteractionAt={lead.last_interaction_at || lead.created_at} />
                    {lead.created_at && (
                        <span className="text-xs text-muted-foreground font-medium">
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </span>
                    )}
                    <ChevronDown
                        size={14}
                        className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden rounded-b-xl"
                    >
                        <div className="px-4 pb-4 space-y-4 border-t border-border/50 animate-in fade-in duration-200" style={{ backgroundColor: 'var(--background)' }}>
                            {/* Grid de Informações Básicas e Notas */}
                            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    {lead.lead_source && (
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-bold text-foreground/80">Origem:</span> {lead.lead_source}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        <span className="font-bold text-foreground/80">Corretor Responsável:</span> {brokerName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        <span className="font-bold text-foreground/80">Parceria:</span> {lead.partner_id ? lead.partners?.name || 'Sim' : 'Não'}
                                    </p>
                                </div>
                                {lead.notes && (
                                    <div className="p-3 bg-card border border-border/40 rounded-lg">
                                        <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest mb-1">
                                            Notas do Lead
                                        </h4>
                                        <p className="text-xs text-muted-foreground italic leading-snug">
                                            "{lead.notes}"
                                        </p>
                                    </div>
                                )}
                            </div>



                            {/* Histórico de Visitas */}
                            {leadVisits.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest flex items-center gap-1">
                                        <MapPin size={12} className="text-accent-icon" /> Visitas Realizadas ({leadVisits.length})
                                    </h4>
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                        {leadVisits.map((visit: any) => (
                                            <div key={visit.id} className="p-2.5 bg-card border border-border/40 rounded-lg shadow-sm space-y-1">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="bg-[#FFE600] text-[#404F4F] px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                                                            {visit.visit_number}ª Visita
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {visit.date ? new Date(visit.date).toLocaleDateString('pt-BR') : '—'}
                                                        </span>
                                                    </div>
                                                    {visit.profiles?.full_name && (
                                                        <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                                                            com {visit.profiles.full_name}
                                                        </span>
                                                    )}
                                                </div>
                                                {visit.properties ? (
                                                    <div className="text-[11px] font-bold text-foreground">
                                                        Imóvel: {' '}
                                                        <Link
                                                            href={`/properties/${visit.properties.type}/${visit.properties.slug || visit.properties.id}`}
                                                            className="text-accent-icon hover:underline font-bold"
                                                        >
                                                            {visit.properties.title}
                                                        </Link>
                                                    </div>
                                                ) : visit.visit_unregistered_property ? (
                                                    <div className="text-[11px] font-medium text-muted-foreground italic">
                                                        Imóvel: {visit.visit_unregistered_property} (Não cadastrado)
                                                    </div>
                                                ) : null}
                                                {visit.content && (
                                                    <p className="text-xs text-muted-foreground leading-snug">
                                                        <span className="font-bold text-foreground/80">Obs:</span> "{visit.content}"
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Anexos */}
                            {hasAttachments && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest">
                                        Anexos do Lead
                                    </h4>
                                    <LeadAttachments lead={lead} />
                                </div>
                            )}

                            {/* Botão Fazer Proposta */}
                            {onMakeProposal && !lead.has_proposal && (
                                <div className="pt-2 border-t border-border/30">
                                    <button
                                        onClick={() => onMakeProposal(lead.id)}
                                        className="px-3 py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-sm transition-all w-full"
                                    >
                                        Fazer Proposta
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function LeadAttachments({ lead }: { lead: any }) {
    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewIndex, setPreviewIndex] = useState(0)

    const mediaItems = [
        ...(lead.images || []).map((img: string, i: number) => ({ type: 'image' as const, url: img, label: `Imagem ${i + 1}` })),
        ...(lead.videos || []).map((vid: string, i: number) => ({ type: 'video' as const, url: vid, label: `Vídeo ${i + 1}` }))
    ]

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
                {lead.images?.map((img: string, i: number) => (
                    <button
                        key={`img-${i}`}
                        onClick={() => { setPreviewIndex(i); setPreviewOpen(true) }}
                        className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg text-base hover:bg-muted/50 transition-colors text-left"
                    >
                        <ImageIcon size={14} className="text-blue-500" />
                        <span className="truncate">Imagem {i + 1}</span>
                    </button>
                ))}
                {lead.videos?.map((vid: string, i: number) => (
                    <button
                        key={`vid-${i}`}
                        onClick={() => { setPreviewIndex((lead.images?.length || 0) + i); setPreviewOpen(true) }}
                        className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg text-base hover:bg-muted/50 transition-colors text-left"
                    >
                        <Video size={14} className="text-purple-500" />
                        <span className="truncate">Vídeo {i + 1}</span>
                    </button>
                ))}
                {lead.documents?.map((doc: any, i: number) => (
                    <a key={`doc-${i}`} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg text-base hover:bg-muted/50 transition-colors">
                        <FileText size={14} className="text-emerald-500" />
                        <span className="truncate">{doc.name || `Documento ${i + 1}`}</span>
                    </a>
                ))}
            </div>

            <MediaPreviewModal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                items={mediaItems}
                initialIndex={previewIndex}
            />
        </div>
    )
}

// ─── Aba IA ─────────────────────────────────────────────────────────

function ClientAITab({
    isAnalyzed,
    analysisLoading,
    analysisResult,
    handleAnalyze,
    setIsAnalyzed
}: {
    isAnalyzed: boolean
    analysisLoading: boolean
    analysisResult: string | null
    handleAnalyze: () => void
    setIsAnalyzed: (v: boolean) => void
}) {
    return (
        <div className="space-y-4 px-1 pb-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Inteligência Artificial</h3>
            <div className="bg-primary p-4 rounded-xl text-primary-foreground shadow-xl relative overflow-hidden group">

                {!isAnalyzed ? (
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="bg-secondary w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-secondary-foreground shrink-0">
                            <Sparkles size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-sm">Análise Preditiva</h5>
                            <p className="text-xs text-primary-foreground/70 mt-0.5">Gere um insight automático baseado no comportamento deste cliente.</p>
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={analysisLoading}
                            className="px-4 py-2 bg-secondary hover:opacity-90 text-secondary-foreground rounded-lg font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 whitespace-nowrap"
                        >
                            {analysisLoading ? <span className="animate-pulse">Analisando...</span> : 'Gerar Insight'}
                        </button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h5 className="font-bold text-base flex items-center gap-2">
                                <Sparkles size={14} className="text-secondary" /> Resultado IA
                            </h5>
                            <button
                                onClick={() => setIsAnalyzed(false)}
                                className="text-xs text-primary-foreground/60 hover:text-primary-foreground underline"
                            >
                                Nova Análise
                            </button>
                        </div>
                        <p className="text-sm text-primary-foreground/90 leading-relaxed italic bg-black/20 p-4 rounded-xl border border-white/5">
                            {analysisResult}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

function LeadProposalBadgeDropdown({ leadId, onProposalClick }: { leadId: string; onProposalClick?: (leadId: string) => void }) {
    const [showTooltip, setShowTooltip] = useState(false)
    const badgeRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
                setShowTooltip(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setShowTooltip(true)
    }

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setShowTooltip(false), 150)
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onProposalClick?.(leadId)
    }

    return (
        <div
            ref={badgeRef}
            className="relative flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={handleClick}
                className="w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full shrink-0 hover:scale-105 transition-transform cursor-pointer relative"
                style={{ backgroundColor: '#FFE600', color: '#1a1a1a' }}
            >
                P
            </button>

            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-50 min-w-[200px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-card border border-muted-foreground/30 rounded-lg shadow-xl p-3 text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                                    Proposta ativa
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Este lead possui propostas cadastradas. Clique aqui para gerenciar e visualizar as propostas deste cliente.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function ClientFinanceActionsDropdown({ onEdit, onArchive, onDelete }: { onEdit: () => void, onArchive: () => void, onDelete: () => void }) {
    const [isOpen, setIsOpen] = useState(false)
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

    return (
        <div className="relative inline-block" ref={dropdownRef} onClick={e => e.stopPropagation()}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(o => !o) }}
                className="p-1.5 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors shadow-sm"
                title="Ações"
            >
                <MoreVertical size={14} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-30 text-left"
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onEdit() }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-blue-500/10 transition-colors"
                        >
                            <Edit2 size={14} className="text-blue-500" />
                            Editar
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onArchive() }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-amber-500/10 transition-colors"
                        >
                            <Archive size={14} className="text-amber-500" />
                            Arquivar
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete() }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 size={14} className="text-red-500" />
                            Excluir
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function ClientFinanceRow({ lead, tenantId, isExpanded, onToggle, assignedTo }: any) {
    const [propertyName, setPropertyName] = useState<string>(lead.properties?.title || lead.property_interest || 'Imóvel não especificado');
    const [unitInfoString, setUnitInfoString] = useState<string>('—');
    const [createdAt, setCreatedAt] = useState<string>('—');
    const [updatedAt, setUpdatedAt] = useState<string>('—');
    
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [hasFinancials, setHasFinancials] = useState(false);
    const [isEditingFinance, setIsEditingFinance] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function fetchUnitInfo() {
            try {
                const { getLatestProposalByLead } = await import('@/app/_actions/proposals');
                const res = await getLatestProposalByLead(lead.id);
                if (mounted && res.success && res.data) {
                    const proposal = res.data;
                    const unitInfo = proposal.unit_info || {};
                    const unitParts: string[] = [];
                    
                    if (proposal.unit) unitParts.push(`apto ${proposal.unit}`);
                    if (unitInfo.block_tower) unitParts.push(`bl ${unitInfo.block_tower}`);
                    
                    if (unitInfo.garage_number) {
                        unitParts.push(`vg ${unitInfo.garage_number}`);
                    } else if (unitInfo.garage_type && unitInfo.garage_type !== 'Não') {
                        if (unitInfo.garage_type.toLowerCase() === 'sim') {
                            unitParts.push(`vg sim`)
                        } else {
                            unitParts.push(`vg ${unitInfo.garage_type}`)
                        }
                    }
                    
                    if (unitInfo.hobby_box && unitInfo.hobby_box !== 'Não') {
                        if (unitInfo.hobby_box_number) {
                            unitParts.push(`hb ${unitInfo.hobby_box_number}`);
                        } else if (unitInfo.hobby_box.toLowerCase() !== 'sim') {
                            unitParts.push(`hb ${unitInfo.hobby_box}`);
                        } else {
                            unitParts.push(`hb sim`);
                        }
                    }
                    
                    if (proposal.buyer_data?.imovel_descricao) {
                        const desc = proposal.buyer_data.imovel_descricao as string;
                        const splitIndex = desc.indexOf(' - ');
                        if (splitIndex !== -1) {
                            setPropertyName(desc.substring(0, splitIndex).trim());
                            setUnitInfoString(desc.substring(splitIndex + 3).trim());
                        } else {
                            setPropertyName(desc);
                            setUnitInfoString('');
                        }
                        return;
                    }

                    if (unitParts.length > 0) {
                        setUnitInfoString(unitParts.join(' • '));
                        return;
                    }
                }
            } catch (err) {
                console.error('Failed to fetch proposal unit info', err);
            }

            // Fallback to lead details if no proposal or no unit info in proposal
            if (mounted) {
                const details = lead.properties?.details || {};
                const apto = details.endereco?.apto || details.apto;
                const vagas = details.vagas;
                const hbVal = details.hobby_box_numeracao || details.hobby_box;
                
                const unitParts: string[] = [];
                if (apto) unitParts.push(`apto ${apto}`);
                
                if (vagas && vagas !== 'Não' && vagas !== '0') {
                    if (!isNaN(Number(vagas))) {
                        unitParts.push(`vg ${vagas}`);
                    } else {
                        unitParts.push(`vg ${vagas}`);
                    }
                }
                if (hbVal && hbVal !== 'Não' && hbVal !== '0') {
                    if (hbVal === 'Sim') {
                        unitParts.push('hb sim');
                    } else if (!isNaN(Number(hbVal))) {
                        unitParts.push(`hb ${hbVal}`);
                    } else {
                        unitParts.push(`hb ${hbVal}`);
                    }
                }
                setUnitInfoString(unitParts.length > 0 ? unitParts.join(' | ') : '—');
            }
        }
        
        fetchUnitInfo();
        
        getLeadFinancials(lead.id).then((res: any) => {
            if (mounted && res.success && res.data && res.data.length > 0) {
                setHasFinancials(true);
                const financials = res.data;
                const earliest = [...financials].sort((a, b) => new Date(a.created_at || a.data_transacao).getTime() - new Date(b.created_at || b.data_transacao).getTime())[0];
                const latest = [...financials].sort((a, b) => new Date(b.updated_at || b.created_at || b.data_transacao).getTime() - new Date(a.updated_at || a.created_at || a.data_transacao).getTime())[0];
                if (earliest?.created_at) setCreatedAt(new Date(earliest.created_at).toLocaleDateString('pt-BR'));
                if (latest?.updated_at) setUpdatedAt(new Date(latest.updated_at).toLocaleDateString('pt-BR'));
            } else if (mounted) {
                setHasFinancials(false);
            }
        });
        return () => { mounted = false; };
    }, [lead.id, lead.properties]);

    const handleDelete = async () => {
        const { deleteLeadFinancials } = await import('@/app/_actions/leads-finance');
        const res = await deleteLeadFinancials(lead.id);
        if (res.success) {
            import('sonner').then(({ toast }) => toast.success('Faturamento excluído com sucesso.'));
            setHasFinancials(false);
            setCreatedAt('—');
            setUpdatedAt('—');
        } else {
            import('sonner').then(({ toast }) => toast.error(res.error || 'Erro ao excluir faturamento.'));
        }
        setDeleteModalOpen(false);
    }

    const handleArchive = async () => {
        const { archiveLeadFinancials } = await import('@/app/_actions/leads-finance');
        await archiveLeadFinancials(lead.id);
        setArchiveModalOpen(false);
    }

    return (
        <>
            <tr onClick={onToggle} className="bg-muted dark:bg-muted/10 transition-colors cursor-pointer group">
                 <td className="px-4 py-5 text-sm font-bold text-foreground truncate text-center">
                     <span className="truncate">{propertyName}</span>
                 </td>
                 <td className="px-4 py-5 text-sm font-bold text-foreground truncate text-center">
                     {unitInfoString && unitInfoString !== '—' ? (
                         <span className="text-[10px] font-medium text-foreground truncate">
                             {unitInfoString}
                         </span>
                     ) : (
                         <span className="text-foreground">—</span>
                     )}
                 </td>
                 <td className="px-4 py-5 align-middle text-center">
                     <span className="text-xs font-bold text-foreground">{createdAt}</span>
                 </td>
                 <td className="px-4 py-5 align-middle text-center">
                     <span className="text-xs font-bold text-muted-foreground">{updatedAt}</span>
                 </td>
                 <td className="px-4 py-5 align-middle text-center" onClick={e => e.stopPropagation()}>
                     {hasFinancials && (
                         <ClientFinanceActionsDropdown 
                             onEdit={() => {
                                 setIsEditingFinance(true);
                                 if (!isExpanded) onToggle();
                             }}
                             onArchive={() => setArchiveModalOpen(true)}
                             onDelete={() => setDeleteModalOpen(true)}
                         />
                     )}
                 </td>
            </tr>
            <AnimatePresence>
                {isExpanded && (
                    <tr>
                        <td colSpan={5} className="p-0 border-b-0">
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 py-6 bg-background dark:bg-muted/5 border-t border-border/30 shadow-inner">
                                    <LeadFinanceTab 
                                        key={hasFinancials.toString()} 
                                        leadId={lead.id} 
                                        tenantId={tenantId} 
                                        assignedToId={assignedTo} 
                                        isEditing={isEditingFinance}
                                        onCancelEdit={() => setIsEditingFinance(false)}
                                        onSuccess={() => {
                                            setIsEditingFinance(false);
                                            getLeadFinancials(lead.id).then((res: any) => {
                                                if (res.success && res.data && res.data.length > 0) {
                                                    setHasFinancials(true);
                                                }
                                            })
                                        }}
                                    />
                                </div>
                            </motion.div>
                        </td>
                    </tr>
                )}
            </AnimatePresence>
            
            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Excluir Faturamento"
                message={
                    <>
                        <span className="block">Esta ação excluirá permanentemente todos os registros financeiros</span>
                        <span className="block">associados a este negócio.</span>
                        <span className="block font-bold mt-2">Esta ação não poderá ser desfeita.</span>
                    </>
                }
                onConfirm={handleDelete}
                onCancel={() => setDeleteModalOpen(false)}
                confirmLabel="Excluir"
                variant="danger"
            />

            <ConfirmModal
                isOpen={archiveModalOpen}
                title="Arquivar Faturamento"
                message={
                    <>
                        <span className="block">O faturamento será cancelado/arquivado e não</span>
                        <span className="block">entrará mais nos cálculos de receita.</span>
                    </>
                }
                onConfirm={handleArchive}
                onCancel={() => setArchiveModalOpen(false)}
                confirmLabel="Arquivar"
                variant="warning"
            />
        </>
    )
}

function ClientFinanceSelectorTab({ client, tenantId }: { client: any, tenantId: string }) {
    const leads = client?.leads || []
    const [openLeadId, setOpenLeadId] = useState<string | null>(null)

    if (leads.length === 0) {
        return (
            <div className="bg-background hover:bg-gray-50 dark:hover:bg-muted/30 p-8 rounded-lg border border-border/40 text-center transition-all flex-1 flex flex-col items-center justify-center h-full">
                <DollarSign size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">Nenhum financeiro disponível.</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">O cliente ainda não possui leads com propostas ou faturamentos.</p>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-card rounded-xl border border-muted-foreground/30 overflow-hidden shadow-sm flex-1 flex flex-col h-full">
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[250px]">
                <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead className="bg-gray-200 dark:bg-muted/50 border-b border-muted-foreground/30">
                        <tr>
                            <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Imóvel</th>
                            <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Unidade</th>
                            <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Criado em</th>
                            <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Atualizado em</th>
                            <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider text-center whitespace-nowrap">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-muted-foreground/30">
                        {leads.map((lead: any) => (
                            <ClientFinanceRow 
                                key={lead.id} 
                                lead={lead} 
                                tenantId={tenantId} 
                                isExpanded={openLeadId === lead.id}
                                onToggle={() => setOpenLeadId(openLeadId === lead.id ? null : lead.id)}
                                assignedTo={client.assigned_to || undefined}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
