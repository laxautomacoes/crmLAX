'use client'

import { useState } from 'react'
import { Building2, Globe, Users, ChevronRight, Search, Plus } from 'lucide-react'
import Link from 'next/link'

interface Tenant {
    id: string
    name: string
    slug: string
    plan_type: string
    custom_domain: string | null
    created_at: string
    profiles: { count: number }[]
}

export default function TenantsList({ initialTenants }: { initialTenants: Tenant[] }) {
    const [search, setSearch] = useState('')
    
    const filteredTenants = initialTenants.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) || 
        t.slug.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                        type="text"
                        placeholder="Buscar por nome ou slug..."
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
                    <Plus className="w-4 h-4" />
                    Nova Empresa
                </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Empresa</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Status/Plano</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Domínio</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Usuários</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {tenant.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">{tenant.name}</div>
                                                <div className="text-xs text-muted-foreground">/{tenant.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                tenant.plan_type === 'pro' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                tenant.plan_type === 'starter' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                                            }`}>
                                                {tenant.plan_type || 'freemium'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">Desde: {new Date(tenant.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Globe className="w-3 h-3" />
                                            {tenant.custom_domain || `${tenant.slug}.laxperience.online`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Users className="w-3 h-3" />
                                            {tenant.profiles?.[0]?.count || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link 
                                            href={`/superadmin/tenants/${tenant.id}`}
                                            className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
