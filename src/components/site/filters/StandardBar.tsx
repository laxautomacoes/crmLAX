'use client';
import { ChevronDown, Search } from 'lucide-react';

interface StandardBarProps {
    tipo: string; cidade: string; bairro: string; cities: string[]; neighborhoods: string[];
    onFieldChange: (key: 'tipo' | 'cidade' | 'bairro', val: string) => void;
    onSubmit: () => void;
}

export function StandardBar({ tipo, cidade, bairro, cities, neighborhoods, onFieldChange, onSubmit }: StandardBarProps) {
    return (
        <div className="bg-background border border-border rounded-xl shadow-sm flex flex-col md:flex-row items-stretch overflow-hidden">
            {/* Tipo */}
            <div className="flex-1 min-w-0 border-b md:border-b-0 md:border-r border-border/60 p-3 flex flex-col justify-center">
                <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-2 mb-0.5">
                    Tipo
                </label>
                <div className="relative">
                    <select
                        value={tipo}
                        onChange={(e) => onFieldChange('tipo', e.target.value)}
                        className="w-full bg-transparent text-foreground text-sm font-bold outline-none appearance-none px-2 py-1 cursor-pointer"
                    >
                        <option value="">Todos os tipos</option>
                        <option value="house">Casa</option>
                        <option value="apartment">Apartamento</option>
                        <option value="land">Terreno</option>
                        <option value="commercial">Comercial</option>
                        <option value="penthouse">Cobertura</option>
                        <option value="studio">Studio</option>
                        <option value="rural">Rural</option>
                        <option value="warehouse">Galpão</option>
                        <option value="office">Sala/Escritório</option>
                        <option value="store">Loja</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                </div>
            </div>

            {/* Cidade */}
            <div className="flex-1 min-w-0 border-b md:border-b-0 md:border-r border-border/60 p-3 flex flex-col justify-center">
                <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-2 mb-0.5">
                    Cidade
                </label>
                <div className="relative">
                    <select
                        value={cidade}
                        onChange={(e) => { onFieldChange('cidade', e.target.value); onFieldChange('bairro', ''); }}
                        className="w-full bg-transparent text-foreground text-sm font-bold outline-none appearance-none px-2 py-1 cursor-pointer"
                    >
                        <option value="">Todas as cidades</option>
                        {cities.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                </div>
            </div>

            {/* Bairro */}
            <div className="flex-[2] min-w-0 border-b md:border-b-0 border-border/60 p-3 flex flex-col justify-center">
                <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-2 mb-0.5">
                    Bairro
                </label>
                <div className="relative">
                    <select
                        value={bairro}
                        onChange={(e) => onFieldChange('bairro', e.target.value)}
                        className="w-full bg-transparent text-foreground text-sm font-bold outline-none appearance-none px-2 py-1 cursor-pointer"
                    >
                        <option value="">Todos os bairros</option>
                        {neighborhoods.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                </div>
            </div>

            {/* Buscar Button */}
            <div className="shrink-0 flex items-center p-2">
                <button
                    type="button"
                    onClick={onSubmit}
                    className="w-full md:w-auto h-full px-8 py-3.5 bg-secondary text-secondary-foreground font-black text-sm hover:bg-[#F2DB00] transition-all transform active:scale-[0.99] rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                    <Search size={16} />
                    BUSCAR
                </button>
            </div>
        </div>
    );
}
