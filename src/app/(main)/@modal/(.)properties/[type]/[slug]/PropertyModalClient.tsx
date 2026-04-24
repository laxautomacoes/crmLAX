'use client';

import { useRouter } from 'next/navigation';
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

    return (
        <PropertyDetailsModal 
            isOpen={true} 
            onClose={() => router.back()} 
            prop={prop}
            userRole={userRole}
            hasAIAccess={hasAIAccess}
            hasMarketingAccess={hasMarketingAccess}
            tenantId={tenantId}
        />
    );
}
