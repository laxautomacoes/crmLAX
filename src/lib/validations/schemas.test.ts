import { describe, it, expect } from 'vitest'
import {
    createLeadSchema,
    updateLeadSchema,
    createAssetSchema,
    updateProfileSchema,
    createInvitationSchema,
    createStageSchema,
    validateInput
} from '@/lib/validations/schemas'

describe('createLeadSchema', () => {
    it('aceita um lead válido com campos obrigatórios', () => {
        const result = createLeadSchema.safeParse({
            name: 'João Silva',
            phone: '48999999999'
        })
        expect(result.success).toBe(true)
    })

    it('rejeita lead sem nome', () => {
        const result = createLeadSchema.safeParse({
            phone: '48999999999'
        })
        expect(result.success).toBe(false)
    })

    it('rejeita lead sem telefone', () => {
        const result = createLeadSchema.safeParse({
            name: 'João Silva'
        })
        expect(result.success).toBe(false)
    })

    it('rejeita telefone muito curto', () => {
        const result = createLeadSchema.safeParse({
            name: 'João',
            phone: '123'
        })
        expect(result.success).toBe(false)
    })

    it('aceita lead completo com todos os campos', () => {
        const result = createLeadSchema.safeParse({
            name: 'Maria Santos',
            phone: '48988887777',
            email: 'maria@email.com',
            tags: ['vip', 'retorno'],
            cpf: '123.456.789-00',
            address_city: 'Florianópolis',
            address_state: 'SC',
            stage_id: '550e8400-e29b-41d4-a716-446655440000',
            value: 350000,
            lead_source: 'Facebook',
            campaign: 'Campanha Verão 2026'
        })
        expect(result.success).toBe(true)
    })

    it('rejeita email inválido', () => {
        const result = createLeadSchema.safeParse({
            name: 'João',
            phone: '48999999999',
            email: 'nao-e-email'
        })
        expect(result.success).toBe(false)
    })

    it('rejeita UUID inválido no stage_id', () => {
        const result = createLeadSchema.safeParse({
            name: 'João',
            phone: '48999999999',
            stage_id: 'nao-e-uuid'
        })
        expect(result.success).toBe(false)
    })

    it('rejeita valor negativo', () => {
        const result = createLeadSchema.safeParse({
            name: 'João',
            phone: '48999999999',
            value: -100
        })
        expect(result.success).toBe(false)
    })

    it('aplica defaults para tags e lead_source', () => {
        const result = createLeadSchema.safeParse({
            name: 'João',
            phone: '48999999999'
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.tags).toEqual([])
            expect(result.data.lead_source).toBe('Direto')
        }
    })
})

describe('updateLeadSchema', () => {
    it('aceita atualização parcial (apenas nome)', () => {
        const result = updateLeadSchema.safeParse({ name: 'Novo Nome' })
        expect(result.success).toBe(true)
    })

    it('aceita objeto vazio (sem alterações)', () => {
        const result = updateLeadSchema.safeParse({})
        expect(result.success).toBe(true)
    })
})

describe('createAssetSchema', () => {
    it('aceita imóvel com campos obrigatórios', () => {
        const result = createAssetSchema.safeParse({
            title: 'Apartamento 3 quartos',
            type: 'apartment'
        })
        expect(result.success).toBe(true)
    })

    it('rejeita imóvel sem título', () => {
        const result = createAssetSchema.safeParse({ type: 'house' })
        expect(result.success).toBe(false)
    })

    it('aplica default de status e is_published', () => {
        const result = createAssetSchema.safeParse({
            title: 'Casa',
            type: 'house'
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.status).toBe('Disponível')
            expect(result.data.is_published).toBe(false)
        }
    })
})

describe('updateProfileSchema', () => {
    it('aceita perfil válido', () => {
        const result = updateProfileSchema.safeParse({
            full_name: 'Carlos Admin'
        })
        expect(result.success).toBe(true)
    })

    it('rejeita nome vazio', () => {
        const result = updateProfileSchema.safeParse({ full_name: '' })
        expect(result.success).toBe(false)
    })
})

describe('createInvitationSchema', () => {
    it('aceita convite com email válido', () => {
        const result = createInvitationSchema.safeParse({
            email: 'novo@imobiliaria.com'
        })
        expect(result.success).toBe(true)
    })

    it('rejeita role inválido', () => {
        const result = createInvitationSchema.safeParse({
            email: 'test@test.com',
            role: 'superadmin'
        })
        expect(result.success).toBe(false)
    })

    it('default role é user', () => {
        const result = createInvitationSchema.safeParse({
            email: 'test@test.com'
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.role).toBe('user')
        }
    })
})

describe('createStageSchema', () => {
    it('aceita estágio válido', () => {
        const result = createStageSchema.safeParse({
            name: 'Novo',
            order_index: 0
        })
        expect(result.success).toBe(true)
    })

    it('aplica cor default', () => {
        const result = createStageSchema.safeParse({
            name: 'Novo',
            order_index: 0
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.color).toBe('#6b7280')
        }
    })
})

describe('validateInput helper', () => {
    it('retorna data quando válido', () => {
        const result = validateInput(createStageSchema, { name: 'Test', order_index: 1 })
        expect(result.error).toBeNull()
        expect(result.data).toBeDefined()
        expect(result.data?.name).toBe('Test')
    })

    it('retorna error string quando inválido', () => {
        const result = validateInput(createStageSchema, { order_index: 'nao-e-numero' })
        expect(result.data).toBeNull()
        expect(result.error).toContain('Dados inválidos')
    })

    it('sanitiza campos extras (strip unknown)', () => {
        const result = validateInput(createStageSchema, {
            name: 'Test',
            order_index: 1,
            __proto__: null,
            hackField: 'DROP TABLE users'
        })
        expect(result.error).toBeNull()
        if (result.data) {
            expect((result.data as any).hackField).toBeUndefined()
        }
    })
})
