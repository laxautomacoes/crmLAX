import { getAIModel } from "./gemini";
import { openai } from "./openai";

const ANALYZER_PROMPT = `Você é uma inteligência artificial especialista em sistemas de CRM imobiliários.
Analise a imagem da ficha de proposta comercial anexada (esta é uma ficha padrão preenchida pelos corretores).
Sua tarefa é ler todas as linhas e retângulos em branco e extrair a lista de campos a serem preenchidos.
Retorne um array JSON estruturado com os campos. Cada objeto deve conter:
- name: Identificador único em snake_case (ex: 'nome_proponente', 'estado_civil', 'valor_sinal', 'descricao_imovel').
- label: O nome em português visível que identifica o campo na ficha (ex: 'Nome do Proponente', 'C. Identidade', 'Profissão', 'Cônjuge').
- type: O tipo de input adequado ('text', 'number', 'date', 'boolean').
- crm_binding: Sugestão de qual dado do CRM esse campo corresponde, se houver:
  - 'contact.name' (Nome do cliente/proponente)
  - 'contact.phone', 'contact.email', 'contact.cpf', 'contact.marital_status', 'contact.birth_date'
  - 'contact.address_street', 'contact.address_number', 'contact.address_neighborhood', 'contact.address_city', 'contact.address_state', 'contact.address_zip_code'
  - 'property.title' (Nome/título do imóvel de interesse)
  - 'property.price', 'property.type', 'property.address_city', 'property.address_state'
  - 'proposal.value' (Valor total proposto)
  - 'proposal.down_payment' (Valor do sinal/entrada proposto)
  - 'proposal.financing' (Valor a ser financiado proposto)
  - 'proposal.installments' (Condições de parcelamento), 'proposal.permutas' (Permutas), 'proposal.notes' (Observações)
  Se o campo for muito específico e não houver correspondente no CRM (ex: Filiação, RG do cônjuge), defina crm_binding como null.

Retorne APENAS o array JSON válido. Não coloque blocos de código com markdown (como \`\`\`json). A resposta deve ser diretamente o array.`;

export async function analyzeProposalPDF(
    pageImagesBase64: string[],
    provider: 'gemini' | 'openai',
    modelName: string
): Promise<any[]> {
    try {
        let text = '';
        if (provider === 'openai') {
            const content: any[] = [{ type: 'text', text: ANALYZER_PROMPT }];
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
                ANALYZER_PROMPT,
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
