/**
 * Utilitários para classificação de temperatura do lead
 * baseado no tempo desde a última interação.
 */

export type LeadTemperature = 'hot' | 'warm' | 'cold' | 'inactive'

const THRESHOLDS = {
    hot: 7,      // até 7 dias
    warm: 15,    // até 15 dias
    cold: 30,    // até 30 dias
} as const

/**
 * Calcula quantos dias se passaram desde a última interação
 */
export function getDaysSinceInteraction(lastInteractionAt: string | null | undefined): number | null {
    if (!lastInteractionAt) return null
    const now = new Date()
    const lastDate = new Date(lastInteractionAt)
    const diffMs = now.getTime() - lastDate.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Retorna a classificação de temperatura do lead
 */
export function getLeadTemperature(lastInteractionAt: string | null | undefined): LeadTemperature {
    const days = getDaysSinceInteraction(lastInteractionAt)
    if (days === null) return 'inactive'
    if (days <= THRESHOLDS.hot) return 'hot'
    if (days <= THRESHOLDS.warm) return 'warm'
    if (days <= THRESHOLDS.cold) return 'cold'
    return 'inactive'
}

/**
 * Retorna a cor hex da bolinha
 */
export function getTemperatureColor(temp: LeadTemperature): string {
    switch (temp) {
        case 'hot': return '#22C55E'
        case 'warm': return '#FACC15'
        case 'cold': return '#EF4444'
        case 'inactive': return '#6B7280'
    }
}

/**
 * Retorna o label em PT-BR
 */
export function getTemperatureLabel(temp: LeadTemperature): string {
    switch (temp) {
        case 'hot': return 'Quente'
        case 'warm': return 'Morno'
        case 'cold': return 'Frio'
        case 'inactive': return 'Inativo'
    }
}

/**
 * Retorna a descrição completa para tooltip
 */
export function getTemperatureDescription(temp: LeadTemperature, days: number | null): string {
    if (days === null) return 'Sem interação registrada'

    const plural = days === 1 ? 'dia' : 'dias'
    const timeText = days === 0 ? 'hoje' : `há ${days} ${plural}`

    switch (temp) {
        case 'hot':
            return `Lead Quente — Última interação ${timeText}`
        case 'warm':
            return `Lead Morno — Última interação ${timeText}`
        case 'cold':
            return `Lead Frio — Última interação ${timeText}`
        case 'inactive':
            return `Lead Inativo — Última interação ${timeText}`
    }
}

/**
 * Retorna o emoji da temperatura
 */
export function getTemperatureEmoji(temp: LeadTemperature): string {
    switch (temp) {
        case 'hot': return '🟢'
        case 'warm': return '🟡'
        case 'cold': return '🔴'
        case 'inactive': return '⚪'
    }
}
