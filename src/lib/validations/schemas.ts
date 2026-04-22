/**
 * Zod validation schemas para todas as entidades do CRM LAX.
 * Estes schemas devem ser usados em TODAS as Server Actions para
 * garantir que nenhum payload malicioso chegue ao banco de dados.
 */
import { z } from 'zod'

// ============================================================
// Primitivos reutilizáveis
// ============================================================

const uuid = z.string().uuid()
const optionalUuid = z.string().uuid().optional().nullable()
const phone = z.string().min(8).max(20)
const email = z.string().email()
const optionalEmail = z.string().email().optional().nullable()
const nonEmpty = z.string().min(1).max(500)
const optionalText = z.string().max(2000).optional().nullable()
const tags = z.array(z.string().max(50)).max(30).optional().default([])
const price = z.number().nonnegative().optional().nullable()
const jsonArray = z.array(z.any()).optional()
const jsonObject = z.record(z.string(), z.any()).optional()

// ============================================================
// Properties (Properties)
// ============================================================

export const createPropertySchema = z.object({
    title: nonEmpty,
    type: z.string().min(1).max(50),
    price: price,
    status: z.string().max(50).optional().default('Available'),
    description: optionalText,
    details: jsonObject,
    images: jsonArray,
    videos: jsonArray,
    documents: jsonArray,
    is_published: z.boolean().optional().default(false),
    is_archived: z.boolean().optional().default(false),
})

export const updatePropertySchema = createPropertySchema.partial()

// ============================================================
// Leads
// ============================================================

export const createLeadSchema = z.object({
    name: nonEmpty,
    phone: phone,
    email: optionalEmail,
    tags: tags,
    cpf: z.string().max(14).optional().nullable(),
    address_street: optionalText,
    address_number: z.string().max(20).optional().nullable(),
    address_complement: z.string().max(100).optional().nullable(),
    address_neighborhood: z.string().max(100).optional().nullable(),
    address_city: z.string().max(100).optional().nullable(),
    address_state: z.string().max(2).optional().nullable(),
    address_zip_code: z.string().max(10).optional().nullable(),
    marital_status: z.string().max(50).optional().nullable(),
    birth_date: z.string().optional().nullable(),
    primary_interest: z.string().max(200).optional().nullable(),
    stage_id: optionalUuid,
    notes: optionalText,
    value: price,
    interest: z.string().max(100).optional().nullable(),
    lead_source: z.string().max(100).optional().default('Direto'),
    campaign: z.string().max(200).optional().nullable(),
    property_id: optionalUuid,
    date: z.string().max(20).optional().nullable(),
    assigned_to: optionalUuid,
    images: jsonArray,
    videos: jsonArray,
    documents: jsonArray,
})

export const updateLeadSchema = createLeadSchema.partial()

// ============================================================
// Profile
// ============================================================

export const updateProfileSchema = z.object({
    full_name: nonEmpty,
    whatsapp_number: z.string().max(20).optional().nullable(),
    email: optionalEmail,
})

export const requestEmailChangeSchema = z.object({
    newEmail: email,
})

// ============================================================
// Contacts (Clientes)
// ============================================================

export const createContactSchema = z.object({
    name: nonEmpty,
    phone: phone,
    email: optionalEmail,
    cpf: z.string().max(14).optional().nullable(),
    tags: tags,
    address_street: optionalText,
    address_number: z.string().max(20).optional().nullable(),
    address_complement: z.string().max(100).optional().nullable(),
    address_neighborhood: z.string().max(100).optional().nullable(),
    address_city: z.string().max(100).optional().nullable(),
    address_state: z.string().max(2).optional().nullable(),
    address_zip_code: z.string().max(10).optional().nullable(),
    marital_status: z.string().max(50).optional().nullable(),
    birth_date: z.string().optional().nullable(),
    primary_interest: z.string().max(200).optional().nullable(),
})

export const updateContactSchema = createContactSchema.partial()

// ============================================================
// Calendar Events
// ============================================================

export const createCalendarEventSchema = z.object({
    title: nonEmpty,
    description: optionalText,
    start_time: z.string().min(1),
    end_time: z.string().min(1),
    type: z.string().max(50).optional().default('meeting'),
    lead_id: optionalUuid,
    property_id: optionalUuid,
    reminder_minutes: z.number().int().nonnegative().optional().nullable(),
    color: z.string().max(20).optional().nullable(),
})

export const updateCalendarEventSchema = createCalendarEventSchema.partial()

// ============================================================
// Notes
// ============================================================

export const createNoteSchema = z.object({
    content: z.string().min(1).max(10000),
    lead_id: optionalUuid,
    property_id: optionalUuid,
})

export const updateNoteSchema = z.object({
    content: z.string().min(1).max(10000),
})

// ============================================================
// Tenant Settings
// ============================================================

export const updateTenantBrandingSchema = z.object({
    name: z.string().max(200).optional(),
    slug: z.string().max(100).optional(),
    branding: jsonObject.optional(),
    custom_domain: z.string().max(253).optional().nullable(),
})

// ============================================================
// Invitations
// ============================================================

export const createInvitationSchema = z.object({
    email: email,
    role: z.enum(['user', 'admin']).default('user'),
})

// ============================================================
// Stages
// ============================================================

export const createStageSchema = z.object({
    name: nonEmpty,
    color: z.string().max(20).optional().default('#6b7280'),
    order_index: z.number().int().nonnegative(),
})

export const updateStageSchema = createStageSchema.partial()

// ============================================================
// Messaging / WhatsApp
// ============================================================

export const sendMessageSchema = z.object({
    number: phone,
    message: z.string().min(1).max(5000),
    instanceName: z.string().min(1).max(100),
})

// ============================================================
// AI
// ============================================================

export const aiRequestSchema = z.object({
    prompt: z.string().min(1).max(10000),
    feature: z.string().max(50).optional(),
})

// ============================================================
// Helpers
// ============================================================

/**
 * Valida dados contra um schema Zod e retorna resultado tipado.
 * Uso: const { data, error } = validateInput(createLeadSchema, rawInput)
 */
export function validateInput<T extends z.ZodTypeAny>(
    schema: T,
    input: unknown
): { data: z.infer<T>; error: null } | { data: null; error: string } {
    const result = schema.safeParse(input)
    if (!result.success) {
        const messages = result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', ')
        return { data: null, error: `Dados inválidos: ${messages}` }
    }
    return { data: result.data, error: null }
}
