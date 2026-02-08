'use client'

import { FormInput } from '@/components/shared/forms/FormInput'
import { fetchAddressByCep, formatCEP, fetchCepByAddress, ViaCEPResponse } from '@/lib/utils/cep'
import { useState, useMemo, useEffect, useRef } from 'react'
import { PropertyMap } from '@/components/shared/PropertyMap'
import { MapPin, Search, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface AddressFieldsProps {
    formData: any
    setFormData: (data: any) => void
}

export function AddressFields({ formData, setFormData }: AddressFieldsProps) {
    const [loading, setLoading] = useState(false)
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
        const { rua, cidade, estado } = formData.details.endereco
        
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

        setLoading(true)
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
            setLoading(false)
        }
    }

    const selectAddress = (address: ViaCEPResponse) => {
        setFormData((prev: any) => ({
            ...prev,
            details: {
                ...prev.details,
                endereco: {
                    ...prev.details.endereco,
                    rua: address.logradouro,
                    bairro: address.bairro,
                    cidade: address.localidade,
                    estado: address.uf,
                    cep: formatCEP(address.cep)
                }
            }
        }))
        setShowResults(false)
    }

    const fullAddress = useMemo(() => {
        const { rua, numero, bairro, cidade, estado } = formData.details.endereco
        return [rua, numero, bairro, cidade, estado].filter(Boolean).join(', ')
    }, [formData.details.endereco])

    const handleLocationSelect = (latitude: number, longitude: number) => {
        setFormData({
            ...formData,
            details: {
                ...formData.details,
                endereco: {
                    ...formData.details.endereco,
                    latitude,
                    longitude
                }
            }
        })
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
                    endereco: {
                        ...formData.details.endereco,
                        cep: formattedCep,
                        rua: '',
                        bairro: '',
                        cidade: '',
                        estado: '',
                        complemento: '',
                        numero: ''
                    }
                }
            })
        } else {
            setFormData({
                ...formData,
                details: {
                    ...formData.details,
                    endereco: { ...formData.details.endereco, cep: formattedCep }
                }
            })
        }

        if (digitsOnly.length === 8) {
            setLoading(true)
            try {
                const address = await fetchAddressByCep(formattedCep)
                if (address) {
                    setFormData((prev: any) => ({
                        ...prev,
                        details: {
                            ...prev.details,
                            endereco: {
                                ...prev.details.endereco,
                                rua: address.logradouro || prev.details.endereco.rua,
                                bairro: address.bairro || prev.details.endereco.bairro,
                                cidade: address.localidade || prev.details.endereco.cidade,
                                estado: address.uf || prev.details.endereco.estado,
                                cep: formattedCep
                            }
                        }
                    }))
                }
            } finally {
                setLoading(false)
            }
        }
    }

    return (
        <div className="space-y-4">
            <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                <MapPin size={14} className="text-foreground" />
                Endereço
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-6">
                <FormInput
                    label={
                        <div className="flex items-center gap-1">
                            CEP <span className="text-[9px] lowercase font-normal opacity-70">(digite para buscar endereço)</span>
                        </div>
                    }
                    type="text"
                    value={formData.details.endereco.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    disabled={loading}
                />
                <div className="sm:col-span-2 lg:col-span-2 relative" ref={resultsRef}>
                    <FormInput
                        label="Avenida | Rua"
                        type="text"
                        value={formData.details.endereco.rua}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, rua: e.target.value } } })}
                        rightElement={
                            <button
                                type="button"
                                onClick={handleSearchAddress}
                                className="p-1 hover:bg-muted rounded-md transition-colors text-foreground"
                                title="Buscar CEP por endereço"
                                disabled={loading}
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
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
                            ) : !loading && (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    Nenhum endereço encontrado.
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <FormInput
                    label="Nº"
                    type="text"
                    value={formData.details.endereco.numero}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, numero: e.target.value } } })}
                />
                <FormInput
                    label="Complemento"
                    type="text"
                    value={formData.details.endereco.complemento}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, complemento: e.target.value } } })}
                />
                <FormInput
                    label="Bairro"
                    type="text"
                    value={formData.details.endereco.bairro}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, bairro: e.target.value } } })}
                />
                <FormInput
                    label="Cidade"
                    type="text"
                    value={formData.details.endereco.cidade}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, cidade: e.target.value } } })}
                />
                <FormInput
                    label="Estado"
                    type="text"
                    value={formData.details.endereco.estado}
                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, estado: e.target.value } } })}
                    placeholder="UF"
                />
            </div>

            <div className="mt-8 pt-6 space-y-4">
                <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} className="text-foreground" />
                    Localização
                </h4>
                <div className="rounded-xl overflow-hidden bg-muted/30 p-1">
                    <PropertyMap 
                        address={fullAddress}
                        lat={formData.details.endereco.latitude}
                        lng={formData.details.endereco.longitude}
                        onLocationSelect={handleLocationSelect}
                    />
                </div>
            </div>
        </div>
    )
}
