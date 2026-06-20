export function getPropertyCode(property: { id: string; type?: string }, tenantSlug: string): string {
    const typeMap: Record<string, string> = {
        apartment: 'AP', house: 'CA', land: 'TE', commercial: 'CO', penthouse: 'CB', studio: 'ST', rural: 'RU', warehouse: 'GA', office: 'SA', store: 'LO'
    };
    const typeCode = typeMap[property.type?.toLowerCase() || ''] || 'IM';
    const tenantParts = tenantSlug.split('-').filter(p => p !== 'imoveis' && p !== 'imovel' && p !== 'adm');
    const tenantInitials = tenantParts.map(p => p[0]).join('').toUpperCase() || 'LA';
    return `${typeCode}-${tenantInitials}-${property.id.split('-')[0].substring(0, 4).toUpperCase()}`;
}

export function filterProperties(properties: any[], filters: any, tenantSlug: string) {
    const searchMode = filters.searchMode || 'standard';
    const transactionType = filters.transactionType || 'venda';

    return properties.filter(property => {
        const isLanc = property.details?.is_empreendimento === true || property.details?.situacao?.toLowerCase() === 'lançamento';
        const txt = `${property.title} ${property.description || ''}`.toLowerCase();
        const isRent = property.details?.situacao?.toLowerCase() === 'aluguel' || txt.includes('aluguel') || txt.includes('locação') || txt.includes('alugar');

        if (transactionType === 'lancamentos' && !isLanc) return false;
        if (transactionType === 'aluguel' && !isRent) return false;
        if (transactionType === 'venda' && (isLanc || isRent)) return false;

        if (searchMode === 'code') {
            if (!filters.codigo) return true;
            return getPropertyCode(property, tenantSlug).toLowerCase().replace(/[^a-z0-9]/g, '').includes(filters.codigo.toLowerCase().replace(/[^a-z0-9]/g, ''));
        }
        if (searchMode === 'project') {
            if (!filters.empreendimento) return true;
            const sel = filters.empreendimento.toLowerCase();
            return (property.title || '').toLowerCase().includes(sel) || (property.details?.empreendimento?.construtora || '').toLowerCase().includes(sel);
        }

        if (filters.search) {
            const s = filters.search.toLowerCase();
            const t = property.title.toLowerCase();
            const tp = (property.details?.tipo_property || property.details?.type || '').toLowerCase();
            const b = (property.details?.endereco?.bairro || '').toLowerCase();
            if (!t.includes(s) && !tp.includes(s) && !b.includes(s)) return false;
        }
        if (filters.tipo && !(property.details?.tipo_property || property.details?.type || '').toLowerCase().includes(filters.tipo.toLowerCase())) return false;
        if (filters.cidade && (property.details?.endereco?.cidade || '').toLowerCase().trim() !== filters.cidade.toLowerCase().trim()) return false;
        if (filters.bairro && (property.details?.endereco?.bairro || '').toLowerCase().trim() !== filters.bairro.toLowerCase().trim()) return false;
        if (filters.quartos && parseInt(property.details?.quartos || property.details?.dormitorios || '0') < parseInt(filters.quartos)) return false;
        if (filters.suites && parseInt(property.details?.suites || '0') < parseInt(filters.suites)) return false;
        if (filters.banheiros && parseInt(property.details?.banheiros || '0') < parseInt(filters.banheiros)) return false;
        if (filters.vagas && parseInt(property.details?.vagas || '0') < parseInt(filters.vagas)) return false;
        if (filters.precoMax && property.price && Number(property.price) > parseFloat(filters.precoMax)) return false;
        if (filters.areaMax) {
            const a = parseFloat(String(property.details?.area_privativa || property.details?.area_total || '0').replace(/[^\d,.-]/g, '').replace(',', '.'));
            if (!isNaN(a) && a > parseFloat(filters.areaMax)) return false;
        }
        if (filters.mobiliado && !(property.details?.mobiliado === true || property.details?.situacao_mobilia?.toLowerCase() === 'mobiliado')) return false;
        if (filters.ofertas && !property.is_featured) return false;

        return true;
    });
}

function formatName(name: string): string {
    return name.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase());
}

export function getUniqueCities(properties: any[]): string[] {
    const map = new Map<string, string>();
    properties.forEach(p => {
        const city = p.details?.endereco?.cidade;
        if (city && typeof city === 'string') map.set(city.trim().toLowerCase(), formatName(city));
    });
    return Array.from(map.values()).sort();
}

export function getUniqueNeighborhoods(properties: any[], selectedCity?: string): string[] {
    const map = new Map<string, string>();
    properties.forEach(p => {
        const city = p.details?.endereco?.cidade;
        const neighborhood = p.details?.endereco?.bairro;
        if (neighborhood && typeof neighborhood === 'string' && (!selectedCity || city?.trim().toLowerCase() === selectedCity.trim().toLowerCase())) {
            map.set(neighborhood.trim().toLowerCase(), formatName(neighborhood));
        }
    });
    return Array.from(map.values()).sort();
}

export function getUniqueProjects(properties: any[]): string[] {
    const map = new Map<string, string>();
    properties.forEach(p => {
        if (p.details?.is_empreendimento === true && p.title && typeof p.title === 'string') {
            map.set(p.title.trim().toLowerCase(), formatName(p.title));
        }
    });
    return Array.from(map.values()).sort();
}
