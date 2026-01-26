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
    const types: Record<string, string> = {
        'apartment': 'bg-blue-600 text-white',
        'house': 'bg-emerald-600 text-white',
        'land': 'bg-amber-600 text-white',
        'commercial': 'bg-indigo-600 text-white',
        'penthouse': 'bg-purple-600 text-white',
        'studio': 'bg-pink-600 text-white',
        'rural': 'bg-green-600 text-white',
        'warehouse': 'bg-slate-600 text-white',
        'office': 'bg-cyan-600 text-white',
        'store': 'bg-rose-600 text-white'
    }
    return types[type?.toLowerCase()] || 'bg-primary text-primary-foreground'
}

export function getStatusStyles(status: string): string {
    switch (status) {
        case 'Disponível':
            return 'bg-green-100 text-green-700';
        case 'Pendente':
            return 'bg-yellow-400 text-yellow-900';
        case 'Vendido':
        case 'Reservado':
        case 'Suspenso':
            return 'bg-yellow-100 text-yellow-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
}

export function getSituacaoStyles(situacao: string): string {
    switch (situacao?.toLowerCase()) {
        case 'lançamento':
            return 'bg-purple-100 text-purple-700';
        case 'em construção':
            return 'bg-orange-100 text-orange-700';
        case 'novo':
            return 'bg-blue-100 text-blue-700';
        case 'revenda':
            return 'bg-slate-100 text-slate-700';
        default:
            return 'bg-muted text-muted-foreground';
    }
}
