import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock env antes de importar
beforeEach(() => {
    vi.unstubAllEnvs()
})

// Importação dinâmica para permitir stubs de env
const loadModule = async () => {
    return await import('@/lib/api/auth-guards')
}

function createMockRequest(headers: Record<string, string> = {}, ip?: string): NextRequest {
    const req = new NextRequest('http://localhost/api/test', {
        headers: new Headers(headers),
    })
    return req
}

describe('verifyWebhookApiKey', () => {
    it('retorna null quando WEBHOOK_API_KEY não está configurada em dev', async () => {
        vi.stubEnv('WEBHOOK_API_KEY', '')
        vi.stubEnv('NODE_ENV', 'development')
        const { verifyWebhookApiKey } = await loadModule()
        const req = createMockRequest({})
        expect(verifyWebhookApiKey(req)).toBeNull()
    })

    it('retorna 401 quando API key está errada', async () => {
        vi.stubEnv('WEBHOOK_API_KEY', 'minha-chave-secreta')
        const { verifyWebhookApiKey } = await loadModule()
        const req = createMockRequest({ 'x-api-key': 'chave-errada' })
        const result = verifyWebhookApiKey(req)
        expect(result).not.toBeNull()
        expect(result?.status).toBe(401)
    })

    it('retorna null quando API key está correta', async () => {
        vi.stubEnv('WEBHOOK_API_KEY', 'minha-chave-secreta')
        const { verifyWebhookApiKey } = await loadModule()
        const req = createMockRequest({ 'x-api-key': 'minha-chave-secreta' })
        expect(verifyWebhookApiKey(req)).toBeNull()
    })
})

describe('verifyCronSecret', () => {
    it('retorna null quando CRON_SECRET não está configurado em dev', async () => {
        vi.stubEnv('CRON_SECRET', '')
        vi.stubEnv('NODE_ENV', 'development')
        const { verifyCronSecret } = await loadModule()
        const req = createMockRequest({})
        expect(verifyCronSecret(req)).toBeNull()
    })

    it('retorna 401 com bearer errado', async () => {
        vi.stubEnv('CRON_SECRET', 'secret123')
        const { verifyCronSecret } = await loadModule()
        const req = createMockRequest({ authorization: 'Bearer errado' })
        const result = verifyCronSecret(req)
        expect(result).not.toBeNull()
        expect(result?.status).toBe(401)
    })

    it('retorna null com bearer correto', async () => {
        vi.stubEnv('CRON_SECRET', 'secret123')
        const { verifyCronSecret } = await loadModule()
        const req = createMockRequest({ authorization: 'Bearer secret123' })
        expect(verifyCronSecret(req)).toBeNull()
    })
})

describe('checkRateLimit', () => {
    it('permite requests dentro do limite', async () => {
        const { checkRateLimit } = await loadModule()
        const result = checkRateLimit('test-ip-unique-1', 5, 60_000)
        expect(result).toBeNull()
    })

    it('bloqueia após exceder o limite', async () => {
        const { checkRateLimit } = await loadModule()
        const id = 'test-ip-flood-' + Date.now()

        for (let i = 0; i < 3; i++) {
            checkRateLimit(id, 3, 60_000)
        }

        const result = checkRateLimit(id, 3, 60_000)
        expect(result).not.toBeNull()
        expect(result?.status).toBe(429)
    })
})

describe('getRequestIp', () => {
    it('extrai IP do x-forwarded-for', async () => {
        const { getRequestIp } = await loadModule()
        const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' })
        expect(getRequestIp(req)).toBe('192.168.1.1')
    })

    it('retorna unknown quando não há headers de IP', async () => {
        const { getRequestIp } = await loadModule()
        const req = createMockRequest({})
        expect(getRequestIp(req)).toBe('unknown')
    })
})
