import { getProfile } from '@/app/_actions/profile'
import { getPropertyBySlug } from '@/app/_actions/properties'
import { checkPlanFeatureAction } from '@/app/_actions/plan'
import { PropertyDetailsContent } from '@/components/dashboard/properties/PropertyDetailsContent'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PropertyPageProps {
    params: Promise<{
        type: string
        slug: string
    }>
}

export default async function PropertyDetailPage({ params }: PropertyPageProps) {
    const { type, slug } = await params
    const { profile, error: profileError } = await getProfile()

    if (profileError || !profile || !profile.tenant_id) {
        redirect('/login')
    }

    const [propertyResult, aiAccess, marketingAccess] = await Promise.all([
        getPropertyBySlug(type, slug, true),
        checkPlanFeatureAction(profile.tenant_id, 'ai'),
        checkPlanFeatureAction(profile.tenant_id, 'marketing'),
    ])

    if (!propertyResult.success || !propertyResult.data) {
        notFound()
    }

    const prop = propertyResult.data

    const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'
    const isOwner = profile.id && prop.created_by === profile.id
    const canEdit = isAdmin || isOwner

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link 
                    href="/properties"
                    className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground transition-all border border-border/50"
                >
                    <ChevronLeft size={20} />
                </Link>
                <div className="space-y-0.5 flex-1">
                    <h1 className="text-xl font-black tracking-tight">Detalhes do Imóvel</h1>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Dashboard / Imóveis / Visualizar</p>
                </div>
                {canEdit && (
                    <Link
                        href={`/properties?edit=${prop.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 shadow-sm transition-all active:scale-[0.98]"
                    >
                        <Pencil size={16} />
                        Editar Imóvel
                    </Link>
                )}
            </div>

            <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden p-6 md:p-8">
                <PropertyDetailsContent 
                    prop={prop}
                    userRole={profile.role || 'user'}
                    hasAIAccess={aiAccess}
                    hasMarketingAccess={marketingAccess}
                    tenantId={profile.tenant_id}
                    isModal={false}
                />
            </div>
        </div>
    )
}
