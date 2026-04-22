export interface TenantInfo {
    id: string;
    slug: string;
    name: string;
    is_system?: boolean;
    status?: string | null;
    custom_domain?: string | null;
    custom_domain_verified?: boolean | null;
    custom_domain_crm_verified?: boolean | null;
    branding?: Record<string, any> | null;
    plan_type?: string | null;
}
