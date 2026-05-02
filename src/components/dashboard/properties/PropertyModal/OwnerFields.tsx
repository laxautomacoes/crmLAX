import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { fetchAddressByCep, formatCEP, fetchCepByAddress, ViaCEPResponse } from '@/lib/utils/cep'
import { useState, useEffect, useRef, useCallback } from 'react'
import { User, Search, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { searchContacts } from '@/app/_actions/properties'

import { Switch } from '@/components/ui/Switch'
import { formatPhone } from '@/lib/utils/phone'

interface OwnerFieldsProps {
    formData: any
    setFormData: (data: any) => void
    tenantId?: string
}

export function OwnerFields({ formData, setFormData, tenantId }: OwnerFieldsProps) {
    const [cepLoading, setCepLoading] = useState(false)
    const [searchResults, setSearchResults] = useState<ViaCEPResponse[]>([])
    const [showResults, setShowResults] = useState(false)
    const resultsRef = useRef<HTMLDivElement>(null)

    // Contact search
    const [contactResults, setContactResults] = useState<any[]>([])
    const [showContactResults, setShowContactResults] = useState(false)
    const [contactSearching, setContactSearching] = useState(false)
    const contactSearchRef = useRef<HTMLDivElement>(null)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const isConstrutora = formData.details?.proprietario?.is_construtora || false
    const linkedContactId = formData.details?.proprietario?._contact_id || null

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
            if (contactSearchRef.current && !contactSearchRef.current.contains(event.target as Node)) {
                setShowContactResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Debounced contact search
    const handleContactSearch = useCallback((query: string) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

        if (!query || query.trim().length < 2 || !tenantId) {
            setContactResults([])
            setShowContactResults(false)
            return
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setContactSearching(true)
            try {
                const result = await searchContacts(tenantId, query)
                if (result.success) {
                    setContactResults(result.data || [])
                    setShowContactResults(true)
                }
            } catch (e) {
                console.error('Search error:', e)
            } finally {
                setContactSearching(false)
            }
        }, 300)
    }, [tenantId])

    const selectContact = (contact: any) => {
        setFormData({
            ...formData,
            details: {
                ...formData.details,
                proprietario: {
                    ...formData.details.proprietario,
                    _contact_id: contact.id,
                    nome: contact.name || '',
                    telefone: contact.phone || '',
                    email: contact.email || '',
                    cpf: contact.cpf || '',
                    estado_civil: contact.marital_status || '',
                    data_nascimento: contact.birth_date || '',
                    endereco_rua: contact.address_street || '',
                    endereco_numero: contact.address_number || '',
                    endereco_complemento: contact.address_complement || '',
                    endereco_bairro: contact.address_neighborhood || '',
                    endereco_cidade: contact.address_city || '',
                    endereco_estado: contact.address_state || '',
                    endereco_cep: contact.address_zip_code || '',
                    is_construtora: contact.contact_type?.includes('construtora') || false,
                }
            }
        })
        setShowContactResults(false)
        toast.success(`Dados de "${contact.name}" preenchidos`)
    }

    const clearLinkedContact = () => {
        setFormData({
            ...formData,
            details: {
                ...formData.details,
                proprietario: {
                    nome: '',
                    responsavel: formData.details.proprietario.responsavel || '',
                    telefone: '',
                    email: '',
                    cpf: '',
                    estado_civil: '',
                    data_nascimento: '',
                    endereco_rua: '',
                    endereco_numero: '',
                    endereco_complemento: '',
                    endereco_bairro: '',
                    endereco_cidade: '',
                    endereco_estado: '',
                    endereco_cep: '',
                    is_construtora: false,
                    _contact_id: null
                }
            }
        })
    }

    const handleSearchAddress = async () => {
        const { endereco_rua: rua, endereco_cidade: cidade, endereco_estado: estado } = formData.details.proprietario
        
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
        setFormData((prev: any) => ({
            ...prev,
            details: {
                ...prev.details,
                proprietario: {
                    ...prev.details.proprietario,
                    endereco_rua: address.logradouro,
                    endereco_bairro: address.bairro,
                    endereco_cidade: address.localidade,
                    endereco_estado: address.uf,
                    endereco_cep: formatCEP(address.cep)
                }
            }
        }))
        setShowResults(false)
    }

    const handleCepChange = async (cep: string) => {
        const formattedCep = formatCEP(cep)
        const digitsOnly = formattedCep.replace(/\D/g, '')

        if (digitsOnly.length < 8) {
            setFormData({
                ...formData,
                details: {
                    ...formData.details,
                    proprietario: {
                        ...formData.details.proprietario,
                        endereco_cep: formattedCep,
                        endereco_rua: '',
                        endereco_bairro: '',
                        endereco_cidade: '',
                        endereco_estado: '',
                        endereco_complemento: '',
                        endereco_numero: ''
                    }
                }
            })
        } else {
            setFormData({
                ...formData,
                details: {
                    ...formData.details,
                    proprietario: { ...formData.details.proprietario, endereco_cep: formattedCep }
                }
            })
        }

        if (digitsOnly.length === 8) {
            setCepLoading(true)
            try {
                const address = await fetchAddressByCep(formattedCep)
                if (address) {
                    setFormData((prev: any) => ({
                        ...prev,
                        details: {
                            ...prev.details,
                            proprietario: {
                                ...prev.details.proprietario,
                                endereco_rua: address.logradouro || prev.details.proprietario.endereco_rua,
                                endereco_bairro: address.bairro || prev.details.proprietario.endereco_bairro,
                                endereco_cidade: address.localidade || prev.details.proprietario.endereco_cidade,
                                endereco_estado: address.uf || prev.details.proprietario.endereco_estado,
                                endereco_cep: formattedCep
                            }
                        }
                    }))
                }
            } finally {
                setCepLoading(false)
            }
        }
    }

    return (
        <div className="space-y-2">
            <h4 className="text-sm font-black text-foreground/70 uppercase tracking-widest mb-2">
                Proprietário | Construtora
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-5">
                {/* Nome — com busca integrada */}
                <div className="sm:col-span-2 lg:col-span-2 relative" ref={contactSearchRef}>
                    <FormInput
                        label="Nome"
                        value={formData.details.proprietario.nome}
                        onChange={(e) => {
                            const value = e.target.value
                            setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, nome: value, _contact_id: null } } })
                            if (tenantId) handleContactSearch(value)
                        }}
                        placeholder="Digite nome, CPF ou telefone para buscar"
                        rightElement={
                            linkedContactId ? (
                                <button
                                    type="button"
                                    onClick={clearLinkedContact}
                                    className="p-1 hover:bg-red-500/10 rounded-md transition-colors text-amber-500"
                                    title="Desvincular contato"
                                >
                                    <X size={14} />
                                </button>
                            ) : contactSearching ? (
                                <Loader2 size={14} className="animate-spin text-muted-foreground" />
                            ) : (
                                <Search size={14} className="text-muted-foreground" />
                            )
                        }
                    />

                    {linkedContactId && (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                            <User size={10} />
                            <span>Vinculado — dados serão sincronizados ao salvar</span>
                        </div>
                    )}

                    {showContactResults && contactResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {contactResults.map((contact) => (
                                <button
                                    key={contact.id}
                                    type="button"
                                    onClick={() => selectContact(contact)}
                                    className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-0 transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-bold text-foreground truncate">{contact.name}</span>
                                        <div className="flex gap-1 shrink-0">
                                            {contact.contact_type?.map((type: string) => {
                                                const c: Record<string, string> = {
                                                    comprador: 'bg-green-500/10 text-green-600 border-green-500/20',
                                                    vendedor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                                    construtora: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                                }
                                                return (
                                                    <span key={type} className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${c[type] || ''}`}>
                                                        {type}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {contact.phone && <span>{formatPhone(contact.phone)}</span>}
                                        {contact.phone && contact.email && <span> · </span>}
                                        {contact.email && <span>{contact.email}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Responsável + Toggle Construtora */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-2 gap-x-3">
                        <FormInput
                            label="Responsável"
                            value={formData.details.proprietario.responsavel}
                            onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, responsavel: e.target.value } } })}
                        />
                        <div className="flex flex-col">
                            <label className="block text-sm font-bold text-foreground/80 ml-1 mb-1 tracking-tight">Construtora</label>
                            <Switch
                                checked={isConstrutora}
                                onChange={(checked) => setFormData({
                                    ...formData,
                                    details: {
                                        ...formData.details,
                                        proprietario: {
                                            ...formData.details.proprietario,
                                            is_construtora: checked
                                        }
                                    }
                                })}
                                className="mt-1"
                            />
                        </div>
                    </div>
                </div>

                {/* Telefone, Email, CPF */}
                <div>
                    <FormInput
                        label="Telefone | WhatsApp"
                        value={formData.details.proprietario.telefone}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, telefone: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Email"
                        type="email"
                        value={formData.details.proprietario.email}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, email: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="CPF"
                        value={formData.details.proprietario.cpf}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, cpf: e.target.value } } })}
                    />
                </div>

                {/* Data Nascimento, Estado Civil, Regime Comunhão */}
                <div className="lg:col-start-1">
                    <FormInput
                        label="Data Nascimento"
                        type="date"
                        value={formData.details.proprietario.data_nascimento}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, data_nascimento: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormSelect
                        label="Estado Civil"
                        value={formData.details.proprietario.estado_civil}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, estado_civil: e.target.value } } })}
                        options={[
                            { value: '', label: 'Selecione...' },
                            { value: 'solteiro', label: 'Solteiro(a)' },
                            { value: 'casado', label: 'Casado(a)' },
                            { value: 'divorciado', label: 'Divorciado(a)' },
                            { value: 'viuvo', label: 'Viúvo(a)' },
                            { value: 'uniao_estavel', label: 'União Estável' }
                        ]}
                    />
                </div>
                <div>
                    <FormSelect
                        label="Regime Comunhão"
                        value={formData.details.proprietario.regime_comunhao}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, regime_comunhao: e.target.value } } })}
                        options={[
                            { value: '', label: 'Selecione...' },
                            { value: 'comunhao_parcial', label: 'Comunhão Parcial' },
                            { value: 'comunhao_universal', label: 'Comunhão Universal' },
                            { value: 'separacao_total', label: 'Separação Total' },
                            { value: 'participacao_final', label: 'Participação Final nos Aquestos' }
                        ]}
                    />
                </div>

                {/* CEP, Rua, nº */}
                <div className="lg:col-start-1">
                    <FormInput
                        label={
                            <div className="flex items-center gap-1">
                                CEP <span className="text-[9px] lowercase font-normal opacity-70">(digite para buscar endereço)</span>
                            </div>
                        }
                        value={formData.details.proprietario.endereco_cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        disabled={cepLoading}
                    />
                </div>
                <div className="sm:col-span-2 lg:col-span-2 relative" ref={resultsRef}>
                    <FormInput
                        label="Avenida | Rua"
                        value={formData.details.proprietario.endereco_rua}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_rua: e.target.value } } })}
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
                        <div className="absolute z-50 w-full mt-1 bg-white border border-muted-foreground/30 rounded-lg shadow-xl max-h-60 overflow-y-auto">
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
                <div>
                    <FormInput
                        label="Número"
                        value={formData.details.proprietario.endereco_numero}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_numero: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Complemento"
                        value={formData.details.proprietario.endereco_complemento}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_complemento: e.target.value } } })}
                        placeholder="Torre, sala, casa..."
                    />
                </div>
                <div>
                    <FormInput
                        label="Bairro"
                        value={formData.details.proprietario.endereco_bairro}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_bairro: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Cidade"
                        value={formData.details.proprietario.endereco_cidade}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_cidade: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Estado"
                        value={formData.details.proprietario.endereco_estado}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_estado: e.target.value } } })}
                        maxLength={2}
                    />
                </div>
            </div>
        </div>
    )
}
