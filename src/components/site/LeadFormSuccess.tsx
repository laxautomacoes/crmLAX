'use client';

import { CheckCircle } from 'lucide-react';

export function LeadFormSuccess() {
    return (
        <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">
                Solicitação enviada com sucesso!
            </p>
            <p className="text-sm text-muted-foreground">
                Entraremos em contato em breve.
            </p>
        </div>
    );
}

