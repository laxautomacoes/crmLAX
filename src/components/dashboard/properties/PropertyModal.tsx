'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'

interface PropertyModalProps {
    isOpen: boolean
    onClose: () => void
    editingProperty: any | null
    onSave: (propertyData: any) => Promise<void>
}

export function PropertyModal({ isOpen, onClose, editingProperty, onSave }: PropertyModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        type: 'house',
        status: 'Disponível',
        details: {
            area_util: '',
            quartos: '',
            suites: '',
            banheiros: '',
            vagas: '',
            endereco: {
                rua: '',
                numero: '',
                bairro: '',
                cidade: '',
                cep: ''
            }
        }
    })

    useEffect(() => {
        if (editingProperty) {
            setFormData({
                title: editingProperty.title || '',
                price: editingProperty.price?.toString() || '',
                type: editingProperty.type || 'house',
                status: editingProperty.status || 'Disponível',
                details: {
                    area_util: editingProperty.details?.area_util || '',
                    quartos: editingProperty.details?.quartos || '',
                    suites: editingProperty.details?.suites || '',
                    banheiros: editingProperty.details?.banheiros || '',
                    vagas: editingProperty.details?.vagas || '',
                    endereco: editingProperty.details?.endereco || { rua: '', numero: '', bairro: '', cidade: '', cep: '' }
                }
            })
        } else {
            setFormData({
                title: '',
                price: '',
                type: 'house',
                status: 'Disponível',
                details: {
                    area_util: '',
                    quartos: '',
                    suites: '',
                    banheiros: '',
                    vagas: '',
                    endereco: {
                        rua: '',
                        numero: '',
                        bairro: '',
                        cidade: '',
                        cep: ''
                    }
                }
            })
        }
    }, [editingProperty, isOpen])

    const handleSaveLocal = async () => {
        const propertyData = {
            title: formData.title,
            price: formData.price ? parseFloat(formData.price.toString()) : 0,
            type: formData.type,
            status: formData.status,
            details: formData.details
        }
        await onSave(propertyData)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingProperty ? "Editar Imóvel" : "Novo Imóvel"}
            size="lg"
        >
            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Título do Imóvel *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-[#F9FAFB] text-gray-900 focus:ring-2 focus:ring-secondary/50 outline-none"
                            placeholder="Ex: Apartamento 3 suítes Beira Mar"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Preço (R$)</label>
                        <input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-[#F9FAFB] text-gray-900 focus:ring-2 focus:ring-secondary/50 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Tipo</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-[#F9FAFB] text-gray-900 focus:ring-2 focus:ring-secondary/50 outline-none"
                        >
                            <option value="house">Casa</option>
                            <option value="apartment">Apartamento</option>
                            <option value="land">Terreno</option>
                            <option value="commercial">Comercial</option>
                            <option value="penthouse">Cobertura</option>
                            <option value="studio">Studio</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-4 col-span-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Área (m²)</label>
                            <input
                                type="number"
                                value={formData.details.area_util}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_util: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Quartos</label>
                            <input
                                type="number"
                                value={formData.details.quartos}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, quartos: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Banheiros</label>
                            <input
                                type="number"
                                value={formData.details.banheiros}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, banheiros: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Vagas</label>
                            <input
                                type="number"
                                value={formData.details.vagas}
                                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vagas: e.target.value } })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                            />
                        </div>
                    </div>

                    <div className="col-span-2 pt-2">
                        <h4 className="text-xs font-bold text-[#404F4F] uppercase tracking-wider mb-3">Endereço</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Rua</label>
                                <input
                                    type="text"
                                    value={formData.details.endereco.rua}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, rua: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Nº</label>
                                <input
                                    type="text"
                                    value={formData.details.endereco.numero}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, numero: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Bairro</label>
                                <input
                                    type="text"
                                    value={formData.details.endereco.bairro}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, bairro: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">Cidade</label>
                                <input
                                    type="text"
                                    value={formData.details.endereco.cidade}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, cidade: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-800 ml-1 mb-1">CEP</label>
                                <input
                                    type="text"
                                    value={formData.details.endereco.cep}
                                    onChange={(e) => setFormData({ ...formData, details: { ...formData.details, endereco: { ...formData.details.endereco, cep: e.target.value } } })}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-[#F9FAFB] text-sm outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-border text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition-all font-sans"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveLocal}
                        className="flex-1 py-3 bg-secondary text-primary rounded-lg font-bold hover:opacity-90 transition-all shadow-sm font-sans"
                    >
                        {editingProperty ? "Salvar Alterações" : "Cadastrar Imóvel"}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
