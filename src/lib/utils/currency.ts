/**
 * Utilitários de formatação de moeda BRL
 * Padrão do sistema: pontos para milhares, vírgula para decimais (1.000.000,00)
 */

/**
 * Formata um valor digitado para o padrão BRL (1.000.000,00) sem R$
 * Aceita qualquer input e extrai apenas dígitos, tratando como centavos.
 */
export function formatCurrencyBRL(value: string): string {
    const digits = value.replace(/\D/g, '')
    if (!digits) return ''
    const num = parseInt(digits, 10)
    return (num / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

/**
 * Converte de formato BRL (1.000.000,00) para float
 */
export function parseCurrencyBRL(value: string): number {
    if (!value) return 0
    const cleaned = value.replace(/\./g, '').replace(',', '.')
    return parseFloat(cleaned) || 0
}
