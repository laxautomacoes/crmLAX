'use client';

interface TransactionTabsProps {
    value: 'venda' | 'aluguel' | 'lancamentos';
    onChange: (val: 'venda' | 'aluguel' | 'lancamentos') => void;
}

export function TransactionTabs({ value, onChange }: TransactionTabsProps) {
    const labelMap = { venda: 'VENDA', aluguel: 'ALUGUEL', lancamentos: 'LANÇAMENTOS' };

    return (
        <div className="flex gap-3 mb-4 justify-center">
            {(['venda', 'aluguel', 'lancamentos'] as const).map(t => {
                const active = value === t;
                return (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onChange(t)}
                        className={`px-6 py-2.5 text-xs font-bold transition-all uppercase tracking-wider rounded-full cursor-pointer shadow-sm ${
                            active 
                                ? 'bg-primary text-primary-foreground dark:bg-[#FFE600] dark:text-[#111827] font-black' 
                                : 'bg-card border border-border/80 text-muted-foreground hover:bg-muted/50 hover:text-foreground font-semibold'
                        }`}
                    >
                        {labelMap[t]}
                    </button>
                );
            })}
        </div>
    );
}
