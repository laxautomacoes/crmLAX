export const propertyTypes: Record<string, string> = {
    'apartment': 'Apartamento',
    'house': 'Casa',
    'land': 'Terreno',
    'commercial': 'Comercial',
    'penthouse': 'Cobertura',
    'studio': 'Studio',
    'rural': 'Rural',
    'warehouse': 'Galpão',
    'office': 'Escritório',
    'store': 'Loja'
};

export function translatePropertyType(type: string): string {
    if (!type) return 'Imóvel';
    const normalizedType = type.toLowerCase();
    return propertyTypes[normalizedType] || type;
}

export function getPropertyTypeStyles(type: string): string {
    const normalizedType = type?.toLowerCase();
    switch (normalizedType) {
        case 'apartment': return 'bg-blue-500/10 text-blue-600';
        case 'house': return 'bg-emerald-500/10 text-emerald-600';
        case 'land': return 'bg-slate-500/10 text-slate-600';
        case 'commercial': return 'bg-purple-500/10 text-purple-600';
        default: return 'bg-foreground/10 text-foreground';
    }
}

export function getStatusStyles(status: string): string {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
        case 'ativo': return 'bg-emerald-500/10 text-emerald-600';
        case 'pendente': return 'bg-yellow-400/20 text-yellow-700';
        case 'inativo': return 'bg-red-500/10 text-red-600';
        default: return 'bg-foreground/10 text-foreground';
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
        default: return 'bg-foreground/10 text-foreground';
    }
}
