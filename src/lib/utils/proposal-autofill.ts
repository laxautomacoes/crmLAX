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
            case 'contact.name':
                val = client.name || '';
                break;
            case 'contact.phone':
                val = client.phone || '';
                break;
            case 'contact.email':
                val = client.email || '';
                break;
            case 'contact.cpf':
                val = client.cpf || '';
                break;
            case 'contact.marital_status':
                val = client.marital_status || '';
                break;
            case 'contact.birth_date': {
                const bdate = client.birth_date || '';
                if (/^\d{4}-\d{2}-\d{2}$/.test(bdate)) {
                    const [year, month, day] = bdate.split('-');
                    val = `${day}/${month}/${year}`;
                } else {
                    val = bdate;
                }
                break;
            }
            case 'contact.address_street':
                val = client.address_street || '';
                break;
            case 'contact.address_number':
                val = client.address_number || '';
                break;
            case 'contact.address_neighborhood':
                val = client.address_neighborhood || '';
                break;
            case 'contact.address_city':
                val = client.address_city || '';
                break;
            case 'contact.address_state':
                val = client.address_state || '';
                break;
            case 'contact.address_zip_code':
                val = client.address_zip_code || '';
                break;
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
                break;
        }

        if (val) {
            responses[field.name || field.label] = val;
        }
    });

    return responses;
}
