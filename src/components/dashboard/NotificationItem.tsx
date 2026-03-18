'use client';

import { useState } from 'react';
import { CheckSquare, Square, Bell, Clock, Check, ChevronDown, CheckCircle, Info, Zap, AlertTriangle, MessageCircle, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { markAsRead } from '@/app/_actions/notifications';
import { approveEmailChange } from '@/app/_actions/profile';
import { toast } from 'sonner';

export interface Notification {
    id: string;
    title: string;
    message: string;
    created_at: string;
    read: boolean;
    type?: string;
}

interface NotificationItemProps {
    notification: Notification;
    isSelected: boolean;
    isExpanded: boolean;
    onToggleSelect: () => void;
    onToggleExpand: () => void;
    onRefresh: () => void;
}

export function NotificationItem({
    notification,
    isSelected,
    isExpanded,
    onToggleSelect,
    onToggleExpand,
    onRefresh
}: NotificationItemProps) {
    const [isApproving, setIsApproving] = useState(false);

    const formatRelativeDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const distance = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
            return distance.charAt(0).toUpperCase() + distance.slice(1);
        } catch (e) {
            return dateString;
        }
    };

    const handleApprove = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setIsApproving(true);
            const result = await approveEmailChange(notification.id);
            if (result.error) throw new Error(result.error);
            toast.success('Solicitação aprovada com sucesso!');
            onRefresh();
        } catch (error: any) {
            toast.error('Erro ao aprovar: ' + error.message);
        } finally {
            setIsApproving(false);
        }
    };

    const handleToggleExpand = async () => {
        onToggleExpand();
        if (!notification.read) {
            try {
                const result = await markAsRead([notification.id]);
                if (result.success) {
                    onRefresh();
                }
            } catch (error) {
                console.error('Error marking as read on expand:', error);
            }
        }
    };

    return (
        <div
            className={`group flex flex-col w-full bg-card rounded-2xl border border-border/50 transition-all duration-300 shadow-md ring-1 ring-secondary/20 overflow-hidden ${
                notification.read ? 'border-l-transparent opacity-75' : 'border-l-secondary'
            } ${isExpanded ? 'scale-[1.005]' : 'hover:border-border/80 hover:bg-muted/5'}`}
        >
            <div
                className="flex items-start gap-4 p-4 px-4 md:px-6 h-auto md:h-[72px] shrink-0 cursor-pointer"
                onClick={handleToggleExpand}
            >
                <div className="flex items-center gap-3 shrink-0 pt-0.5 mt-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect();
                        }}
                        className="focus:outline-none focus:ring-2 focus:ring-secondary/20 rounded-md transition-all active:scale-95"
                    >
                        {isSelected ? (
                            <CheckSquare size={18} className="text-foreground" />
                        ) : (
                            <Square size={18} className="text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                        )}
                    </button>
                </div>

                <div className="flex-1 min-w-0 py-1">
                    <h4 className={`text-sm tracking-tight leading-snug truncate transition-colors ${
                        !notification.read ? 'font-bold text-foreground' : 'font-semibold text-foreground/85'
                    }`}>
                        {notification.title}
                    </h4>
                    {!isExpanded && (
                        <p className="text-xs text-foreground/75 truncate mt-0.5">
                            {notification.message}
                        </p>
                    )}
                </div>
                
                <div className="flex items-center gap-4 pt-2 shrink-0">
                    <ChevronDown 
                        size={14} 
                        className={`text-muted-foreground/30 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180 text-secondary' : 'group-hover:text-muted-foreground/60'}`} 
                    />
                </div>
            </div>

            {/* Area Expansível (Dropdown) */}
            {isExpanded && (
                <div className="px-4 md:px-6 pb-4 pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 ml-0 md:ml-[36px]">
                    <div className="flex flex-col items-start gap-3">
                        <div className="w-full">
                            <div className="bg-muted/30 p-3 py-2.5 rounded-xl border border-border/40">
                                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                    {notification.message}
                                </p>
                            </div>

                            {notification.type === 'email_change_request' && (
                                <div className="bg-secondary/5 p-3 rounded-lg border border-secondary/20 w-full">
                                    <p className="text-[10px] text-muted-foreground leading-snug">
                                        Esta é uma solicitação de segurança. Ao aprovar, o e-mail do colaborador será atualizado imediatamente no sistema de autenticação.
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-col items-start gap-2 w-full">
                            {notification.type === 'email_change_request' && (
                                <button
                                    onClick={handleApprove}
                                    disabled={isApproving}
                                    className="bg-secondary text-secondary-foreground font-black uppercase tracking-wider px-4 py-2 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50 text-[10px]"
                                >
                                    {isApproving ? (
                                        <div className="w-3.5 h-3.5 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                                    ) : (
                                        <Check size={14} />
                                    )}
                                    Aprovar
                                </button>
                            )}
                            
                            <div className="flex items-center gap-1.5 text-[9px] text-foreground/50 uppercase font-bold tracking-widest ml-1">
                                <Clock size={10} />
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
