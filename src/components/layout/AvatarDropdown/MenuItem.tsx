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
        <div className={`flex items-center gap-3 px-4 py-1.5 hover:bg-muted/50 transition-colors ${isRed ? 'text-rose-500' : 'text-foreground'}`}>
            <div className={`p-1.5 rounded-full border-[0.5px] ${isRed ? 'border-rose-500/50 bg-rose-500/10' : 'border-foreground/40 bg-background'}`}>
                <Icon size={20} strokeWidth={1} className={isRed ? 'text-rose-500' : 'text-foreground'} />
            </div>
            <span className="font-medium text-sm md:text-base">{label}</span>
        </div>
    );

    if (href) return <Link href={href} className="block">{content}</Link>;

    return (
        <button onClick={onClick} className="w-full text-left block">
            {content}
        </button>
    );
}
