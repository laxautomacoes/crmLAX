'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { Plus, X } from 'lucide-react';

export const NEIGHBORHOOD_COLORS = [
    { name: 'Bairro 1', color: 'var(--secondary)', tailwind: 'bg-secondary', text: 'text-secondary' },
    { name: 'Bairro 2', color: '#6366f1', tailwind: 'bg-indigo-500', text: 'text-indigo-500' },
    { name: 'Bairro 3', color: '#f97316', tailwind: 'bg-orange-500', text: 'text-orange-500' },
];

interface LocationFiltersProps {
    onSearch: (filters: { 
        uf: string; 
        city: string; 
        neighborhoods: string[]; 
        propertyType?: string; 
        bedrooms?: string; 
        priceMin?: string; 
        priceMax?: string; 
    }) => void;
    loading?: boolean;
    children?: React.ReactNode;
}

export function LocationFilters({ onSearch, loading, children }: LocationFiltersProps) {
    const [states, setStates] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCities] = useState<{ value: string; label: string }[]>([]);
    const [selectedUF, setSelectedUF] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [neighborhoods, setNeighborhoods] = useState<string[]>(['']);
    
    const [propertyType, setPropertyType] = useState('');
    const [bedrooms, setBedrooms] = useState('');

    useEffect(() => {
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => res.json())
            .then(data => {
                const formatted = data.map((s: any) => ({ value: s.sigla, label: s.nome }));
                setStates([{ value: '', label: 'Selecionar Estado' }, ...formatted]);
            })
            .catch(err => console.error('Error fetching states:', err));
    }, []);

    useEffect(() => {
        if (selectedUF) {
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUF}/municipios?orderBy=nome`)
                .then(res => res.json())
                .then(data => {
                    const formatted = data.map((c: any) => ({ value: c.nome, label: c.nome }));
                    setCities([{ value: '', label: 'Selecionar Cidade' }, ...formatted]);
                })
                .catch(err => console.error('Error fetching cities:', err));
        } else {
            setCities([{ value: '', label: 'Selecionar Cidade' }]);
        }
        setSelectedCity('');
    }, [selectedUF]);

    const addNeighborhood = () => {
        if (neighborhoods.length < 3) {
            setNeighborhoods([...neighborhoods, '']);
        }
    };

    const removeNeighborhood = (index: number) => {
        setNeighborhoods(neighborhoods.filter((_, i) => i !== index));
    };

    const updateNeighborhood = (index: number, value: string) => {
        const updated = [...neighborhoods];
        updated[index] = value;
        setNeighborhoods(updated);
    };

    const filledNeighborhoods = neighborhoods.filter(n => n.trim() !== '');
    const canSearch = selectedUF && selectedCity && filledNeighborhoods.length > 0;

    const handleSearch = () => {
        if (!canSearch) return;
        onSearch({ 
            uf: selectedUF, 
            city: selectedCity, 
            neighborhoods: filledNeighborhoods,
            propertyType, bedrooms
        });
    };

    return (
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-foreground">
                Características e Localização
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <FormSelect
                    label="Tipo de Imóvel"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    options={[
                        { value: '', label: 'Qualquer Tipo' },
                        { value: 'Apartamento', label: 'Apartamento' },
                        { value: 'Casa', label: 'Casa' },
                        { value: 'Cobertura', label: 'Cobertura' },
                        { value: 'Sobrado', label: 'Sobrado' },
                        { value: 'Terreno', label: 'Terreno' }
                    ]}
                />
                <FormSelect
                    label="Dormitórios"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    options={[
                        { value: '', label: 'Qualquer' },
                        { value: '1', label: '1 Quarto' },
                        { value: '2', label: '2 Quartos' },
                        { value: '3', label: '3 Quartos' },
                        { value: '4 ou mais', label: '4+ Quartos' }
                    ]}
                />
                <FormSelect
                    label="Estado *"
                    value={selectedUF}
                    onChange={(e) => setSelectedUF(e.target.value)}
                    options={states}
                />
                <FormSelect
                    label="Cidade *"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    options={cities}
                    disabled={!selectedUF}
                />
            </div>

            <div className="space-y-4 pt-2">

                {/* Bairros em linha */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {neighborhoods.map((neighborhood, index) => (
                        <div 
                            key={index} 
                            className="flex items-end gap-2 rounded-lg p-3 pl-4 border border-muted-foreground/30"
                            style={{ borderLeftWidth: '3px', borderLeftColor: NEIGHBORHOOD_COLORS[index].color }}
                        >
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-foreground/80 ml-1 mb-1">
                                    Bairro {index + 1}
                                </label>
                                <input
                                    type="text"
                                    value={neighborhood}
                                    onChange={(e) => updateNeighborhood(index, e.target.value)}
                                    placeholder={`Ex: ${index === 0 ? 'Itaim Bibi' : index === 1 ? 'Vila Olímpia' : 'Pinheiros'}`}
                                    className="w-full rounded-lg border border-muted-foreground/30 bg-background px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-foreground"
                                />
                            </div>
                            {index > 0 && (
                                <button
                                    type="button"
                                    onClick={() => removeNeighborhood(index)}
                                    className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all mb-0.5"
                                    title="Remover bairro"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Adicionar Bairro + Consultar Valor */}
                <div className="flex items-center gap-3">
                    {neighborhoods.length < 3 && (
                        <button
                            type="button"
                            onClick={addNeighborhood}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-muted-foreground/30 bg-muted/30 text-foreground hover:bg-secondary/20 hover:border-secondary hover:text-secondary transition-all text-xs font-bold"
                        >
                            <Plus size={14} />
                            Adicionar Bairro
                        </button>
                    )}
                    <div className="flex-1" />
                    <button
                        onClick={handleSearch}
                        disabled={loading || !canSearch}
                        className="h-[38px] px-8 bg-secondary text-secondary-foreground font-black rounded-lg hover:bg-secondary/90 transition-all shadow-lg hover:shadow-secondary/20 flex items-center justify-center gap-2 disabled:opacity-50 uppercase text-xs tracking-wider whitespace-nowrap"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Analisando...
                            </div>
                        ) : (
                            'Consultar Valor'
                        )}
                    </button>
                </div>
            </div>

            {/* Conteúdo filho (resultados + histórico) */}
            {children && (
                <div className="space-y-6 pt-2">
                    {children}
                </div>
            )}
        </div>
    );
}
