/**
 * Interface para os dados de configuração de e-mail do Tenant
 */
export interface EmailSettings {
    logo_url?: string;
    primary_color?: string;
    signature_html?: string;
    footer_text?: string;
    templates?: Record<string, { subject?: string; body?: string }>;
    attachments?: {
        images: string[];
        videos: string[];
        documents: { name: string; url: string }[];
    };
}

/**
 * Utilitário para substituir placeholders em uma string
 * Ex: "Olá {{nome}}" -> "Olá Leo"
 */
export function replacePlaceholders(text: string, data: Record<string, string>): string {
    let result = text;
    Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    });
    return result;
}

/**
 * Converte o Markdown customizado do FormRichTextarea para HTML
 */
export function markdownToEmailHtml(md: string, settings?: EmailSettings): string {
    if (!md) return '';
    
    const primaryColor = settings?.primary_color || '#FFE600';
    
    let html = md
        // Inline Styles
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__ (.*?)__/g, '<u>$1</u>')
        .replace(/~~(.*?)~~/g, '<strike>$1</strike>')
        // Headers
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        // Links & Images
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 8px; margin: 10px 0; display: block;">')
        .replace(/\[(.*?)\]\((.*?)\)#button/g, `<div style="text-align: center; margin: 24px 0;"><a href="$2" class="button" style="background-color: ${primaryColor}; color: #000000 !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">$1</a></div>`)
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: #3b82f6; text-decoration: underline;">$1</a>')
        // Color
        .replace(/<color:\s*([^>]+?)\s*>(.*?)<\/color>/g, '<span style="color: $1">$2</span>')
        // Lists (Basic)
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
        // Line breaks
        .replace(/\n/g, '<br>');

    // Envolver listas
    html = html.replace(/(<li>[\s\S]*<\/li>)/gm, '<ul>$1</ul>');

    return html;
}

/**
 * Template base HTML para garantir consistência visual (Premium Design)
 */
