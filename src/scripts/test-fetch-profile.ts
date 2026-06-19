// Script para testar resposta detalhada do fetchProfile
import 'dotenv/config'

const EVOLUTION_URL = process.env.EVOLUTION_URL?.replace(/['"]/g, '')
const EVOLUTION_KEY = process.env.EVOLUTION_GLOBAL_API_KEY?.replace(/['"]/g, '')

async function main() {
    const baseUrl = EVOLUTION_URL!.endsWith('/') ? EVOLUTION_URL!.slice(0, -1) : EVOLUTION_URL!
    const instanceName = 'loacostaimveisadm'
    
    // Testar com o número de Léo Acosta com DDI
    const phone = '5548988231720'
    
    console.log(`Testando fetchProfile para ${phone}...`)
    console.log(`URL: ${baseUrl}/chat/fetchProfile/${instanceName}`)
    
    const response = await fetch(`${baseUrl}/chat/fetchProfile/${instanceName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_KEY!,
        },
        body: JSON.stringify({ number: phone }),
    })
    
    console.log(`Status: ${response.status}`)
    const body = await response.text()
    console.log(`Resposta completa:`, body)
}

main().catch(console.error)
