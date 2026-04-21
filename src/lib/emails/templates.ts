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

export function getPropertyEmail(property: any, propertyUrl: string, config: any, settings: any) {
    const displayTitle = config?.title !== false ? property.title : 'Imóvel disponível';
    const displayPrice = config?.price !== false ? `R$ ${new Intl.NumberFormat('pt-BR').format(property.price || 0)}` : 'Preço sob consulta';
    const displayImages = config?.images?.length > 0 ? config.images : property.images || [];
    const details = property.details || {};

    const bodyContent = `
        <div style="margin-bottom: 24px; border-radius: 12px; overflow: hidden; background: #f9f9f9;">
            ${displayImages[0] ? `<img src="${displayImages[0]}" style="width: 100%; height: 300px; object-fit: cover;" />` : ''}
        </div>

        <h1 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 24px; font-weight: 800;">${displayTitle}</h1>
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
                    ${(config?.showBedrooms !== false && (details.dormitorios || details.quartos)) ? `<p style="margin: 0; color: #444; font-size: 14px;">• <strong>${details.dormitorios || details.quartos}</strong> Dormitórios</p>` : ''}
                    ${(config?.showSuites !== false && details.suites) ? `<p style="margin: 0; color: #444; font-size: 14px;">• <strong>${details.suites}</strong> Suítes</p>` : ''}
                    ${(config?.showArea !== false && details.area_privativa) ? `<p style="margin: 0; color: #444; font-size: 14px;">• <strong>${details.area_privativa}m²</strong> privativos</p>` : ''}
                    ${config?.showType !== false ? `<p style="margin: 0; color: #444; font-size: 14px;">• Tipo: <strong>${property.type}</strong></p>` : ''}
                </div>
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
