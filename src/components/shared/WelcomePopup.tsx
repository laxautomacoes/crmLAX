'use client';

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Zap, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function WelcomePopup({ user }: { user: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Verifica se o usuário precisa de boas-vindas baseado nos metadados
        if (user?.user_metadata?.welcome_required) {
            setIsOpen(true);
        }
    }, [user]);

    const handleConfirm = async () => {
        setLoading(true);
        const supabase = createClient();
        
        try {
            // 1. Marcar como boas-vindas concluídas nos metadados
            const { error } = await supabase.auth.updateUser({
                data: { welcome_required: false }
            });

            if (error) throw error;

            setIsOpen(false);
            // 2. Redirecionar para a página de perfil/configurações para trocar a senha
            router.push('/settings?change_password=true');
        } catch (error) {
            console.error('Erro ao processar boas-vindas:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={() => {}} // Bloqueia fechar sem clicar no botão
            title={null}
            size="md"
        >
            <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 bg-[#FFE600]/10 rounded-full flex items-center justify-center mb-6">
                    <Zap className="w-8 h-8 text-[#FFE600]" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-4">
                    Seja bem-vindo, {user?.user_metadata?.full_name?.split(' ')[0] || 'Admin'}!
                </h2>
                
                <p className="text-gray-400 mb-8 leading-relaxed">
                    Sua conta no CRM LAX foi ativada com sucesso. Para sua segurança, recomendamos que crie sua senha pessoal definitiva agora mesmo.
                </p>

                <div className="bg-[#1A2020] border border-white/5 rounded-xl p-4 mb-8 w-full flex items-center gap-4 text-left">
                    <ShieldCheck className="w-6 h-6 text-[#FFE600] shrink-0" />
                    <div>
                        <p className="text-white text-sm font-bold">Segurança em Primeiro Lugar</p>
                        <p className="text-gray-500 text-xs">Sua senha provisória expira em breve.</p>
                    </div>
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full bg-[#FFE600] text-[#404F4F] py-4 rounded-xl font-black text-lg hover:bg-[#F2DB00] transition-all flex items-center justify-center gap-2 group shadow-xl shadow-[#FFE600]/5"
                >
                    {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <>
                            CRIAR MINHA SENHA AGORA
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </Modal>
    );
}
