'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'
import { Download, Upload, ChevronDown } from 'lucide-react'
import { propertyTypes } from '@/utils/property-translations'
import { toast } from 'sonner'
import { bulkCreateProperties } from '@/app/_actions/properties'
import { formatCurrencyBRL } from '@/lib/utils/currency'
import { toTitleCase } from '@/lib/utils/normalize'

interface PropertyFiltersModalProps {
    isOpen: boolean
    onClose: () => void
    filters: any
    setFilters: (filters: any) => void
    onExport: () => void
    tenantId: string | null
    onImportSuccess: () => void
    userRole?: string
    availableCities?: string[]
    availableNeighborhoods?: string[]
}

export function PropertyFiltersModal({
    isOpen,
    onClose,
    filters,
    setFilters,
    onExport,
    tenantId,
    onImportSuccess,
    userRole,
    availableCities = [],
    availableNeighborhoods = []
}: PropertyFiltersModalProps) {
    const [isImporting, setIsImporting] = useState(false)
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleClearFilters = () => {
        setFilters({
            status: 'all',
            type: 'all',
            minPrice: '',
            maxPrice: '',
            bedrooms: 'all',
            bathrooms: 'all',
            garages: 'all',
            city: '',
            neighborhood: '',
            ownerType: 'all',
            situacao: 'all',
            suites: 'all',
            minArea: '',
            maxArea: '',
            published: 'all',
            empreendimento: 'all',
            sortBy: 'newest',
            archived: false,
            // Filtros avançados
            has_dependencia_empregada: false,
            has_despensa: false,
            has_escritorio: false,
            has_lavabo: false,
            has_sacada_sem_churrasqueira: false,
            has_sacada_com_churrasqueira: false,
            has_vista_livre: false
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
                const propertiesToCreate = lines.slice(1)
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
                                bairro: toTitleCase(clean(values[5])),
                                cidade: toTitleCase(clean(values[6])),
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
                            type: clean(values[2]) || 'apartment',
                            price: parseFloat(clean(values[3])) || 0,
                            status: clean(values[4]) || 'Available',
                            details: details,
                            images: [],
                            videos: [],
                            documents: []
                        }
                    })

                if (propertiesToCreate.length === 0) {
                    toast.error('Nenhum dado encontrado no CSV')
                    return
                }

                const result = await bulkCreateProperties(tenantId, propertiesToCreate)
                if (result.success) {
                    toast.success(`${propertiesToCreate.length} imóveis importados com sucesso!`)
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
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={<h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">Filtrar Imóvel</h3>}
            size="xl"
            extraHeaderContent={
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleClearFilters}
                        title="Limpar filtros"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all text-sm font-medium"
                    >
                        <span className="hidden sm:inline">Limpar</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold shadow-sm active:scale-[0.99] transition-all text-sm whitespace-nowrap hover:opacity-90 min-w-[120px] text-center"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            }
        >
            <div className="space-y-8">
                {/* Seção de Filtros */}
                <div className="space-y-4">
                    <h4 className="text-base font-black text-foreground uppercase tracking-widest mb-4">
                        Filtros Principais
                    </h4>
                    {/* Localização */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormSelect
                            label="Cidade"
                            value={filters.city}
                            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                            options={[
                                { value: '', label: 'Todas as Cidades' },
                                ...availableCities.map(c => ({ value: c, label: c }))
                            ]}
                        />
                        <FormSelect
                            label="Bairro"
                            value={filters.neighborhood}
                            onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })}
                            options={[
                                { value: '', label: 'Todos os Bairros' },
                                ...availableNeighborhoods.map(n => ({ value: n, label: n }))
                            ]}
                        />
                    </div>

                    {/* Ambientes */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormSelect
                            label="Dormitórios"
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
                            label="Suítes"
                            value={filters.suites}
                            onChange={(e) => setFilters({ ...filters, suites: e.target.value })}
                            options={[
                                { value: 'all', label: 'Qualquer' },
                                { value: '1', label: '1+' },
                                { value: '2', label: '2+' },
                                { value: '3', label: '3+' },
                                { value: '4', label: '4+' }
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
                            value={filters.garages}
                            onChange={(e) => setFilters({ ...filters, garages: e.target.value })}
                            options={[
                                { value: 'all', label: 'Qualquer' },
                                { value: '1', label: '1+' },
                                { value: '2', label: '2+' },
                                { value: '3', label: '3+' },
                                { value: '4', label: '4+' }
                            ]}
                        />
                    </div>

                    {/* Classificação */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormSelect
                            label="Tipo de Imóvel"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            options={[
                                { value: 'all', label: 'Todos os Tipos' },
                                ...Object.entries(propertyTypes).map(([val, label]) => ({ value: val, label }))
                            ]}
                        />
                        <FormSelect
                            label="Categoria"
                            value={filters.empreendimento}
                            onChange={(e) => setFilters({ ...filters, empreendimento: e.target.value })}
                            options={[
                                { value: 'all', label: 'Todos' },
                                { value: 'sim', label: 'Apenas Empreendimentos' },
                                { value: 'nao', label: 'Apenas Imóveis Avulsos' }
                            ]}
                        />
                        <FormSelect
                            label="Origem"
                            value={filters.ownerType}
                            onChange={(e) => setFilters({ ...filters, ownerType: e.target.value })}
                            options={[
                                { value: 'all', label: 'Todos' },
                                { value: 'vendedor', label: 'Vendedor (PF)' },
                                { value: 'construtora', label: 'Construtora' },
                                { value: 'sem_proprietario', label: 'Sem Proprietário' }
                            ]}
                        />
                    </div>

                    {/* Status e Administrativo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormSelect
                            label="Situação"
                            value={filters.situacao}
                            onChange={(e) => setFilters({ ...filters, situacao: e.target.value })}
                            options={[
                                { value: 'all', label: 'Qualquer' },
                                { value: 'lançamento', label: 'Lançamento' },
                                { value: 'em construção', label: 'Em construção' },
                                { value: 'novo', label: 'Novo' },
                                { value: 'revenda', label: 'Revenda' }
                            ]}
                        />
                        {isAdmin && (
                            <>
                                <FormSelect
                                    label="Status"
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    options={[
                                        { value: 'all', label: 'Todos os Status' },
                                        { value: 'Pending', label: 'Pendente' },
                                        { value: 'Available', label: 'Disponível' },
                                        { value: 'Vendido', label: 'Vendido' },
                                        { value: 'Reservado', label: 'Reservado' },
                                        { value: 'Suspenso', label: 'Suspenso' }
                                    ]}
                                />
                                <FormSelect
                                    label="Publicado no Site"
                                    value={filters.published}
                                    onChange={(e) => setFilters({ ...filters, published: e.target.value })}
                                    options={[
                                        { value: 'all', label: 'Todos' },
                                        { value: 'yes', label: 'Apenas Publicados' },
                                        { value: 'no', label: 'Não Publicados' }
                                    ]}
                                />
                            </>
                        )}
                    </div>

                    {/* Preços */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Preço Mínimo"
                            placeholder="0,00"
                            value={filters.minPrice}
                            onChange={(e) => setFilters({ ...filters, minPrice: formatCurrencyBRL(e.target.value) })}
                        />
                        <FormInput
                            label="Preço Máximo"
                            placeholder="0,00"
                            value={filters.maxPrice}
                            onChange={(e) => setFilters({ ...filters, maxPrice: formatCurrencyBRL(e.target.value) })}
                        />
                    </div>

                    {/* Áreas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Área Mín. (m²)"
                            placeholder="Ex: 50"
                            value={filters.minArea}
                            onChange={(e) => setFilters({ ...filters, minArea: e.target.value })}
                        />
                        <FormInput
                            label="Área Máx. (m²)"
                            placeholder="Ex: 200"
                            value={filters.maxArea}
                            onChange={(e) => setFilters({ ...filters, maxArea: e.target.value })}
                        />
                    </div>

                </div>

                {/* Filtros Avançados */}
                <div className="pt-6 space-y-4 border-t border-border/50">
                    <h4 className="text-base font-black text-foreground uppercase tracking-widest mb-4">
                        Filtros Avançados
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                        <FormCheckbox label="Dependência de Empregada" checked={filters.has_dependencia_empregada || false} onChange={(e) => setFilters({ ...filters, has_dependencia_empregada: e.target.checked })} />
                        <FormCheckbox label="Despensa" checked={filters.has_despensa || false} onChange={(e) => setFilters({ ...filters, has_despensa: e.target.checked })} />
                        <FormCheckbox label="Escritório" checked={filters.has_escritorio || false} onChange={(e) => setFilters({ ...filters, has_escritorio: e.target.checked })} />
                        <FormCheckbox label="Lavabo" checked={filters.has_lavabo || false} onChange={(e) => setFilters({ ...filters, has_lavabo: e.target.checked })} />
                        <FormCheckbox label="Sacada" checked={filters.has_sacada_sem_churrasqueira || false} onChange={(e) => setFilters({ ...filters, has_sacada_sem_churrasqueira: e.target.checked })} />
                        <FormCheckbox label="Sacada c/ Churrasqueira" checked={filters.has_sacada_com_churrasqueira || false} onChange={(e) => setFilters({ ...filters, has_sacada_com_churrasqueira: e.target.checked })} />
                        <FormCheckbox label="Vista Livre" checked={filters.has_vista_livre || false} onChange={(e) => setFilters({ ...filters, has_vista_livre: e.target.checked })} />
                    </div>
                </div>

                {/* Seção de Ações */}
                <div className="pt-6 space-y-4">
                    <h4 className="text-base font-black text-foreground uppercase tracking-widest mb-4">
                        Importação e Exportação
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={onExport}
                            className="flex items-center justify-center gap-2 p-4 bg-background border border-border/40 rounded-lg hover:bg-gray-50 dark:hover:bg-muted/30 transition-all group"
                        >
                            <div className="p-2 bg-foreground/10 rounded-md group-hover:bg-foreground/20 transition-colors">
                                <Download size={20} className="text-foreground" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-foreground">Exportar CSV</p>
                                <p className="text-xs text-foreground">Baixar lista filtrada</p>
                            </div>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="flex items-center justify-center gap-2 p-4 bg-background border border-border/40 rounded-lg hover:bg-gray-50 dark:hover:bg-muted/30 transition-all group disabled:opacity-50"
                        >
                            <div className="p-2 bg-foreground/10 rounded-md group-hover:bg-foreground/20 transition-colors">
                                <Upload size={20} className="text-foreground" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-foreground">
                                    {isImporting ? 'Importando...' : 'Importar CSV'}
                                </p>
                                <p className="text-xs text-foreground">Adicionar imóveis em lote</p>
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
            </div>
        </Modal>
    )
}
