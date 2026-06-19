// Script temporário para sincronizar avatares de contatos existentes
// Execute com: npx tsx src/scripts/sync-avatars-now.ts

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const EVOLUTION_URL = process.env.EVOLUTION_URL?.replace(/['"]/g, '')
const EVOLUTION_KEY = process.env.EVOLUTION_GLOBAL_API_KEY?.replace(/['"]/g, '')

async function main() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('Missing Supabase env vars')
        process.exit(1)
    }
    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
        console.error('Missing Evolution API env vars')
        process.exit(1)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Buscar instância conectada
    const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, tenant_id')
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle()

    if (!instance?.instance_name) {
        console.error('Nenhuma instância conectada encontrada')
        process.exit(1)
    }

    console.log(`Usando instância: ${instance.instance_name}`)

    // 2. Buscar contatos sem avatar
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, name, phone')
        .eq('tenant_id', instance.tenant_id)
        .is('avatar_url', null)
        .not('phone', 'is', null)

    if (error || !contacts) {
        console.error('Erro ao buscar contatos:', error)
        process.exit(1)
    }

    console.log(`Encontrados ${contacts.length} contatos sem avatar`)

    let updated = 0
    for (const contact of contacts) {
        try {
            const cleanPhone = contact.phone!.replace(/\D/g, '')
            const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
            
            const baseUrl = EVOLUTION_URL!.endsWith('/') ? EVOLUTION_URL!.slice(0, -1) : EVOLUTION_URL!
            const response = await fetch(`${baseUrl}/chat/fetchProfile/${instance.instance_name}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVOLUTION_KEY!,
                },
                body: JSON.stringify({ number: fullPhone }),
            })

            if (response.ok) {
                const profile = await response.json()
                const avatarUrl = profile?.picture || profile?.profilePictureUrl || profile?.profileUrl || null

                if (avatarUrl) {
                    await supabase
                        .from('contacts')
                        .update({ avatar_url: avatarUrl })
                        .eq('id', contact.id)
                    updated++
                    console.log(`✅ ${contact.name} → avatar atualizado`)
                } else {
                    console.log(`⚠️ ${contact.name} → sem foto de perfil no WhatsApp`)
                }
            } else {
                console.log(`❌ ${contact.name} → erro HTTP ${response.status}`)
            }

            // Delay para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 800))
        } catch (err: any) {
            console.log(`❌ ${contact.name} → ${err.message}`)
        }
    }

    console.log(`\nFinalizado: ${updated}/${contacts.length} avatares atualizados`)
}

main()
