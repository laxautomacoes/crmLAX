'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProfileData {
    id: string
    email: string
    full_name: string
    role: string
    avatar_url: string | null
    tenant_id?: string
    whatsapp_number?: string
    is_active_for_service?: boolean
}

interface TenantData {
    name: string
    slug: string
    branding: {
        logo_full?: string
        logo_header?: string
        logo_icon?: string
        logo_height?: number
        logo_header_height?: number
    } | null
    custom_domain?: string
    custom_domain_verified?: boolean
}

interface ProfileContextType {
    profile: ProfileData | null
    tenant: TenantData | null
    loading: boolean
    refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType>({
    profile: null,
    tenant: null,
    loading: true,
    refreshProfile: async () => {},
})

export function useProfile() {
    return useContext(ProfileContext)
}

export function ProfileProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [tenant, setTenant] = useState<TenantData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setLoading(false)
                return
            }

            // Buscar perfil e tenant em uma única query com JOIN
            const { data: profileData } = await supabase
                .from('profiles')
                .select(`
                    id, full_name, role, avatar_url, tenant_id, whatsapp_number, is_active_for_service,
                    tenants (
                        name, slug, branding, custom_domain, custom_domain_verified
                    )
                `)
                .eq('id', user.id)
                .maybeSingle()

            if (profileData) {
                setProfile({
                    id: user.id,
                    email: user.email || '',
                    full_name: profileData.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
                    role: profileData.role || 'user',
                    avatar_url: profileData.avatar_url,
                    tenant_id: profileData.tenant_id,
                    whatsapp_number: profileData.whatsapp_number,
                    is_active_for_service: profileData.is_active_for_service,
                })

                const tenantData = profileData.tenants as any
                if (tenantData) {
                    setTenant({
                        name: tenantData.name || '',
                        slug: tenantData.slug || '',
                        branding: tenantData.branding || null,
                        custom_domain: tenantData.custom_domain,
                        custom_domain_verified: tenantData.custom_domain_verified,
                    })
                }
            }
        } catch (err) {
            console.error('[ProfileProvider] Erro ao carregar dados:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()

        // Escutar eventos de atualização de branding e perfil
        const handleBrandingUpdate = (event: any) => {
            if (event.detail) {
                setTenant(prev => prev ? { ...prev, branding: event.detail } : null)
            }
        }

        const handleProfileUpdate = (event: any) => {
            if (event.detail) {
                setProfile(prev => prev ? { ...prev, ...event.detail } : null)
            }
        }

        window.addEventListener('branding-updated', handleBrandingUpdate)
        window.addEventListener('profile-updated', handleProfileUpdate)

        return () => {
            window.removeEventListener('branding-updated', handleBrandingUpdate)
            window.removeEventListener('profile-updated', handleProfileUpdate)
        }
    }, [fetchData])

    return (
        <ProfileContext.Provider value={{ profile, tenant, loading, refreshProfile: fetchData }}>
            {children}
        </ProfileContext.Provider>
    )
}
