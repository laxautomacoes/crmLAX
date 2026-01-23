'use client';

import { CheckSquare, Square } from 'lucide-react';
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
            className={`flex items-start gap-4 p-5 border-b border-border transition-all hover:bg-muted/50 ${!notification.read ? 'bg-secondary/10' : ''}`}
        >
            <button
                onClick={() => onToggleSelect(notification.id)}
                className="pt-0.5 shrink-0"
            >
                {isSelected ? (
                    <CheckSquare size={20} className="text-secondary" />
                ) : (
                    <Square size={20} className="text-muted-foreground/30" />
                )}
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-0.5">
                    <h4 className={`text-sm leading-tight ${!notification.read ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>
                        {notification.title}
                    </h4>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-medium text-muted-foreground/60 whitespace-nowrap">
                            {formatRelativeDate(notification.created_at)}
                        </span>
                        {!notification.read && (
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                        )}
                    </div>
                </div>
                <p className={`text-sm leading-relaxed ${!notification.read ? 'text-foreground/80 font-medium' : 'text-muted-foreground/70'}`}>
                    {notification.message}
                </p>
            </div>
        </div>
    );
}

