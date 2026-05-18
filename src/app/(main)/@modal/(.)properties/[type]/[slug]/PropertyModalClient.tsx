'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { PropertyDetailsModal } from '@/components/dashboard/properties/PropertyDetailsModal';

interface PropertyModalClientProps {
    prop: any;
    userRole?: string;
    hasAIAccess: boolean;
    hasMarketingAccess: boolean;
    tenantId: string;
}

export function PropertyModalClient({ 
    prop, 
    userRole, 
    hasAIAccess, 
    hasMarketingAccess, 
    tenantId 
}: PropertyModalClientProps) {
    const router = useRouter();
    const hasHistory = useRef(typeof window !== 'undefined' && window.history.length > 1);

    const handleClose = () => {
        if (hasHistory.current) {
            router.back();
        } else {
            router.push('/properties');
        }
    };

    return (
        <PropertyDetailsModal 
            isOpen={true} 
            onClose={handleClose} 
            prop={prop}
            userRole={userRole}
            hasAIAccess={hasAIAccess}
            hasMarketingAccess={hasMarketingAccess}
            tenantId={tenantId}
        />
    );
}
