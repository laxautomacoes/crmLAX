'use client';
import { Search } from 'lucide-react';

interface CodeBarProps {
    value: string;
    onFieldChange: (val: string) => void;
    onSubmit: () => void;
    onBack: () => void;
}

export function CodeBar({ value, onFieldChange, onSubmit, onBack }: CodeBarProps) {
    return (
        <div className="w-full">
            <div className="bg-background border border-border rounded-xl shadow-sm flex items-stretch overflow-hidden">
                <div className="flex-1 p-3 flex flex-col justify-center">
                    <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-2 mb-0.5">
                        Digite o Código do Imóvel
                    </label>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onFieldChange(e.target.value)}
                        placeholder="Ex: AP-LA-F259..."
                        className="w-full bg-transparent text-foreground text-sm font-bold outline-none px-2 py-1 placeholder:text-muted-foreground/35"
                    />
                </div>
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
            <div className="flex justify-center mt-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                >
                    ← Voltar para busca
                </button>
            </div>
        </div>
    );
}
