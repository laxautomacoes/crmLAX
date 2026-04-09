'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { MapPin, Search } from 'lucide-react';

interface LocationFiltersProps {
    onSearch: (filters: { uf: string; city: string; neighborhood: string }) => void;
    loading?: boolean;
}

export function LocationFilters({ onSearch, loading }: LocationFiltersProps) {
    const [states, setStates] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCities] = useState<{ value: string; label: string }[]>([]);
    const [selectedUF, setSelectedUF] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [neighborhood, setNeighborhood] = useState('');

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

    const handleSearch = () => {
        if (!selectedUF || !selectedCity || !neighborhood) return;
        onSearch({ uf: selectedUF, city: selectedCity, neighborhood });
    };

    return (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <MapPin className="text-secondary" size={20} />
                Localização da Análise
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormSelect
                    label="Estado"
                    value={selectedUF}
                    onChange={(e) => setSelectedUF(e.target.value)}
                    options={states}
                />
                <FormSelect
                    label="Cidade"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    options={cities}
                    disabled={!selectedUF}
                />
                <div className="w-full">
                    <label className="block text-sm font-bold text-foreground/80 ml-1 mb-1">Bairro</label>
                    <input
                        type="text"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Ex: Itaim Bibi"
                        className="w-full rounded-lg border border-muted-foreground/30 bg-card px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-foreground"
                    />
                </div>
            </div>
            <button
                onClick={handleSearch}
                disabled={loading || !selectedUF || !selectedCity || !neighborhood}
                className="w-full md:w-auto px-8 py-2.5 bg-secondary text-secondary-foreground font-black rounded-xl hover:bg-secondary/90 transition-all shadow-lg hover:shadow-secondary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Analisando dados...
                    </div>
                ) : (
                    <>
                        <Search size={18} />
                        Consultar Valor de m²
                    </>
                )}
            </button>
        </div>
    );
}
