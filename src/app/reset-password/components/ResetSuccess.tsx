'use client';

import { CheckCircle2 } from 'lucide-react';

interface ResetSuccessProps {
    message: string;
}

export function ResetSuccess({ message }: ResetSuccessProps) {
    return (
        <div className="flex flex-col items-center py-4 md:py-8 space-y-3 md:space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            </div>
            <div className="text-center">
                <h3 className="text-base md:text-lg font-bold text-foreground">Sucesso!</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}
