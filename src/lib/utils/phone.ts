/**
 * Formata um número de telefone de acordo com as regras:
 * - Se o número (após o DDD) inicia com 9, é celular (11 dígitos: 2 DDD + 9 número) -> (48) 99999 9999
 * - Caso contrário, é fixo (10 dígitos: 2 DDD + 8 número) -> (48) 3333 3333
 */
export function formatPhone(value: string | null | undefined): string {
    if (!value) return '';

    // Remove todos os caracteres não numéricos
    const digits = value.replace(/\D/g, '');

    if (digits.length <= 2) {
        return digits;
    }

    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);

    // Se o primeiro dígito do número (após DDD) for 9, tratamos como celular
    if (rest.startsWith('9')) {
        // Celular: (48) 99999 9999
        if (rest.length <= 5) {
            return `(${ddd}) ${rest}`;
        }
        return `(${ddd}) ${rest.slice(0, 5)} ${rest.slice(5, 9)}`;
    } else {
        // Fixo: (48) 3333 3333
        if (rest.length <= 4) {
            return `(${ddd}) ${rest}`;
        }
        return `(${ddd}) ${rest.slice(0, 4)} ${rest.slice(4, 8)}`;
    }
}

/**
 * Limpa a formatação para salvar apenas os dígitos no banco de dados
 */
export function cleanPhone(value: string): string {
    return value.replace(/\D/g, '');
}
