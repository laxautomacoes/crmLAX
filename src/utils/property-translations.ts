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
