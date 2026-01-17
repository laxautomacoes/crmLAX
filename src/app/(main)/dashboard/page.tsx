'use client';

import { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import KPICards from '@/components/dashboard/KPICards';
import SalesFunnel from '@/components/dashboard/SalesFunnel';
import RecentLeadsList from '@/components/dashboard/RecentLeadsList';
import { FilterModal } from '@/components/dashboard/FilterModal';

export default function DashboardPage() {
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">

            {/* Mobile-only Welcome Message (Centered, Small) */}
            <div className="md:hidden text-center -mt-2 mb-2">
                <p className="text-sm text-muted-foreground">Bem-vindo, <span className="font-semibold text-foreground">Léo Acosta</span></p>
            </div>

            {/* Header / Actions Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Page Title (Moved here as per request) */}
                <h1 className="text-2xl font-bold text-foreground text-center md:text-left">
                    Dashboard
                </h1>

                <div className="flex items-center justify-center md:justify-end gap-3">
                    <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium">
                        <Plus size={18} />
                        Novo Lead
                    </button>
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className="flex items-center gap-2 bg-card border border-border text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium"
                    >
                        <Filter size={18} />
                        Filtrar
                    </button>
                </div>
            </div>

            <KPICards />
            <SalesFunnel />
            <RecentLeadsList />

            <FilterModal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
        </div>
    );
}
