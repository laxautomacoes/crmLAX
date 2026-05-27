/**
 * Abacate Pay — API Client
 * Base URL: https://api.abacatepay.com/v2
 * Auth: Bearer Token
 * Valores em centavos (9700 = R$ 97,00)
 */

const BASE_URL = 'https://api.abacatepay.com/v2'

function getApiKey(): string {
    const key = process.env.ABACATEPAY_API_KEY
    if (!key) throw new Error('ABACATEPAY_API_KEY não configurada')
    return key
}

function headers() {
    return {
        'Authorization': `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
    }
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${BASE_URL}${path}`
    const options: RequestInit = {
        method,
        headers: headers(),
    }
    if (body) options.body = JSON.stringify(body)

    const response = await fetch(url, options)
    const data = await response.json()

    if (!response.ok || data.error) {
        console.error(`[AbacatePay] ${method} ${path} Error:`, data)
        throw new Error(data.error || `AbacatePay API Error: ${response.status}`)
    }

    return data
}

// ─── Tipos ───────────────────────────────────────────────

export interface AbacateProduct {
    id: string
    externalId: string
    name: string
    price: number
    currency: string
    cycle?: 'WEEKLY' | 'MONTHLY' | 'SEMIANNUALLY' | 'ANNUALLY'
    description?: string
}

export interface AbacateCustomer {
    id: string
    email: string
    name?: string
    taxId?: string
    cellphone?: string
}

export interface AbacateSubscription {
    id: string
    url: string
    status: string
    customer?: AbacateCustomer
}

export interface AbacateCheckout {
    id: string
    url: string
    status: string
}

export interface AbacateResponse<T> {
    data: T
    success: boolean
    error: string | null
}

// ─── Produtos ────────────────────────────────────────────

export async function createProduct(data: {
    externalId: string
    name: string
    price: number // centavos
    description?: string
    imageUrl?: string
    cycle?: 'WEEKLY' | 'MONTHLY' | 'SEMIANNUALLY' | 'ANNUALLY'
}): Promise<AbacateResponse<AbacateProduct>> {
    return request('POST', '/products/create', {
        ...data,
        currency: 'BRL',
    })
}

export async function listProducts(): Promise<AbacateResponse<AbacateProduct[]>> {
    return request('GET', '/products/list')
}

// ─── Clientes ────────────────────────────────────────────

export async function createCustomer(data: {
    email: string
    name?: string
    taxId?: string
    cellphone?: string
}): Promise<AbacateResponse<AbacateCustomer>> {
    return request('POST', '/customers/create', data)
}

export async function listCustomers(): Promise<AbacateResponse<AbacateCustomer[]>> {
    return request('GET', '/customers/list')
}

// ─── Assinaturas ─────────────────────────────────────────

export async function createSubscriptionCheckout(data: {
    items: { id: string; quantity: number }[]
    customerId?: string
    returnUrl?: string
    completionUrl?: string
    metadata?: Record<string, string>
}): Promise<AbacateResponse<AbacateSubscription>> {
    return request('POST', '/subscriptions/create', data)
}

export async function listSubscriptions(): Promise<AbacateResponse<AbacateSubscription[]>> {
    return request('GET', '/subscriptions/list')
}

export async function cancelSubscription(subscriptionId: string): Promise<AbacateResponse<any>> {
    return request('POST', '/subscriptions/cancel', { id: subscriptionId })
}

// ─── Checkout Avulso ─────────────────────────────────────

export async function createCheckout(data: {
    items: { id: string; quantity: number }[]
    methods?: ('PIX' | 'CARD')[]
    customerId?: string
    returnUrl?: string
    completionUrl?: string
    metadata?: Record<string, string>
}): Promise<AbacateResponse<AbacateCheckout>> {
    return request('POST', '/checkouts/create', data)
}

// ─── Export default ──────────────────────────────────────

export const abacatePayService = {
    createProduct,
    listProducts,
    createCustomer,
    listCustomers,
    createSubscriptionCheckout,
    listSubscriptions,
    cancelSubscription,
    createCheckout,
}
