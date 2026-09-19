'use server'

import { createClient } from '@/lib/supabase/server'
import { runAI } from '@/lib/ai/factory'
import { requirePlanFeature } from '@/lib/utils/plan-guard'

export async function trainAILaxWithProperty(propertyId: string, tenantId: string, profileId: string) {
    await requirePlanFeature(tenantId, 'ai')

    const supabase = await createClient()

    try {
        // 1. Fetch Property info including images and documents
        const { data: property, error: propError } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .eq('tenant_id', tenantId)
            .single()

        if (propError || !property) {
            throw new Error(`Erro ao buscar imóvel: ${propError?.message || 'Imóvel não encontrado.'}`)
        }

        // 2. Coletar URLs de imagens e documentos
        const fileUrls: string[] = []

        // Adicionar URLs das imagens
        if (Array.isArray(property.images)) {
            property.images.forEach((img: any) => {
                if (img?.url) fileUrls.push(img.url)
            })
        }

        // Adicionar URLs dos documentos (PDFs, tabelas de preço)
        if (Array.isArray(property.documents)) {
            property.documents.forEach((doc: any) => {
                if (doc?.url) fileUrls.push(doc.url)
            })
        }

        // 3. Montar o prompt de treinamento
        const d = (property.details as any) || {}
        const price = property.price
            ? `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(property.price)}`
            : 'Preço sob consulta'

        const typeLabels: Record<string, string> = {
            house: 'Casa',
            apartment: 'Apartamento',
            land: 'Terreno',
            commercial: 'Imóvel Comercial'
        }

        const basicContext = `
DADOS CADASTRAIS DO IMÓVEL:
Título: ${property.title}
Tipo: ${typeLabels[property.type || ''] || property.type || 'Não informado'}
Preço Cadastrado: ${price}
Dormitórios: ${d.dormitorios || d.quartos || 'N/A'}
Suítes: ${d.suites || 'N/A'}
Área privativa: ${d.area_privativa ? `${d.area_privativa}m²` : 'N/A'}
Vagas de garagem: ${d.vagas_garagem || d.garagem || 'N/A'}
Bairro: ${d.endereco?.bairro || 'N/A'}
Cidade: ${d.endereco?.cidade || 'N/A'}
Diferenciais Cadastrados: ${d.diferenciais?.join(', ') || 'N/A'}
Descrição: ${property.description || 'N/A'}
`

        const prompt = `Você é um analista imobiliário de elite e estrategista de vendas da IA LAX.
Sua missão é ler TODOS os arquivos, imagens, PDFs e dados estruturados em anexo sobre este imóvel/empreendimento, e gerar um "Relatório Mestre de Conhecimento" (Master Report).

Este relatório servirá como o "Cérebro" para futuras respostas a clientes, criação de copys de anúncio e argumentos de venda.

INFORMAÇÕES BÁSICAS CADASTRADAS:
${basicContext}

INSTRUÇÕES:
1. Extraia o máximo de informações relevantes dos arquivos anexos (plantas, tabelas de preços reais, memoriais descritivos, folders).
2. Se houver discrepância entre os "DADOS CADASTRAIS" e os anexos (ex: o anexo tem preços mais precisos por unidade), priorize a riqueza dos anexos, mas mencione ambos se necessário.
3. Organize o relatório no formato Markdown, contendo EXATAMENTE as seguintes seções:

# Ficha Técnica Completa
(Tudo sobre o imóvel: áreas, quartos, andares, infraestrutura, acabamentos, localização exata se houver).

# Tabela de Preços e Condições
(Faixas de preços extraídas das tabelas, se houver. Condições de pagamento, financiamento, entrada).

# Diferenciais e Pitch de Vendas
(Os principais pontos fortes do imóvel. Por que alguém compraria? O que destacar para encantar o cliente?).

# Objeções Comuns e Respostas
(Preveja 2 ou 3 possíveis objeções que um cliente teria, como preço, prazo de entrega ou localização, e crie respostas persuasivas com base nos dados).

IMPORTANTE: 
- Retorne APENAS o Markdown gerado, sem introduções ou saudações. 
- Seja rico em detalhes e persuasivo.`

        // 4. Executar a IA (que processará os textos e os fileUrls via Gemini/OpenAI)
        const result = await runAI(tenantId, prompt, fileUrls)

        // Registrar uso da IA
        await supabase.from('ai_usage').insert({
            tenant_id: tenantId,
            profile_id: profileId,
            model: result.model,
            total_tokens: result.usage.total_tokens,
            feature_context: 'property_master_report'
        })

        if (!result.text) {
            throw new Error('A IA não conseguiu gerar o relatório.')
        }

        // 5. Salvar o resultado no JSON \`details.ai_master_report\`
        const updatedDetails = { ...d, ai_master_report: result.text.trim() }

        const { error: updateError } = await supabase
            .from('properties')
            .update({ details: updatedDetails })
            .eq('id', propertyId)

        if (updateError) {
            throw new Error(`Erro ao salvar relatório no imóvel: ${updateError.message}`)
        }

        return { success: true, data: updatedDetails.ai_master_report }

    } catch (error: any) {
        console.error('trainAILaxWithProperty Error:', error)
        return { success: false, error: error.message || 'Falha ao treinar a IA LAX com este imóvel.' }
    }
}
