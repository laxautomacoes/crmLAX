import { getAllTenants } from '@/app/_actions/tenant'
import { PageHeader } from '@/components/shared/PageHeader'
import TenantsList from '@/components/superadmin/TenantsList'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
    const result = await getAllTenants()
    
    const tenants = result.success ? (result.data as any) : []

    return (
        <div className="space-y-8">
            <PageHeader 
                title="Gestão de Clientes (Tenants)" 
                subtitle="Administre todas as imobiliárias e empresas que utilizam a plataforma"
            />

            <TenantsList initialTenants={tenants} />
        </div>
    )
}
