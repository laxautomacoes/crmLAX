export function autoFillProposalFields(
    fields: any[],
    client: any,
    leadId: string,
    systemProperty?: any,
    selectedUnit?: string,
    availableUnits?: any[]
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
                let activeProperty = property;
                let title = activeProperty?.title || lead?.property_interest || '';
                
                if (systemProperty) {
                    activeProperty = systemProperty;
                    title = systemProperty.title || '';
                    if (selectedUnit && (systemProperty.type === 'Empreendimento' || systemProperty.details?.is_empreendimento)) {
                        title += ` - Unidade ${selectedUnit}`;
                    }
                }
                
                if (activeProperty) {
                    const details = activeProperty.details || {};
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
                if (systemProperty) {
                    if ((systemProperty.type === 'Empreendimento' || systemProperty.details?.is_empreendimento) && selectedUnit && availableUnits && availableUnits.length > 0) {
                        const unitInfo = availableUnits.find((u: any) => u.unit_number === selectedUnit);
                        if (unitInfo?.valor_total) {
                            val = parseFloat(unitInfo.valor_total.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                    }
                    if (!val && systemProperty.price) {
                        val = parseFloat(systemProperty.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }
                } else if (property?.price) {
                    val = parseFloat(property.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
                break;
            case 'property.type':
                val = systemProperty?.type || property?.type || '';
                break;
            case 'property.address_city':
                val = systemProperty?.address_city || property?.address_city || '';
                break;
            case 'property.address_state':
                val = systemProperty?.address_state || property?.address_state || '';
                break;
            default:
                if (field.crm_binding.startsWith('contact.')) {
                    const propName = field.crm_binding.substring(8);
                    const rawVal = client[propName];
                    const rawValStr = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';
                    
                    if (propName.includes('date') && /^\d{4}-\d{2}-\d{2}$/.test(rawValStr)) {
                        if (field.type === 'date') {
                            val = rawValStr;
                        } else {
                            const [year, month, day] = rawValStr.split('-');
                            val = `${day}/${month}/${year}`;
                        }
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
