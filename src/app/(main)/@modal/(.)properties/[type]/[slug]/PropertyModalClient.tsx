'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { PropertyDetailsModal } from '@/components/dashboard/properties/PropertyDetailsModal';

interface PropertyModalClientProps {
    prop: any;
    userRole?: string;
    userId?: string;
    hasAIAccess: boolean;
    hasMarketingAccess: boolean;
    tenantId: string;
}

export function PropertyModalClient({ 
    prop, 
    userRole, 
    userId,
    hasAIAccess, 
    hasMarketingAccess, 
    tenantId 
}: PropertyModalClientProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(true);
    const isEditingRef = useRef(false);
    const hasHistory = useRef(typeof window !== 'undefined' && window.history.length > 1);

    const handleClose = () => {
        setIsOpen(false);
        if (isEditingRef.current) return;
        if (hasHistory.current) {
            router.back();
        } else {
            router.push('/properties');
        }
    };

    const handleEdit = () => {
        isEditingRef.current = true;
        setIsOpen(false);

        // Dispara evento customizado para abrir o modal de edição instantaneamente no PropertiesClient
        const event = new CustomEvent('open-edit-property', { detail: prop });
        window.dispatchEvent(event);

        if (hasHistory.current) {
            router.back();
        } else {
            router.push('/properties');
        }
    };

    return (
        <PropertyDetailsModal 
            isOpen={isOpen} 
            onClose={handleClose} 
            onEdit={handleEdit}
            prop={prop}
            userRole={userRole}
            userId={userId}
            hasAIAccess={hasAIAccess}
            hasMarketingAccess={hasMarketingAccess}
            tenantId={tenantId}
        />
    );
}
