export interface TenantInfo {
    id: string;
    slug: string;
    name: string;
    custom_domain?: string | null;
    custom_domain_verified?: boolean | null;
    branding?: Record<string, any> | null;
    plan_type?: string | null;
}
