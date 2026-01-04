'use client';

import Link from 'next/link';

interface MenuItemProps {
    icon: any;
    label: string;
    onClick?: () => void;
    href?: string;
    isRed?: boolean;
}

export function MenuItem({ icon: Icon, label, onClick, href, isRed = false }: MenuItemProps) {
    const content = (
        <div className={`flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors ${isRed ? 'text-red-500' : 'text-foreground'}`}>
            <div className={`p-2 rounded-full border ${isRed ? 'border-red-100 bg-red-50' : 'border-border bg-card'}`}>
                <Icon size={20} className={isRed ? 'text-red-500' : 'text-foreground'} />
            </div>
            <span className="font-medium text-sm">{label}</span>
        </div>
    );

    if (href) return <Link href={href} className="block">{content}</Link>;

    return (
        <button onClick={onClick} className="w-full text-left block">
            {content}
        </button>
    );
}
