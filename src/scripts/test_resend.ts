
import * as fs from 'fs'
import * as path from 'path'

// Manual env parsing
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

const env = parseEnv(envPath)
const RESEND_API_KEY = env.RESEND_API_KEY

async function testResend() {
    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not found in .env')
        return
    }

    console.log('Testing Resend API with key starting with:', RESEND_API_KEY.substring(0, 5))

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'CRM LAX <onboarding@resend.dev>',
                to: 'leo@leoacosta.online',
                subject: 'Teste de Envio - CRM LAX',
                html: '<p>Este é um teste direto da API do Resend.</p>'
            })
        })

        const data = await response.json()
        console.log('Resend API Response Status:', response.status)
        console.log('Resend API Response Data:', JSON.stringify(data, null, 2))
    } catch (error) {
        console.error('Error calling Resend API:', error)
    }
}

testResend()
