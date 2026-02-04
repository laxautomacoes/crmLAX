

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Manual env parsing
const envLocalPath = path.resolve(process.cwd(), '.env.local')
const envPath = path.resolve(process.cwd(), '.env')

function parseEnv(filePath: string) {
    if (!fs.existsSync(filePath)) return {}
    const content = fs.readFileSync(filePath, 'utf-8')
    const env: Record<string, string> = {}
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            let value = match[2].trim()
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1)
            }
            env[key] = value
        }
    })
    return env
}

const envLocal = parseEnv(envLocalPath)
const env = parseEnv(envPath)
const mergedEnv = { ...env, ...envLocal }

const supabaseUrl = mergedEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = mergedEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Service Key Exists:', !!supabaseServiceKey)

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function run() {
    const email = 'leo@leoacosta.online'
    console.log(`Checking invitation for ${email}...`)

    const { data: invitations, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', email)

    if (fetchError) {
        console.error('Error fetching invitation:', fetchError)
        return
    }

    if (!invitations || invitations.length === 0) {
        console.log('No invitation found for this email.')
        return
    }

    const invitation = invitations[0]
    console.log('Invitation found:', invitation)

    if (invitation.used_at) {
        console.log('Invitation already accepted at:', invitation.used_at)
    } else {
        console.log('Invitation is PENDING. Attempting to accept...')
        const { error: updateError } = await supabase
            .from('invitations')
            .update({ used_at: new Date().toISOString() })
            .eq('id', invitation.id)

        if (updateError) {
            console.error('Error updating invitation:', updateError)
        } else {
            console.log('Invitation successfully accepted!')
        }
    }
}

run()
