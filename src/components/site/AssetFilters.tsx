'use client';

import { Search, Filter, LayoutGrid, List } from 'lucide-react';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormSelect } from '@/components/shared/forms/FormSelect';

interface AssetFiltersProps {
    filters: {
        tipo: string;
        quartos: string;
        precoMin: string;
        precoMax: string;
        search: string;
    };
    onFilterChange: (filters: AssetFiltersProps['filters']) => void;
    viewMode: 'gallery' | 'list';
    onViewModeChange: (mode: 'gallery' | 'list') => void;
}

export function AssetFilters({ filters, onFilterChange, viewMode, onViewModeChange }: AssetFiltersProps) {
    const handleChange = (key: keyof typeof filters, value: string) => {
        onFilterChange({ ...filters, [key]: value });
    };

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Filter className="text-primary" size={20} />
                    <h3 className="text-lg font-bold text-primary">Filtros</h3>
                </div>
                <div className="flex items-center bg-muted border border-border rounded-lg p-1 shadow-sm">
                    <button
                        onClick={() => onViewModeChange('gallery')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'gallery' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                        title="Visualização em Galeria"
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                        title="Visualização em Lista"
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                    <FormInput
                        label="Buscar"
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                        placeholder="Bairro, condomínio ou tipo de imóvel..."
                        icon={Search}
                    />
                </div>

                <FormSelect
                    label="Tipo"
                    value={filters.tipo}
                    onChange={(e) => handleChange('tipo', e.target.value)}
                    options={[
                        { value: '', label: 'Todos os tipos' },
                        { value: 'house', label: 'Casa' },
                        { value: 'apartment', label: 'Apartamento' },
                        { value: 'land', label: 'Terreno' },
                        { value: 'commercial', label: 'Comercial' },
                        { value: 'penthouse', label: 'Cobertura' },
                        { value: 'studio', label: 'Studio' },
                        { value: 'rural', label: 'Rural' },
                        { value: 'warehouse', label: 'Galpão' },
                        { value: 'office', label: 'Sala/Escritório' },
                        { value: 'store', label: 'Loja' }
                    ]}
                />

                <FormInput
                    label="Quartos"
                    value={filters.quartos}
                    onChange={(e) => handleChange('quartos', e.target.value)}
                    placeholder="Ex: 2 ou mais"
                />

                <FormInput
                    label="Preço até"
                    value={filters.precoMax}
                    onChange={(e) => handleChange('precoMax', e.target.value)}
                    placeholder="Até R$ 1.500.000"
                />
            </div>
        </div>
    );
}

