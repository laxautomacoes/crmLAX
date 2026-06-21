import { getAIModel } from "./gemini";
import { openai } from "./openai";

function getAnalyzerPrompt(templateType: string) {
    let contextInstructions = '';
    let bindingInstructions = '';

    if (templateType === 'proposta') {
        contextInstructions = 'Analise a imagem da ficha de proposta comercial anexada.';
        bindingInstructions = `
- crm_binding: Sugestão de qual dado do CRM esse campo corresponde, focando em clientes e propostas:
  - 'contact.name', 'contact.phone', 'contact.email', 'contact.cpf', 'contact.marital_status', 'contact.birth_date'
  - 'contact.rg_cnh', 'contact.rg_cnh_date', 'contact.issuing_agency', 'contact.profession', 'contact.naturalness', 'contact.nationality'
  - 'contact.marriage_date', 'contact.father_name', 'contact.mother_name'
  - 'contact.address_street', 'contact.address_number', 'contact.address_complement', 'contact.address_neighborhood', 'contact.address_city', 'contact.address_state', 'contact.address_zip_code'
  - 'contact.spouse_name', 'contact.spouse_cpf', 'contact.spouse_email', 'contact.spouse_phone', 'contact.spouse_marital_status', 'contact.spouse_birth_date', 'contact.spouse_profession'
  - 'contact.spouse_rg_cnh', 'contact.spouse_rg_cnh_date', 'contact.spouse_issuing_agency', 'contact.spouse_naturalness', 'contact.spouse_nationality'
  - 'contact.spouse_property_regime', 'contact.spouse_marriage_date', 'contact.spouse_father_name', 'contact.spouse_mother_name'
  - 'contact.com_address_street', 'contact.com_address_number', 'contact.com_address_complement', 'contact.com_address_neighborhood', 'contact.com_address_city', 'contact.com_address_state', 'contact.com_address_zip_code'
  - 'property.title' (Nome/título do imóvel de interesse), 'property.price', 'property.type', 'property.address_city', 'property.address_state'
  - 'proposal.value' (Valor total proposto), 'proposal.down_payment' (Valor do sinal/entrada)
  - 'proposal.financing' (Valor financiado), 'proposal.installments' (Parcelamento), 'proposal.permutas', 'proposal.notes'
  Se não houver correspondente no CRM, defina crm_binding como null.`;
    } else if (templateType === 'agenciamento') {
        contextInstructions = 'Analise a imagem da ficha de agenciamento/captação de imóvel anexada.';
        bindingInstructions = `
- crm_binding: Sugestão de qual dado do CRM esse campo corresponde, focando em propriedades e captação:
  - 'property.title' (Título do anúncio/imóvel), 'property.type' (Tipo: casa, apartamento)
  - 'property.price' (Valor de venda ou locação), 'property.commission' (Comissão)
  - 'property.address_street', 'property.address_number', 'property.address_neighborhood', 'property.address_city', 'property.address_state', 'property.address_zip_code'
  - 'property.bedrooms' (Quartos), 'property.suites' (Suítes), 'property.bathrooms' (Banheiros), 'property.garages' (Vagas)
  - 'property.useful_area' (Área útil/privativa), 'property.total_area' (Área total)
  - 'property.iptu' (Valor do IPTU), 'property.condominium' (Valor do Condomínio)
  - 'property.owner_name' (Nome do Proprietário), 'property.owner_phone', 'property.owner_cpf'
  Se não houver correspondente exato no CRM de propriedades, defina crm_binding como null.`;
    } else {
        contextInstructions = 'Analise a imagem do formulário genérico anexado.';
        bindingInstructions = `
- crm_binding: Defina sempre como null. Como é um formulário genérico, não tente forçar nenhuma correlação com o CRM. Extraia apenas o schema de inputs visuais.`;
    }

    return `Você é uma inteligência artificial especialista em sistemas de CRM.
${contextInstructions}
Sua tarefa é ler todas as linhas e retângulos em branco e extrair a lista de campos a serem preenchidos.
Retorne um array JSON estruturado com os campos. Cada objeto deve conter:
- name: Identificador único em snake_case (ex: 'nome_proponente', 'estado_civil', 'valor_sinal', 'descricao_imovel').
- label: O nome em português visível que identifica o campo na ficha (ex: 'Nome do Proponente', 'C. Identidade', 'Profissão', 'Cônjuge').
- type: O tipo de input adequado ('text', 'number', 'date', 'boolean').${bindingInstructions}

Retorne APENAS o array JSON válido. Não coloque blocos de código com markdown (como \`\`\`json). A resposta deve ser diretamente o array.`;
}

export async function analyzeProposalPDF(
    pageImagesBase64: string[],
    provider: 'gemini' | 'openai',
    modelName: string,
    templateType: string = 'proposta'
): Promise<any[]> {
    try {
        const promptText = getAnalyzerPrompt(templateType);
        let text = '';
        if (provider === 'openai') {
            const content: any[] = [{ type: 'text', text: promptText }];
            pageImagesBase64.forEach(base64 => {
                content.push({
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64}` }
                });
            });
            const response = await openai.chat.completions.create({
                model: modelName,
                messages: [{ role: 'user', content }],
                temperature: 0.2,
            });
            text = response.choices[0].message.content || '';
        } else {
            const model = getAIModel(modelName);
            const parts: any[] = [
                promptText,
                ...pageImagesBase64.map(base64 => ({
                    inlineData: {
                        data: base64,
                        mimeType: 'image/jpeg'
                    }
                }))
            ];
            const result = await model.generateContent(parts);
            const response = await result.response;
            text = response.text();
        }

        // Limpar possíveis blocos de markdown retornados por LLMs
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error('Erro na análise de proposta por IA:', error);
        throw new Error('Falha ao processar o PDF com a IA selecionada.');
    }
}
