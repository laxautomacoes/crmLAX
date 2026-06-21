export function autoFillProposalFields(
    fields: any[],
    client: any,
    leadId: string
): Record<string, string> {
    const responses: Record<string, string> = {};
    if (!fields || !client) return responses;

    const lead = client.leads?.find((l: any) => l.id === leadId);
    const property = lead?.properties || lead?.property;

    fields.forEach((field) => {
        if (!field.crm_binding) return;

        let val = '';
        switch (field.crm_binding) {
            case 'property.title': {
                const title = property?.title || lead?.property_interest || '';
                if (property) {
                    const details = property.details || {};
                    const parts = [title];
                    
                    const apto = details.endereco?.apto || details.apto;
                    if (apto) parts.push(`Apto: ${apto}`);
                    
                    const vagas = details.vagas;
                    if (vagas && parseInt(String(vagas)) > 0) {
                        const vagasNum = details.vagas_numeracao ? ` (${details.vagas_numeracao})` : '';
                        parts.push(`Vagas: ${vagas}${vagasNum}`);
                    }
                    
                    const hb = details.hobby_box_numeracao || details.hobby_box;
                    if (hb && hb !== 'Não' && hb !== 'Sim') {
                        parts.push(`Hobby Box: ${hb}`);
                    } else if (details.hobby_box === 'Sim' || details.hobby_box_numeracao) {
                        const hbVal = details.hobby_box_numeracao ? ` (${details.hobby_box_numeracao})` : '';
                        parts.push(`Hobby Box: Sim${hbVal}`);
                    }
                    
                    val = parts.join(', ');
                } else {
                    val = title;
                }
                break;
            }
            case 'property.price':
                val = property?.price
                    ? parseFloat(property.price).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                      })
                    : '';
                break;
            case 'property.type':
                val = property?.type || '';
                break;
            case 'property.address_city':
                val = property?.address_city || '';
                break;
            case 'property.address_state':
                val = property?.address_state || '';
                break;
            default:
                if (field.crm_binding.startsWith('contact.')) {
                    const propName = field.crm_binding.substring(8);
                    const rawVal = client[propName];
                    const rawValStr = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';
                    
                    if (propName.includes('date') && /^\d{4}-\d{2}-\d{2}$/.test(rawValStr)) {
                        const [year, month, day] = rawValStr.split('-');
                        val = `${day}/${month}/${year}`;
                    } else {
                        val = rawValStr;
                    }
                }
                break;
        }

        if (val) {
            responses[field.name || field.label] = val;
        }
    });

    return responses;
}
