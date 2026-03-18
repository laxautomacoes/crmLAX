'use client';

import { CheckSquare, Square, Mail, Bell, Info, AlertCircle, Calendar, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    onToggleSelect: (id: string) => void;
}

export function NotificationItem({ notification, isSelected, onToggleSelect }: NotificationItemProps) {
    const getIcon = () => {
        const iconSize = 18;
        switch (notification.type) {
            case 'email_change_request':
                return <Mail size={iconSize} className="text-blue-500 transition-colors" />;
            case 'appointment':
            case 'reminder':
                return <Calendar size={iconSize} className="text-orange-500 transition-colors" />;
            case 'new_user':
            case 'invite':
                return <UserPlus size={iconSize} className="text-green-500 transition-colors" />;
            case 'alert':
            case 'warning':
                return <AlertCircle size={iconSize} className="text-red-500 transition-colors" />;
            case 'info':
                return <Info size={iconSize} className="text-blue-400 transition-colors" />;
            default:
                return <Bell size={iconSize} className="text-muted-foreground/60 transition-colors" />;
        }
    };

    const formatRelativeDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const distance = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
            return distance.charAt(0).toUpperCase() + distance.slice(1);
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div
            className={`flex items-start gap-4 p-5 border-b border-border transition-all hover:bg-muted/10 relative group
                ${!notification.read ? 'bg-secondary/[0.03] border-l-4 border-l-secondary shadow-sm' : 'border-l-4 border-l-transparent'}
                ${isSelected ? 'bg-secondary/10' : ''}`}
        >
            <div className="flex items-center gap-3 shrink-0 pt-0.5">
                <button
                    onClick={() => onToggleSelect(notification.id)}
                    className="focus:outline-none focus:ring-2 focus:ring-secondary/20 rounded-md transition-all active:scale-95"
                >
                    {isSelected ? (
                        <CheckSquare size={18} className="text-secondary" />
                    ) : (
                        <Square size={18} className="text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                    )}
                </button>
                <div className={`p-2.5 rounded-xl transition-all ${
                    !notification.read 
                    ? 'bg-background shadow-sm ring-1 ring-border/50' 
                    : 'bg-muted/30 opacity-60'
                }`}>
                    {getIcon()}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-1">
                    <h4 className={`text-sm tracking-tight leading-snug group-hover:text-foreground transition-colors ${
                        !notification.read ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'
                    }`}>
                        {notification.title}
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 whitespace-nowrap pt-1">
                        {formatRelativeDate(notification.created_at)}
                    </span>
                </div>
                <p className={`text-xs leading-relaxed transition-colors ${
                    !notification.read ? 'text-foreground/80 font-medium' : 'text-muted-foreground/50'
                }`}>
                    {notification.message}
                </p>
            </div>
        </div>
    );
}

