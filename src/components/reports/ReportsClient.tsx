'use client';

import { useState, useTransition } from 'react';
import { CalendarDays, Filter, User, Home } from 'lucide-react';
import { getReportMetrics, type ReportMetrics } from '@/app/_actions/reports';
import ReportsKPICards from './ReportsKPICards';
import LeadsBySourceChart from './LeadsBySourceChart';
import LeadsEvolutionChart from './LeadsEvolutionChart';
import TeamPerformanceTable from './TeamPerformanceTable';
import TopPropertiesTable from './TopPropertiesTable';
import AIInsightsCard from '@/components/ai/AIInsightsCard';

interface ReportsClientProps {
    initialMetrics: ReportMetrics;
    tenantId: string;
    brokers: Array<{ id: string; full_name: string }>;
    properties: Array<{ id: string; title: string }>;
    userProfile: any;
    hasAIAccess: boolean;
}

const PERIODS = [
    { label: 'Últimos 7 dias', value: '7_days' },
    { label: 'Últimos 30 dias', value: '30_days' },
    { label: 'Últimos 90 dias', value: '90_days' },
    { label: 'Últimos 12 meses', value: '12_months' },
];

export default function ReportsClient({ initialMetrics, tenantId, brokers, properties, userProfile, hasAIAccess }: ReportsClientProps) {
    // Determinar se o usuário tem acesso restrito (papel 'user')
    const userRole = userProfile?.role?.toLowerCase() || ''
    const isAdmin = ['admin', 'superadmin', 'super_admin', 'super administrador'].includes(userRole)

    const [metrics, setMetrics] = useState<ReportMetrics>(initialMetrics);
    const [period, setPeriod] = useState('30_days');
    // Se não for admin, o brokerId começa já filtrado pelo ID do usuário
    const [brokerId, setBrokerId] = useState(!isAdmin ? userProfile.id : 'all');
    const [propertyId, setPropertyId] = useState('all');
    const [isPending, startTransition] = useTransition();

    const updateMetrics = (newPeriod: string, newBrokerId: string, newPropertyId: string) => {
        startTransition(async () => {
            const result = await getReportMetrics(tenantId, newPeriod, newBrokerId, newPropertyId);
            if (result.success && result.data) {
                setMetrics(result.data);
            }
        });
    };

    const handlePeriodChange = (newPeriod: string) => {
        setPeriod(newPeriod);
        updateMetrics(newPeriod, brokerId, propertyId);
    };

    const handleBrokerChange = (newBrokerId: string) => {
        setBrokerId(newBrokerId);
        updateMetrics(period, newBrokerId, propertyId);
    };

    const handlePropertyChange = (newPropertyId: string) => {
        setPropertyId(newPropertyId);
        updateMetrics(period, brokerId, newPropertyId);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Relatórios Gerenciais</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Acompanhe o desempenho do seu negócio e da sua equipe.
                    </p>
                </div>
                <div className="h-px bg-foreground/25 w-full md:hidden mt-2 mb-6" />

                <div className="flex flex-wrap items-center gap-3">
                    {/* Broker Filter - Only visible for admins */}
                    {isAdmin && (
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <select
                                value={brokerId}
                                onChange={(e) => handleBrokerChange(e.target.value)}
                                disabled={isPending}
                                className="pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none appearance-none cursor-pointer hover:bg-muted/50 transition-colors disabled:opacity-50 min-w-[160px] max-w-[200px]"
                            >
                                <option value="all">Todos Corretores</option>
                                {brokers.map((broker) => (
                                    <option key={broker.id} value={broker.id}>
                                        {broker.full_name}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>
                    )}

                    {/* Property Filter */}
                    <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <select
                            value={propertyId}
                            onChange={(e) => handlePropertyChange(e.target.value)}
                            disabled={isPending}
                            className="pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none appearance-none cursor-pointer hover:bg-muted/50 transition-colors disabled:opacity-50 min-w-[160px] max-w-[220px]"
                        >
                            <option value="all">Todos Imóveis</option>
                            {properties.map((property) => (
                                <option key={property.id} value={property.id}>
                                    {property.title.length > 25 ? property.title.substring(0, 25) + '...' : property.title}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                        </div>
                    </div>

                    {/* Period Filter */}
                    <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <select
                            value={period}
                            onChange={(e) => handlePeriodChange(e.target.value)}
                            disabled={isPending}
                            className="pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none appearance-none cursor-pointer hover:bg-muted/50 transition-colors disabled:opacity-50 min-w-[160px]"
                        >
                            {PERIODS.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* IA Insights */}
            <AIInsightsCard 
                tenantId={tenantId} 
                profileId={userProfile.id}
                period={period}
                hasAIAccess={hasAIAccess} 
            />

            {/* KPIs */}
            <div className={isPending ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                <ReportsKPICards metrics={metrics.kpis} />
            </div>

            {/* Charts Grid */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isPending ? 'opacity-50 transition-opacity' : 'transition-opacity'}`}>
                <div className="lg:col-span-2">
                    <LeadsEvolutionChart data={metrics.leadsEvolution} />
                </div>
                <div>
                    <LeadsBySourceChart data={metrics.leadsBySource} />
                </div>
            </div>

            {/* Tables Grid */}
            <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6 ${isPending ? 'opacity-50 transition-opacity' : 'transition-opacity'}`}>
                {isAdmin && <TeamPerformanceTable data={metrics.teamPerformance} />}
                <TopPropertiesTable data={metrics.topProperties} />
            </div>
        </div>
    );
}
