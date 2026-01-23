'use client';

import { CheckCircle2 } from 'lucide-react';

interface ResetSuccessProps {
    message: string;
}

export function ResetSuccess({ message }: ResetSuccessProps) {
    return (
        <div className="flex flex-col items-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">Sucesso!</h3>
                <p className="text-sm text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}
