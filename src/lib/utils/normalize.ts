/** Converte para Title Case: "são paulo" → "São Paulo" */
export function toTitleCase(str: string): string {
    if (!str) return ''
    return str.trim()
        .toLowerCase()
        .replace(/(?:^|\s|')\S/g, (char) => char.toUpperCase())
}

/** Normaliza campos de endereço do imóvel */
export function normalizePropertyAddress(endereco: Record<string, any>): Record<string, any> {
    if (!endereco) return {}
    return {
        ...endereco,
        cidade: endereco.cidade ? toTitleCase(endereco.cidade) : '',
        bairro: endereco.bairro ? toTitleCase(endereco.bairro) : '',
        estado: endereco.estado ? endereco.estado.trim().toUpperCase() : '',
        rua: endereco.rua ? endereco.rua.trim() : '',
        cep: endereco.cep ? endereco.cep.trim() : '',
    }
}
