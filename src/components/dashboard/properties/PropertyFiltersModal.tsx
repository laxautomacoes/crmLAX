'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormInput } from '@/components/shared/forms/FormInput'
import { Download, Upload, Filter, Trash2 } from 'lucide-react'
import { propertyTypes } from '@/utils/property-translations'
import { toast } from 'sonner'
import { bulkCreateAssets } from '@/app/_actions/assets'

interface PropertyFiltersModalProps {
    isOpen: boolean
    onClose: () => void
    filters: any
    setFilters: (filters: any) => void
    onExport: () => void
    tenantId: string | null
    onImportSuccess: () => void
}

export function PropertyFiltersModal({
    isOpen,
    onClose,
    filters,
    setFilters,
    onExport,
    tenantId,
    onImportSuccess
}: PropertyFiltersModalProps) {
    const [isImporting, setIsImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleClearFilters = () => {
        setFilters({
            status: 'all',
            type: 'all',
            minPrice: '',
            maxPrice: '',
            bedrooms: 'all',
            bathrooms: 'all',
            parking: 'all'
        })
    }

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !tenantId) return

        setIsImporting(true)
        const reader = new FileReader()
        
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string
                const lines = text.split('\n')
                
                // Pular cabeçalho e linhas vazias
                const assetsToCreate = lines.slice(1)
                    .filter(line => line.trim() !== '')
                    .map(line => {
                        // Função simples para parsear linha de CSV
                        const parseCSVLine = (text: string) => {
                            const result = [];
                            let cur = '';
                            let inQuote = false;
                            for (let i = 0; i < text.length; i++) {
                                const char = text[i];
                                if (char === '"') {
                                    if (inQuote && text[i + 1] === '"') {
                                        cur += '"';
                                        i++;
                                    } else {
                                        inQuote = !inQuote;
                                    }
                                } else if (char === ',' && !inQuote) {
                                    result.push(cur);
                                    cur = '';
                                } else {
                                    cur += char;
                                }
                            }
                            result.push(cur);
                            return result;
                        };

                        const values = parseCSVLine(line);
                        const clean = (val: string) => val?.trim() || ''
                        
                        const details: any = {
                            endereco: {
                                bairro: clean(values[5]),
                                cidade: clean(values[6]),
                                rua: clean(values[7]),
                                numero: clean(values[8]),
                                cep: clean(values[9])
                            },
                            area_privativa: clean(values[10]),
                            area_total: clean(values[11]),
                            quartos: parseInt(clean(values[14])) || 0,
                            suites: parseInt(clean(values[15])) || 0,
                            banheiros: parseInt(clean(values[16])) || 0,
                            vagas: parseInt(clean(values[17])) || 0,
                            valor_condominio: parseFloat(clean(values[20])) || 0,
                            valor_iptu: parseFloat(clean(values[21])) || 0
                        }

                        return {
                            title: clean(values[1]) || 'Imóvel Importado',
                            type: clean(values[2]) || 'house',
                            price: parseFloat(clean(values[3])) || 0,
                            status: clean(values[4]) || 'Disponível',
                            details: details,
                            images: [],
                            videos: [],
                            documents: []
                        }
                    })

                if (assetsToCreate.length === 0) {
                    toast.error('Nenhum dado encontrado no CSV')
                    return
                }

                const result = await bulkCreateAssets(tenantId, assetsToCreate)
                if (result.success) {
                    toast.success(`${assetsToCreate.length} imóveis importados com sucesso!`)
                    onImportSuccess()
                    onClose()
                } else {
                    throw new Error(result.error)
                }
            } catch (error: any) {
                console.error('Erro ao importar CSV:', error)
                toast.error('Erro ao processar CSV: ' + error.message)
            } finally {
                setIsImporting(false)
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        }

        reader.readAsText(file)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Filtros e Ações" size="lg">
            <div className="space-y-8">
                {/* Seção de Filtros */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <Filter size={18} />
                        <h4 className="text-sm uppercase tracking-wider">Filtros de Busca</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormSelect
                            label="Status de Aprovação"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            options={[
                                { value: 'all', label: 'Todos os Status' },
                                { value: 'pending', label: 'Pendentes' },
                                { value: 'approved', label: 'Aprovados' },
                                { value: 'rejected', label: 'Rejeitados' }
                            ]}
                        />

                        <FormSelect
                            label="Tipo de Imóvel"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            options={[
                                { value: 'all', label: 'Todos os Tipos' },
                                ...Object.entries(propertyTypes).map(([val, label]) => ({ value: val, label }))
                            ]}
                        />

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Preço Mínimo</label>
                            <FormInput
                                type="number"
                                placeholder="R$ 0,00"
                                value={filters.minPrice}
                                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Preço Máximo</label>
                            <FormInput
                                type="number"
                                placeholder="R$ 0,00"
                                value={filters.maxPrice}
                                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <FormSelect
                            label="Quartos"
                            value={filters.bedrooms}
                            onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                            options={[
                                { value: 'all', label: 'Qualquer' },
                                { value: '1', label: '1+' },
                                { value: '2', label: '2+' },
                                { value: '3', label: '3+' },
                                { value: '4', label: '4+' },
                                { value: '5', label: '5+' }
                            ]}
                        />
                        <FormSelect
                            label="Banheiros"
                            value={filters.bathrooms}
                            onChange={(e) => setFilters({ ...filters, bathrooms: e.target.value })}
                            options={[
                                { value: 'all', label: 'Qualquer' },
                                { value: '1', label: '1+' },
                                { value: '2', label: '2+' },
                                { value: '3', label: '3+' },
                                { value: '4', label: '4+' }
                            ]}
                        />
                        <FormSelect
                            label="Vagas"
                            value={filters.parking}
                            onChange={(e) => setFilters({ ...filters, parking: e.target.value })}
                            options={[
                                { value: 'all', label: 'Qualquer' },
                                { value: '1', label: '1+' },
                                { value: '2', label: '2+' },
                                { value: '3', label: '3+' },
                                { value: '4', label: '4+' }
                            ]}
                        />
                    </div>
                </div>

                {/* Seção de Ações */}
                <div className="pt-6 border-t border-border space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <Download size={18} />
                        <h4 className="text-sm uppercase tracking-wider">Importação e Exportação</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={onExport}
                            className="flex items-center justify-center gap-2 p-4 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors group"
                        >
                            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                <Download size={20} className="text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">Exportar CSV</p>
                                <p className="text-xs text-muted-foreground">Baixar lista filtrada</p>
                            </div>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="flex items-center justify-center gap-2 p-4 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors group disabled:opacity-50"
                        >
                            <div className="p-2 bg-secondary/10 rounded-lg group-hover:bg-secondary/20 transition-colors">
                                <Upload size={20} className="text-secondary-foreground" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">
                                    {isImporting ? 'Importando...' : 'Importar CSV'}
                                </p>
                                <p className="text-xs text-muted-foreground">Adicionar imóveis em lote</p>
                            </div>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportCSV}
                            accept=".csv"
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Rodapé do Modal */}
                <div className="pt-6 flex items-center justify-between">
                    <button
                        onClick={handleClearFilters}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={16} />
                        Limpar Filtros
                    </button>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-bold text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
                        >
                            Fechar
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-bold bg-[#404F4F] text-white hover:bg-[#2d3939] rounded-lg shadow-sm transition-all active:scale-95"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
