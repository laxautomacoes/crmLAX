'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { fetchAddressByCep, formatCEP, fetchCepByAddress, ViaCEPResponse } from '@/lib/utils/cep'
import { useState, useEffect, useRef } from 'react'
import { User, Search, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface OwnerFieldsProps {
    formData: any
    setFormData: (data: any) => void
}

export function OwnerFields({ formData, setFormData }: OwnerFieldsProps) {
    const [cepLoading, setCepLoading] = useState(false)
    const [searchResults, setSearchResults] = useState<ViaCEPResponse[]>([])
    const [showResults, setShowResults] = useState(false)
    const resultsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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

        // Se o CEP for apagado ou alterado (menos de 8 dígitos), limpa os campos de endereço
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3">
                <div className="sm:col-span-2 lg:col-span-2">
                    <FormInput
                        label="Nome"
                        value={formData.details.proprietario.nome}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, nome: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Responsável"
                        value={formData.details.proprietario.responsavel}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, responsavel: e.target.value } } })}
                    />
                </div>

                <div className="col-span-full border-t border-border/40 my-3" />

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
                    <FormInput
                        label="Data Nascimento"
                        type="date"
                        value={formData.details.proprietario.data_nascimento}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, data_nascimento: e.target.value } } })}
                    />
                </div>

                <div className="col-span-full border-t border-border/40 my-3" />

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
                        label="nº"
                        value={formData.details.proprietario.endereco_numero}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_numero: e.target.value } } })}
                    />
                </div>
                <div>
                    <FormInput
                        label="Complemento"
                        value={formData.details.proprietario.endereco_complemento}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, proprietario: { ...formData.details.proprietario, endereco_complemento: e.target.value } } })}
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
