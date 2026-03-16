/**
 * Normaliza um número de telefone para o formato internacional aceito pelo WhatsApp (DDI 55 + DDD + Número)
 * Formato esperado: 55DDXXXXXXXXX
 */
export function normalizeWhatsAppNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');

    // Se começar com 0, remove o 0 inicial
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.slice(1);
    }

    // Se já tiver o DDI 55 no início e tiver 12 ou 13 dígitos, assume que está correto
    if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
        return cleaned;
    }

    // Se tiver 10 ou 11 dígitos, adiciona o DDI 55
    if (cleaned.length === 10 || cleaned.length === 11) {
        return `55${cleaned}`;
    }

    // Se tiver 8 ou 9 dígitos (sem DDD), não temos como saber o DDD, então retornamos como está 
    // (o ideal é que o sistema sempre capture o DDD)
    
    return cleaned;
}

/**
 * Valida se o número normalizado parece um número de WhatsApp válido (Brasil)
 */
export function isValidWhatsAppNumber(normalizedPhone: string): boolean {
    // Mínimo: 55 + DDD (2) + Número Fixo (8) = 12 dígitos
    // Máximo: 55 + DDD (2) + Número Celular (9) = 13 dígitos
    return normalizedPhone.startsWith('55') && (normalizedPhone.length === 12 || normalizedPhone.length === 13);
}
