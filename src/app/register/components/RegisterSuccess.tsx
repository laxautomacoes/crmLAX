'use client';

import { Mail } from 'lucide-react';
import Link from 'next/link';

export function RegisterSuccess() {
    return (
        <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-center space-y-4">
                <h3 className="text-xl font-bold text-foreground">
                    Obrigado por se cadastrar no CRM LAX!
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                    Verifique seu e-mail para confirmar o cadastro.
                </p>
            </div>
            <div className="pt-4 w-full">
                <Link
                    href="/login"
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-secondary-foreground bg-secondary hover:opacity-90 transition-opacity text-center"
                >
                    Voltar para o Login
                </Link>
            </div>
        </div>
    );
}
