'use client';

import { useMemo, useState } from 'react';
import { TransactionTabs } from './filters/TransactionTabs';
import { ModeToggles } from './filters/ModeToggles';
import { StandardBar } from './filters/StandardBar';
import { AdvancedDrawer } from './filters/AdvancedDrawer';
import { CodeBar } from './filters/CodeBar';
import { ProjectBar } from './filters/ProjectBar';
import { getUniqueCities, getUniqueNeighborhoods, getUniqueProjects } from '@/utils/property-filter';

interface PropertyFiltersProps {
    properties: any[];
    filters: any;
    onFilterChange: (filters: any) => void;
    viewMode?: 'gallery' | 'list' | 'map';
    onViewModeChange?: (mode: 'gallery' | 'list' | 'map') => void;
    mapUrl?: string;
    isHomepage?: boolean;
    onSearch?: () => void;
}

export function PropertyFilters({ properties = [], filters, onFilterChange, onSearch }: PropertyFiltersProps) {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const handleChange = (k: string, v: any) => onFilterChange({ ...filters, [k]: v });
    const cities = useMemo(() => getUniqueCities(properties), [properties]);
    const neighborhoods = useMemo(() => getUniqueNeighborhoods(properties, filters.cidade), [properties, filters.cidade]);
    const projects = useMemo(() => getUniqueProjects(properties), [properties]);
    const handleSubmit = () => onSearch?.();
    const mode = filters.searchMode || 'standard';

    return (
        <div className="w-full mb-8">
            <TransactionTabs value={filters.transactionType || 'venda'} onChange={(val) => handleChange('transactionType', val)} />
            <div className="bg-card rounded-2xl border border-border shadow-md p-6">
                {mode === 'code' ? (
                    <CodeBar value={filters.codigo || ''} onFieldChange={(val) => handleChange('codigo', val)} onSubmit={handleSubmit} onBack={() => { handleChange('searchMode', 'standard'); handleChange('codigo', ''); }} />
                ) : mode === 'project' ? (
                    <ProjectBar value={filters.empreendimento || ''} projects={projects} onFieldChange={(val) => handleChange('empreendimento', val)} onSubmit={handleSubmit} onBack={() => { handleChange('searchMode', 'standard'); handleChange('empreendimento', ''); }} />
                ) : (
                    <>
                        <StandardBar tipo={filters.tipo || ''} cidade={filters.cidade || ''} bairro={filters.bairro || ''} cities={cities} neighborhoods={neighborhoods} onFieldChange={handleChange} onSubmit={handleSubmit} />
                        {advancedOpen && <AdvancedDrawer filters={filters} onFieldChange={handleChange} />}
                    </>
                )}
                <ModeToggles searchMode={mode} advancedOpen={advancedOpen} onToggleAdvanced={() => setAdvancedOpen(!advancedOpen)} onChangeMode={(m) => { handleChange('searchMode', m); setAdvancedOpen(false); }} />
            </div>
        </div>
    );
}