function getBaseLayout(content: string, settings?: EmailSettings) {
    const primaryColor = settings?.primary_color || '#FFE600';
    const textColor = '#404F4F';
    const logoHtml = settings?.logo_url 
        ? `<img src="${settings.logo_url}" alt="Logo" style="max-height: 60px; margin-bottom: 24px; display: block;">` 
        : '<h1 style="color: #404F4F; margin: 0 0 24px 0; font-size: 24px;">CRM LAX</h1>';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="color-scheme" content="light dark">
            <meta name="supported-color-schemes" content="light dark">
            <style>
                :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                }
                body { 
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                    -webkit-font-smoothing: antialiased; 
                    margin: 0; 
                    padding: 0; 
                    color: ${textColor}; 
                    background-color: transparent;
                }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .card { 
                    background-color: #ffffff; 
                    border-radius: 16px; 
                    border: 1px solid #f0f0f0; 
                    padding: 40px; 
                }
                .button { 
                    background-color: ${primaryColor}; 
                    color: #000000 !important; 
                    padding: 14px 28px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: bold; 
                    display: inline-block; 
                    margin: 24px 0; 
                }
                .footer { margin-top: 32px; text-align: center; color: #999; font-size: 12px; }
                .signature { margin-top: 32px; padding-top: 24px; border-top: 1px solid #f0f0f0; }
                
                @media (prefers-color-scheme: dark) {
                    body { color: #ffffff !important; }
                    .card { background-color: #1a1a1a !important; border-color: #333333 !important; }
                    .signature { border-top-color: #333333 !important; }
                    h1, h2, h3, p, span, li, a { color: #ffffff !important; }
                    a.button { color: #000000 !important; }
                    .footer { color: #777777 !important; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    ${logoHtml}
                    ${content}
                    ${settings?.signature_html ? `<div class="signature">${markdownToEmailHtml(settings.signature_html, settings)}</div>` : ''}
                </div>
                <div class="footer">
                    ${settings?.footer_text || ''}
                </div>
            </div>
        </body>
        </html>
    `;
}

/**
 * Template de Convite
 */
export function getInvitationEmailTemplate(inviteLink: string, tenantName: string, settings?: EmailSettings, data: Record<string, string> = {}) {
    const customText = settings?.templates?.invitation?.body;
    const subject = settings?.templates?.invitation?.subject || `Você foi convidado para participar da ${tenantName}`;

    let bodyContent = '';
    
    const replacementData = {
        link: inviteLink,
        tenantName: tenantName,
        empresa: tenantName,
        ...data
    };

    if (customText) {
        bodyContent = replacePlaceholders(markdownToEmailHtml(customText, settings), replacementData);
    } else {
        bodyContent = `
            <h2 style="margin-top: 0;">Você foi convidado!</h2>
            <p>Olá, você foi convidado para colaborar na equipe da <strong>${tenantName}</strong> no CRM LAX.</p>
            <p>Clique no botão abaixo para aceitar o convite e configurar sua conta:</p>
            <a href="${inviteLink}" class="button">Aceitar Convite</a>
            <p style="color: #666; font-size: 13px;">Se o botão não funcionar, copie este link: <br/> ${inviteLink}</p>
        `;
    }

    return {
        subject: replacePlaceholders(subject, replacementData),
        html: replacePlaceholders(getBaseLayout(bodyContent, settings), replacementData)
    };
}

/**
 * Template de Confirmação de Cadastro
 */
export function getConfirmationEmailTemplate(confirmLink: string, tenantName: string, settings?: EmailSettings, data: Record<string, string> = {}) {
    const customText = settings?.templates?.confirmation?.body;
    const subject = settings?.templates?.confirmation?.subject || `Confirme seu cadastro na ${tenantName}`;

    let bodyContent = '';
    
    const replacementData = {
        link: confirmLink,
        tenantName: tenantName,
        empresa: tenantName,
        ...data
    };

    if (customText) {
        bodyContent = replacePlaceholders(markdownToEmailHtml(customText, settings), replacementData);
    } else {
        bodyContent = `
            <h2 style="margin-top: 0;">Bem-vindo(a)!</h2>
            <p>Ficamos felizes em ter você na equipe da <strong>${tenantName}</strong>.</p>
            <p>Por favor, confirme seu e-mail clicando no botão abaixo para ativar sua conta:</p>
            <a href="${confirmLink}" class="button">Confirmar E-mail</a>
            <p style="color: #666; font-size: 13px;">Se o botão não funcionar, copie este link: <br/> ${confirmLink}</p>
        `;
    }

    return {
        subject: replacePlaceholders(subject, replacementData),
        html: replacePlaceholders(getBaseLayout(bodyContent, settings), replacementData)
    };
}

/**
 * Template de Suspensão de Acesso
 */
export function getSuspensionEmailTemplate(tenantName: string, settings?: EmailSettings, data: Record<string, string> = {}) {
    const customText = settings?.templates?.suspension?.body;
    const subject = settings?.templates?.suspension?.subject || `Aviso: Suspensão Temporária de Acesso - ${tenantName}`;

    let bodyContent = '';
    
    const replacementData = {
        tenantName: tenantName,
        empresa: tenantName,
        ...data
    };

    if (customText) {
        bodyContent = replacePlaceholders(markdownToEmailHtml(customText, settings), replacementData);
    } else {
        bodyContent = `
            <h2 style="margin-top: 0; color: #EF4444;">Acesso Suspenso</h2>
            <p>Informamos que o acesso da empresa <strong>${tenantName}</strong> ao CRM LAX foi suspenso temporariamente por decisão administrativa.</p>
            <div style="background: #FFF8F1; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #F59E0B;">
                <p style="margin: 0; color: #B45309; font-size: 14px;"><strong>O que isso significa?</strong></p>
                <ul style="margin: 8px 0 0 0; color: #B45309; font-size: 14px; padding-left: 20px;">
                    <li>O acesso ao painel está pausado.</li>
                    <li>Seus dados e leads permanecem seguros.</li>
                </ul>
            </div>
            <p>Para suporte, entre em contato: <a href="mailto:contato@laxperience.online" style="color: #404F4F; font-weight: bold;">contato@laxperience.online</a></p>
        `;
    }

    return {
        subject: replacePlaceholders(subject, replacementData),
        html: replacePlaceholders(getBaseLayout(bodyContent, settings), replacementData)
    };
}

function getPropertyTypeName(type: string): string {
    switch (type?.toLowerCase()) {
        case 'apartment':
            return 'Apto';
        case 'house':
            return 'Casa';
        case 'land':
            return 'Terreno';
        case 'commercial':
            return 'Loja';
        default:
            return 'Unidade';
    }
}

export function getPropertyEmail(property: any, propertyUrl: string, config: any, settings: any) {
    const displayTitle = config?.title !== false ? property.title : 'Imóvel disponível';
    let displayPrice = config?.price !== false ? `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(property.price || 0)}` : 'Preço sob consulta';
    const displayImages = config?.images?.length > 0 ? config.images : property.images || [];
    const details = { ...(property.details || {}) };
    let tipologiaUnidade = '';
    
    if (config?.selectedUnit) {
        const unit = config.selectedUnit;
        if (unit.area_privativa) {
            details.area_privativa = Number(unit.area_privativa);
        }
        if (unit.area_total) {
            details.area_total = Number(unit.area_total);
        }
        if (unit.garage_number) {
            details.vagas = property.details?.vagas ? parseInt(String(property.details.vagas)) : 1;
            details.vagas_numeracao = unit.garage_number;
        }
        if (unit.hobby_box) {
            details.hobby_box = 'Sim';
            details.hobby_box_numeracao = unit.hobby_box;
        }
        
        const secao = unit.extra_data?.secao || unit.extra_data?.tipologia;
        if (secao) {
            tipologiaUnidade = String(secao);
            const textUpper = tipologiaUnidade.toUpperCase();
            
            let inferredSuites = 0;
            if (textUpper.includes('SUÍTE') || textUpper.includes('SUITES')) {
                const matchSuites = textUpper.match(/(\d+)\s*SUÍTE/i) || textUpper.match(/(\d+)\s*SUITES/i);
                if (matchSuites) inferredSuites = parseInt(matchSuites[1]);
                else if (textUpper.includes('UMA SUÍTE') || textUpper.includes('1 SUÍTE')) inferredSuites = 1;
            }
            if (inferredSuites > 0) details.suites = inferredSuites;
            
            let inferredDorms = 0;
            if (textUpper.includes('DORMITÓRIO') || textUpper.includes('DORMITORIOS') || textUpper.includes('QUARTO')) {
                const matchDorms = textUpper.match(/(\d+)\s*DORMITÓRIO/i) || textUpper.match(/(\d+)\s*DORMITORIOS/i) || textUpper.match(/(\d+)\s*QUARTO/i);
                if (matchDorms) inferredDorms = parseInt(matchDorms[1]);
                else if (textUpper.includes('UM DORMITÓRIO') || textUpper.includes('1 DORMITÓRIO')) inferredDorms = 1;
            } else if (inferredSuites > 0) {
                inferredDorms = inferredSuites;
            }
            
            if (inferredDorms > 0) {
                details.dormitorios = inferredDorms;
                details.quartos = inferredDorms;
            }
            
            if (textUpper.includes('LAVABO')) {
                details.has_lavabo = true;
            }
        }
    }

    if (config?.showCondo !== false && details.valor_condominio) {
        const val = details.valor_condominio;
        const condoNum = parseFloat(String(val));
        const formattedCondo = (!isNaN(condoNum) && condoNum > 0) ? `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(condoNum)}` : val;
        displayPrice += ` <span style="font-size: 14px; font-weight: normal; color: #666;">| Condomínio: ${formattedCondo}</span>`;
    }
    if (config?.showIptu !== false && details.valor_iptu) {
        const val = details.valor_iptu;
        const iptuNum = parseFloat(String(val));
        const formattedIptu = (!isNaN(iptuNum) && iptuNum > 0) ? `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(iptuNum)}` : val;
        displayPrice += ` <span style="font-size: 14px; font-weight: normal; color: #666;">| IPTU: ${formattedIptu}</span>`;
    }

    const bodyContent = `
        <div style="margin-bottom: 24px; border-radius: 12px; overflow: hidden; background: #f9f9f9;">
            ${displayImages[0] ? `<img src="${displayImages[0]}" style="width: 100%; height: 300px; object-fit: cover;" />` : ''}
        </div>

        <h1 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 24px; font-weight: 800;">${displayTitle}</h1>
        ${config?.selectedUnit ? `
            <p style="margin: -4px 0 12px 0; font-size: 16px; color: #666;">
                <strong>${getPropertyTypeName(property.type)}:</strong> ${config.selectedUnit.unit_number} ${config.selectedUnit.block_tower ? ` | Bloco/Torre: ${config.selectedUnit.block_tower}` : ''} ${config.selectedUnit.floor ? ` | ${config.selectedUnit.floor}º Andar` : ''}
            </p>
        ` : ''}
        <p style="font-size: 20px; font-weight: bold; color: ${settings.highlight_color || '#000'}; margin: 0 0 24px 0;">
            ${displayPrice}
        </p>

        ${config?.description === 'full' && property.description ? `
            <div style="margin-bottom: 24px;">
                <h2 style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px 0; font-weight: 800;">Descrição</h2>
                <p style="color: #444; line-height: 1.6; white-space: pre-wrap; font-size: 15px;">${property.description}</p>
            </div>
        ` : ''}

        ${config?.details !== 'none' ? `
            <div style="margin-bottom: 24px;">
                <h2 style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px 0; font-weight: 800;">Detalhes do Imóvel</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    ${tipologiaUnidade ? `<p style="margin: 0; color: #444; font-size: 14px; grid-column: span 2;">• Tipologia: <strong>${tipologiaUnidade}</strong></p>` : ''}
                    ${(config?.showBedrooms !== false && (details.dormitorios || details.quartos)) ? `<p style="margin: 0; color: #444; font-size: 14px;">• <strong>${details.dormitorios || details.quartos}</strong> Dormitórios</p>` : ''}
                    ${(config?.showSuites !== false && details.suites) ? `<p style="margin: 0; color: #444; font-size: 14px;">• <strong>${details.suites}</strong> Suítes</p>` : ''}
                    ${(details.banheiros && parseInt(String(details.banheiros)) > 0) ? `<p style="margin: 0; color: #444; font-size: 14px;">• <strong>${details.banheiros}</strong> Banheiro${parseInt(String(details.banheiros)) > 1 ? 's' : ''}</p>` : ''}
                    ${(config?.showVagas !== false && (details.vagas_numeracao || (details.vagas && parseInt(String(details.vagas)) > 0))) ? `<p style="margin: 0; color: #444; font-size: 14px;">• Vaga: <strong>${details.vagas_numeracao || details.vagas}</strong></p>` : ''}
                    ${(config?.showSacada !== false && details.has_sacada_com_churrasqueira) ? `<p style="margin: 0; color: #444; font-size: 14px;">• Sacada com churrasqueira</p>` : ''}
                    ${(config?.showSacada !== false && !details.has_sacada_com_churrasqueira && details.has_sacada_sem_churrasqueira) ? `<p style="margin: 0; color: #444; font-size: 14px;">• Sacada</p>` : ''}
                    ${(config?.showEscritorio !== false && details.has_escritorio) ? `<p style="margin: 0; color: #444; font-size: 14px;">• Escritório</p>` : ''}
                    ${(config?.showDependencia !== false && details.has_dependencia_empregada) ? `<p style="margin: 0; color: #444; font-size: 14px;">• Dependência de empregada</p>` : ''}
                    ${(config?.showHobbyBox !== false && (details.hobby_box_numeracao || details.hobby_box)) ? `<p style="margin: 0; color: #444; font-size: 14px;">• Hobby Box: <strong>${details.hobby_box_numeracao || (details.hobby_box !== 'Sim' ? details.hobby_box : 'Sim')}</strong></p>` : ''}
                    ${(config?.showAreaPrivativa !== false && details.area_privativa) ? `<p style="margin: 0; color: #444; font-size: 14px;">• <strong>${details.area_privativa}m²</strong> privativos</p>` : ''}
                    ${(config?.showAreaTotal !== false && details.area_total && parseFloat(String(details.area_total)) > 0) ? `<p style="margin: 0; color: #444; font-size: 14px;">• <strong>${details.area_total}m²</strong> totais</p>` : ''}
                    ${(config?.showObservations !== false && details.obs_dormitorios) ? `<p style="margin: 0; color: #444; font-size: 14px;">• Obs: <strong>${details.obs_dormitorios}</strong></p>` : ''}
                </div>
            </div>
        ` : ''}

        ${(config?.price !== false || config?.selectedUnit) ? `
            <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
                <h2 style="font-size: 14px; color: #404F4F; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px 0; font-weight: 800;">Valor</h2>
                ${config?.selectedUnit ? `
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: ${settings.highlight_color || '#404F4F'};">
                        Valor da Unidade: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(config.selectedUnit.valor_total || 0))}
                    </p>
                    ${(config.selectedUnit.valor_ato || config.selectedUnit.valor_mensais || config.selectedUnit.valor_reforcos || config.selectedUnit.valor_chaves || config.selectedUnit.soma_poupanca || config.selectedUnit.valor_financiamento) ? `
                        <h3 style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin: 12px 0 8px 0; font-weight: 700;">Condições de Pagamento</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #4b5563;">
                            ${config.selectedUnit.valor_ato ? `<p style="margin: 0;">• Ato: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(config.selectedUnit.valor_ato))}</p>` : ''}
                            ${config.selectedUnit.valor_mensais ? `<p style="margin: 0;">• Mensais: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(config.selectedUnit.valor_mensais))}</p>` : ''}
                            ${config.selectedUnit.valor_reforcos ? `<p style="margin: 0;">• Reforços: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(config.selectedUnit.valor_reforcos))}</p>` : ''}
                            ${config.selectedUnit.valor_chaves ? `<p style="margin: 0;">• Chaves: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(config.selectedUnit.valor_chaves))}</p>` : ''}
                            ${config.selectedUnit.soma_poupanca ? `<p style="margin: 0;">• Valor até a entrega: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(config.selectedUnit.soma_poupanca))}</p>` : ''}
                            ${config.selectedUnit.valor_financiamento ? `<p style="margin: 0;">• Saldo pós-entrega / Financiamento construtora: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(config.selectedUnit.valor_financiamento))}</p>` : ''}
                        </div>
                    ` : ''}
                ` : `
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${settings.highlight_color || '#404F4F'};">
                        Imóvel: R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(property.price || 0)}
                    </p>
                `}
                
                ${(config?.showCondo !== false && details.valor_condominio) ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">• <strong>Condomínio:</strong> R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(String(details.valor_condominio)))}</p>` : ''}
                ${(config?.showIptu !== false && details.valor_iptu) ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #666;">• <strong>IPTU:</strong> R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(String(details.valor_iptu)))}</p>` : ''}
            </div>
        ` : ''}

        ${config?.location !== 'none' ? `
            <div style="margin-bottom: 32px;">
                <h2 style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px 0; font-weight: 800;">Localização</h2>
                <p style="color: #444; margin: 0; font-size: 14px;">
                    ${config?.location === 'exact' 
                        ? `${details.endereco?.rua || ''}, ${details.endereco?.numero || ''} - ${details.endereco?.bairro || ''}, ${details.endereco?.cidade || ''}`
                        : `${details.endereco?.bairro || ''}, ${details.endereco?.cidade || ''}`
                    }
                </p>
            </div>
        ` : ''}

        <div style="text-align: center; margin: 32px 0;">
            <a href="${propertyUrl}" style="background-color: ${settings.highlight_color || '#000'}; color: #fff; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                Ver ficha completa no site
            </a>
        </div>
    `;

    return {
        subject: `Confira este imóvel: ${displayTitle}`,
        html: getBaseLayout(bodyContent, settings)
    };
}
