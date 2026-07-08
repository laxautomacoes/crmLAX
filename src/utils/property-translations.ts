export const propertyTypes: Record<string, string> = {
    'apartment': 'Apartamento',
    'apartment_garden': 'Apartamento garden',
    'duplex': 'Duplex',
    'triplex': 'Triplex',
    'house': 'Casa',
    'land': 'Terreno',
    'commercial': 'Comercial',
    'penthouse': 'Cobertura',
    'studio': 'Studio',
    'rural': 'Rural',
    'warehouse': 'Galpão',
    'office': 'Sala/Escritório',
    'store': 'Loja'
};

/** Array de options pronto para usar em FormSelect */
export const propertyTypeOptions = Object.entries(propertyTypes).map(
    ([value, label]) => ({ value, label })
)

export function translatePropertyType(type: string): string {
    if (!type) return 'Imóvel';
    const normalizedType = type.toLowerCase();
    return propertyTypes[normalizedType] || type;
}

export function getPropertyTypeStyles(type: string): string {
    const normalizedType = type?.toLowerCase();
    switch (normalizedType) {
        case 'apartment': 
        case 'apartment_garden': 
        case 'duplex': 
        case 'triplex': return 'bg-blue-500/10 text-blue-600';
        case 'house': return 'bg-emerald-500/10 text-emerald-600';
        case 'land': return 'bg-slate-500/10 text-slate-600';
        case 'commercial': return 'bg-purple-500/10 text-purple-600';
        default: return 'bg-foreground/10 text-foreground';
    }
}

export function getStatusStyles(status: string): string {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
        case 'available':
        case 'disponível':
        case 'disponivel':
        case 'ativo': return 'bg-emerald-500/10 text-emerald-600';
        case 'em proposta': return 'bg-amber-500/10 text-amber-600';
        case 'pending':
        case 'pendente': return 'bg-secondary text-secondary-foreground';
        case 'inativo': return 'bg-red-500/10 text-red-600';
        default: return 'bg-foreground/10 text-foreground';
    }
}

export function translateStatus(status: string): string {
    if (!status) return '';
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
        case 'available': return 'Disponível';
        case 'pending': return 'Pendente';
        case 'em proposta': return 'Em Proposta';
        default: return status;
    }
}

export function getSituacaoStyles(situacao: string): string {
    const normalizedSituacao = situacao?.toLowerCase();
    switch (normalizedSituacao) {
        case 'lançamento':
        case 'lancamento': return 'bg-emerald-500/10 text-emerald-600';
        case 'pronto': return 'bg-blue-500/10 text-blue-600';
        case 'em obras': return 'bg-orange-500/10 text-orange-600';
        case 'na planta': return 'bg-purple-500/10 text-purple-600';
        case 'revenda': return 'bg-orange-500/10 text-orange-600';
        default: return 'bg-foreground/10 text-foreground';
    }
}
