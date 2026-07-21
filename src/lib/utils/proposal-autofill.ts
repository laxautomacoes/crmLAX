export function autoFillProposalFields(
    fields: any[],
    client: any,
    leadId: string,
    systemProperty?: any,
    selectedUnit?: string,
    availableUnits?: any[],
    profileName?: string,
    adminName?: string
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
                }

                if (activeProperty) {
                    const details = activeProperty.details || {};
                    const isEmpreendimento = activeProperty.type === 'Empreendimento' || details.is_empreendimento;
                    
                    if (isEmpreendimento && selectedUnit) {
                        const unitParts = [`apto ${selectedUnit}`];
                        
                        if (availableUnits && availableUnits.length > 0) {
                            const unitInfo = availableUnits.find((u: any) => u.unit_number === selectedUnit);
                            if (unitInfo) {
                                if (unitInfo.block_tower) {
                                    unitParts.push(`bl ${unitInfo.block_tower}`);
                                }
                                
                                if (unitInfo.garage_number) {
                                    unitParts.push(`vg ${unitInfo.garage_number}`);
                                } else if (unitInfo.garage_type && unitInfo.garage_type !== 'Não') {
                                    if (unitInfo.garage_type.toLowerCase() === 'sim') {
                                        unitParts.push(`vg sim`);
                                    } else {
                                        unitParts.push(`vg ${unitInfo.garage_type}`);
                                    }
                                }
                                
                                if (unitInfo.hobby_box && unitInfo.hobby_box !== 'Não') {
                                    if (unitInfo.hobby_box_number) {
                                        unitParts.push(`hb ${unitInfo.hobby_box_number}`);
                                    } else if (unitInfo.hobby_box.toLowerCase() !== 'sim') {
                                        unitParts.push(`hb ${unitInfo.hobby_box}`);
                                    } else {
                                        unitParts.push(`hb sim`);
                                    }
                                }
                            }
                        }
                        val = `${title} - ${unitParts.join(' • ')}`;
                    } else {
                        const parts = [];
                        const apto = details.endereco?.apto || details.apto;
                        if (apto) parts.push(`apto ${apto}`);
                        
                        const vagas = details.vagas;
                        if (vagas && parseInt(String(vagas)) > 0) {
                            const vagasNum = details.vagas_numeracao ? ` (${details.vagas_numeracao})` : '';
                            parts.push(`vg ${vagas}${vagasNum}`);
                        }
                        
                        const hb = details.hobby_box_numeracao || details.hobby_box;
                        if (hb && hb !== 'Não') {
                            if (details.hobby_box_numeracao) {
                                parts.push(`hb ${details.hobby_box_numeracao}`);
                            } else if (hb.toLowerCase() !== 'sim') {
                                parts.push(`hb ${hb}`);
                            } else {
                                parts.push(`hb sim`);
                            }
                        }
                        
                        if (parts.length > 0) {
                            val = `${title} - ${parts.join(' • ')}`;
                        } else {
                            val = title;
                        }
                    }
                } else {
                    val = title;
                }
                break;
            }
            case 'property.price': {
                const activeProperty = systemProperty || property;
                if (activeProperty) {
                    let price = activeProperty.price;
                    // Se for empreendimento com unidade selecionada, busca o valor da unidade
                    if ((activeProperty.type === 'Empreendimento' || activeProperty.details?.is_empreendimento) && selectedUnit && availableUnits && availableUnits.length > 0) {
                        const unitInfo = availableUnits.find((u: any) => u.unit_number === selectedUnit);
                        if (unitInfo?.valor_total) {
                            price = unitInfo.valor_total;
                        }
                    }
                    if (price) {
                        val = parseFloat(price.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }
                }
                break;
            }
            case 'property.type':
                val = systemProperty?.type || property?.type || '';
                break;
            case 'property.address_city':
                val = systemProperty?.address_city || property?.address_city || property?.details?.endereco?.cidade || '';
                break;
            case 'property.address_state':
                val = systemProperty?.address_state || property?.address_state || property?.details?.endereco?.estado || '';
                break;
            case 'property.address_street':
                val = systemProperty?.details?.endereco?.logradouro || property?.details?.endereco?.logradouro || '';
                break;
            case 'profile.current_user_name':
                val = profileName || '';
                break;
            case 'profile.admin_name':
                val = adminName || '';
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
