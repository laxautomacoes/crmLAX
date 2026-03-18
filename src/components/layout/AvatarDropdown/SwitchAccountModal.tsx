'use client';

import { Modal } from '@/components/shared/Modal';
import { getStoredAccounts, removeAccount, StoredAccount } from '@/lib/utils/multi-account';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Plus, LogOut, Check, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface SwitchAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentEmail?: string;
}

export function SwitchAccountModal({ isOpen, onClose, currentEmail }: SwitchAccountModalProps) {
    const [accounts, setAccounts] = useState<StoredAccount[]>([]);
    const [switching, setSwitching] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            setAccounts(getStoredAccounts());
        }
    }, [isOpen]);

    const handleSwitch = async (account: StoredAccount) => {
        if (account.email === currentEmail) return;
        
        setSwitching(account.email);
        try {
            const { error } = await supabase.auth.setSession(account.session);
            
            if (error) {
                toast.error('Erro ao trocar de conta: ' + error.message);
                removeAccount(account.email); // Probably expired
                setAccounts(getStoredAccounts());
                return;
            }

            toast.success(`Trocando para ${account.name}...`);
            onClose();
            window.location.href = '/dashboard';
        } catch (err) {
            toast.error('Falha ao trocar de conta.');
        } finally {
            setSwitching(null);
        }
    };

    const handleAddAccount = async () => {
        // Sign out of current session to allow new login
        // But do NOT remove from multi-account storage
        await supabase.auth.signOut();
        onClose();
        router.push('/login');
        router.refresh();
    };

    const handleRemoveAccount = (e: React.MouseEvent, email: string) => {
        e.stopPropagation();
        removeAccount(email);
        setAccounts(getStoredAccounts());
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Trocar Conta"
            size="sm"
        >
            <div className="space-y-2">
                {accounts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                        Nenhuma outra conta encontrada.
                    </p>
                ) : (
                    <div className="flex flex-col gap-1">
                        {accounts.map((account) => {
                            const isCurrent = account.email === currentEmail;
                            return (
                                <button
                                    key={account.email}
                                    onClick={() => handleSwitch(account)}
                                    disabled={switching !== null}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${
                                        isCurrent 
                                        ? 'border-[#FFE600]/50 bg-[#FFE600]/10' 
                                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <UserAvatar 
                                            src={account.avatar_url} 
                                            name={account.name} 
                                            className="h-10 w-10"
                                        />
                                        <div className="flex flex-col items-start justify-center overflow-hidden flex-1 min-w-0 h-10 text-left">
                                            <div className="text-sm font-bold text-foreground truncate w-full max-w-[220px]">
                                                {account.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate w-full max-w-[220px]">
                                                {account.email}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-end w-8 shrink-0">
                                        {isCurrent ? (
                                            <div className="h-6 w-6 rounded-full bg-[#FFE600] flex items-center justify-center text-[#404F4F] shrink-0">
                                                <Check size={14} strokeWidth={3} />
                                            </div>
                                        ) : switching === account.email ? (
                                            <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                                        ) : (
                                            <button
                                                onClick={(e) => handleRemoveAccount(e, account.email)}
                                                className="p-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="pt-4 flex flex-col gap-2">
                    <button
                        onClick={handleAddAccount}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#FFE600] text-[#404F4F] rounded-xl text-sm font-bold hover:bg-[#F2DB00] transition-all transform active:scale-[0.99]"
                    >
                        <Plus size={18} />
                        Adicionar conta
                    </button>
                    
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </Modal>
    );
}
