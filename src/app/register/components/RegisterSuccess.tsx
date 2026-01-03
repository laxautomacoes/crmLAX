'use client';

import { Mail } from 'lucide-react';
import Link from 'next/link';

export function RegisterSuccess() {
    return (
        <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-center space-y-4">
                <h3 className="text-xl font-bold text-[#404F4F]">
                    Obrigado por se cadastrar no CRM LAX!
                </h3>
                <p className="text-sm font-medium text-gray-600">
                    Verifique seu e-mail para confirmar o cadastro.
                </p>
            </div>
            <div className="pt-4 w-full">
                <Link
                    href="/login"
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-[#404F4F] bg-[#FFE600] hover:bg-[#F2DB00] transition-all text-center"
                >
                    Voltar para o Login
                </Link>
            </div>
        </div>
    );
}
