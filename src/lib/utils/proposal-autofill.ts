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
            case 'contact.birth_date':
                val = client.birth_date || '';
                break;
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
            case 'property.title':
                val = property?.title || lead?.property_interest || '';
                break;
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
