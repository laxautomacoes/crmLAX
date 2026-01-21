'use client';

import { Search, Filter } from 'lucide-react';

interface AssetFiltersProps {
    filters: {
        tipo: string;
        quartos: string;
        precoMin: string;
        precoMax: string;
        search: string;
    };
    onFilterChange: (filters: AssetFiltersProps['filters']) => void;
}

export function AssetFilters({ filters, onFilterChange }: AssetFiltersProps) {
    const handleChange = (key: keyof typeof filters, value: string) => {
        onFilterChange({ ...filters, [key]: value });
    };

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
                <Filter className="text-[#404F4F]" size={20} />
                <h3 className="text-lg font-bold text-[#404F4F]">Filtros</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                    <label className="block text-sm font-bold text-gray-800 ml-1 mb-1.5">
                        Buscar
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleChange('search', e.target.value)}
                            placeholder="Bairro, condomínio ou tipo de imóvel..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 focus:border-[#FFE600] text-sm text-gray-900 placeholder-gray-500 font-medium"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-800 ml-1 mb-1.5">
                        Tipo
                    </label>
                    <input
                        type="text"
                        value={filters.tipo}
                        onChange={(e) => handleChange('tipo', e.target.value)}
                        placeholder="Ex: Apartamento, Casa, Terreno..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 focus:border-[#FFE600] text-sm text-gray-900 placeholder-gray-500 font-medium"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-800 ml-1 mb-1.5">
                        Quartos
                    </label>
                    <input
                        type="text"
                        value={filters.quartos}
                        onChange={(e) => handleChange('quartos', e.target.value)}
                        placeholder="Ex: 2 ou mais"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 focus:border-[#FFE600] text-sm text-gray-900 placeholder-gray-500 font-medium"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-800 ml-1 mb-1.5">
                        Preço até
                    </label>
                    <input
                        type="text"
                        value={filters.precoMax}
                        onChange={(e) => handleChange('precoMax', e.target.value)}
                        placeholder="Até R$ 1.500.000"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 focus:border-[#FFE600] text-sm text-gray-900 placeholder-gray-500 font-medium"
                    />
                </div>
            </div>
        </div>
    );
}

