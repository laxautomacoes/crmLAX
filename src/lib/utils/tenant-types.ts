export interface TenantInfo {
    id: string;
    slug: string;
    name: string;
    custom_domain?: string | null;
    branding?: Record<string, any> | null;
}
