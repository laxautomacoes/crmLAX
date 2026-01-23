'use client';

import { Search, Filter, LayoutGrid, List } from 'lucide-react';

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
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">
                        Buscar
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleChange('search', e.target.value)}
                            placeholder="Bairro, condomínio ou tipo de imóvel..."
                            className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm text-foreground placeholder-muted-foreground font-medium"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">
                        Tipo
                    </label>
                    <input
                        type="text"
                        value={filters.tipo}
                        onChange={(e) => handleChange('tipo', e.target.value)}
                        placeholder="Ex: Apartamento, Casa, Terreno..."
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm text-foreground placeholder-muted-foreground font-medium"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">
                        Quartos
                    </label>
                    <input
                        type="text"
                        value={filters.quartos}
                        onChange={(e) => handleChange('quartos', e.target.value)}
                        placeholder="Ex: 2 ou mais"
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm text-foreground placeholder-muted-foreground font-medium"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">
                        Preço até
                    </label>
                    <input
                        type="text"
                        value={filters.precoMax}
                        onChange={(e) => handleChange('precoMax', e.target.value)}
                        placeholder="Até R$ 1.500.000"
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm text-foreground placeholder-muted-foreground font-medium"
                    />
                </div>
            </div>
        </div>
    );
}

