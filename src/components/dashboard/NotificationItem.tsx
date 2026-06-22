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
    onToggleSelect: () => void;
    onRefresh: () => void;
}

export function NotificationItem({
    notification,
    isSelected,
    onToggleSelect,
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

    const handleMarkAsReadOnClick = async () => {
        if (!notification.read) {
            try {
                const result = await markAsRead([notification.id]);
                if (result.success) {
                    onRefresh();
                }
            } catch (error) {
                console.error('Error marking as read on click:', error);
            }
        }
    };

    return (
        <div
            className={`group flex w-full transition-all duration-200 overflow-hidden ${
                notification.read ? 'opacity-80' : 'bg-muted/10 border-l-[3px] border-l-secondary'
            } hover:bg-muted/30`}
        >
            <div
                className="flex items-start gap-4 py-4 px-4 md:px-6 w-full cursor-pointer"
                onClick={handleMarkAsReadOnClick}
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
                    <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-sm tracking-tight leading-snug truncate transition-colors ${
                            !notification.read ? 'font-bold text-foreground' : 'font-semibold text-foreground/85'
                        }`}>
                            {notification.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">
                            {formatRelativeDate(notification.created_at)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-3 mt-1.5">
                        <p className="text-xs text-foreground/80 whitespace-pre-wrap">
                            {notification.message}
                        </p>
                        
                        {notification.type === 'email_change_request' && (
                            <div className="flex flex-col items-start gap-2">
                                <div className="bg-secondary/5 p-3 rounded-lg border border-secondary/20 w-full">
                                    <p className="text-[10px] text-muted-foreground leading-snug">
                                        Esta é uma solicitação de segurança. Ao aprovar, o e-mail do colaborador será atualizado imediatamente no sistema de autenticação.
                                    </p>
                                </div>
                                <button
                                    onClick={handleApprove}
                                    disabled={isApproving}
                                    className="bg-secondary text-secondary-foreground font-black uppercase tracking-wider px-4 py-2 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50 text-[10px]"
                                >
                                    {isApproving ? (
                                        <div className="w-3.5 h-3.5 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                                    ) : (
                                        <Check size={14} strokeWidth={1} />
                                    )}
                                    Aprovar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
