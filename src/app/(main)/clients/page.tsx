import ClientList from '@/components/dashboard/ClientList'
import { getClients } from '@/app/_actions/clients'
import { getProfile } from '@/app/_actions/profile'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
    // Fetch server-side
    const { profile, error: profileError } = await getProfile()

    if (profileError || !profile || !profile.tenant_id) {
        return (
            <div className="p-8 text-center text-red-500">
                Erro ao carregar perfil. Por favor, faça login novamente.
            </div>
        )
    }

    const tenantId = profile.tenant_id
    const profileId = profile.id

    const { data: clients, success } = await getClients(tenantId)

    // Se falhar ou estiver vazio, passa array vazio para não quebrar a UI
    const initialClients = success && clients ? clients : []

    return (
        <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ClientList
                initialClients={initialClients}
                tenantId={tenantId}
                profileId={profileId}
            />
        </div>
    )
}
