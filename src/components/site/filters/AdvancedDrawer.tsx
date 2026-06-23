'use client';

interface AdvancedDrawerProps {
    filters: any;
    onFieldChange: (key: string, val: any) => void;
}

export function AdvancedDrawer({ filters, onFieldChange }: AdvancedDrawerProps) {
    const formatPrice = (v: string) => {
        const num = parseFloat(v);
        return (!v || isNaN(num) || num >= 15000000) ? 'Qualquer preço' : `Até ${num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`;
    };

    const formatArea = (v: string) => {
        const num = parseFloat(v);
        return (!v || isNaN(num) || num >= 1000) ? 'Qualquer área' : `Até ${num}m²`;
    };

    const renderButtonGroup = (label: string, fieldKey: string, isSuite = false) => (
        <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1">{label}</label>
            <div className="flex bg-muted rounded-lg p-1 border border-border/40">
                {['', '1', '2', '3', '4'].map(val => {
                    const active = (filters[fieldKey] || '') === val;
                    return (
                        <button key={val} type="button" onClick={() => onFieldChange(fieldKey, val)}
                            className={`flex-1 text-[11px] py-1.5 rounded-md font-bold transition-all cursor-pointer ${active ? 'bg-primary text-primary-foreground shadow-sm font-black' : 'text-muted-foreground hover:text-foreground font-semibold'}`}>
                            {val === '' ? 'Todos' : val === '4' ? '4+' : (isSuite ? `${val}+` : val)}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="pt-6 border-t border-border/40 mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {renderButtonGroup('Dormitórios', 'quartos')}
                {renderButtonGroup('Suítes', 'suites', true)}
                {renderButtonGroup('Banheiros', 'banheiros', true)}
                {renderButtonGroup('Vagas', 'vagas', true)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Preço máximo</span>
                        <span className="text-xs font-bold text-foreground">{formatPrice(filters.precoMax)}</span>
                    </div>
                    <input type="range" min="100000" max="15000000" step="100000" value={filters.precoMax || '15000000'} onChange={(e) => onFieldChange('precoMax', e.target.value === '15000000' ? '' : e.target.value)} className="w-full accent-secondary" />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Área máxima</span>
                        <span className="text-xs font-bold text-foreground">{formatArea(filters.areaMax)}</span>
                    </div>
                    <input type="range" min="20" max="1000" step="10" value={filters.areaMax || '1000'} onChange={(e) => onFieldChange('areaMax', e.target.value === '1000' ? '' : e.target.value)} className="w-full accent-secondary" />
                </div>
            </div>

            <div className="flex gap-6 mt-6 justify-start px-1">
                {(['mobiliado', 'ofertas'] as const).map(key => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={!!filters[key]} onChange={(e) => onFieldChange(key, e.target.checked)} className="sr-only peer" />
                        <div className="relative w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                        <span className="text-[10px] font-bold text-foreground tracking-tight uppercase">{key === 'mobiliado' ? 'Mobiliado' : 'Ofertas / Destaques'}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
