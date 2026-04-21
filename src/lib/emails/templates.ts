/**
 * Interface para os dados de configuração de e-mail do Tenant
 */
export interface EmailSettings {
    logo_url?: string;
    primary_color?: string;
    signature_html?: string;
    footer_text?: string;
    templates?: Record<string, { subject?: string; body?: string }>;
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
export function markdownToEmailHtml(md: string): string {
    if (!md) return '';
    
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
        .replace(/\[(.*?)\]\((.*?)\)#button/g, '<div style="text-align: center; margin: 24px 0;"><a href="$2" class="button">$1</a></div>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: #3b82f6; text-decoration: underline;">$1</a>')
        // Color
        .replace(/<color:\s*([^>]+?)\s*>(.*?)<\/color>/g, '<span style="color: $1">$2</span>')
        // Lists (Basic)
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
        // Line breaks
        .replace(/\n/g, '<br>');

    // Envolver listas
    html = html.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');

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
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; color: ${textColor}; }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .card { background: #ffffff; border-radius: 16px; border: 1px solid #f0f0f0; padding: 40px; }
                .button { background-color: ${primaryColor}; color: #000000 !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 24px 0; }
                .footer { margin-top: 32px; text-align: center; color: #999; font-size: 12px; }
                .signature { margin-top: 32px; padding-top: 24px; font-size: 14px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    ${logoHtml}
                    ${content}
                    ${settings?.signature_html ? `<div class="signature">${markdownToEmailHtml(settings.signature_html)}</div>` : ''}
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
export function getInvitationEmailTemplate(inviteLink: string, tenantName: string, settings?: EmailSettings) {
    const customText = settings?.templates?.invitation?.body;
    const subject = settings?.templates?.invitation?.subject || `Você foi convidado para participar da ${tenantName}`;

    let bodyContent = '';
    
    if (customText) {
        bodyContent = replacePlaceholders(markdownToEmailHtml(customText), {
            link: inviteLink,
            tenantName: tenantName
        });
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
        subject,
        html: getBaseLayout(bodyContent, settings)
    };
}

/**
 * Template de Confirmação de Cadastro
 */
export function getConfirmationEmailTemplate(confirmLink: string, tenantName: string, settings?: EmailSettings) {
    const customText = settings?.templates?.confirmation?.body;
    const subject = settings?.templates?.confirmation?.subject || `Confirme seu cadastro na ${tenantName}`;

    let bodyContent = '';
    
    if (customText) {
        bodyContent = replacePlaceholders(markdownToEmailHtml(customText), {
            link: confirmLink,
            tenantName: tenantName
        });
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
        subject,
        html: getBaseLayout(bodyContent, settings)
    };
}

/**
 * Template de Suspensão de Acesso
 */
export function getSuspensionEmailTemplate(tenantName: string, settings?: EmailSettings) {
    const customText = settings?.templates?.suspension?.body;
    const subject = settings?.templates?.suspension?.subject || `Aviso: Suspensão Temporária de Acesso - ${tenantName}`;

    let bodyContent = '';
    
    if (customText) {
        bodyContent = replacePlaceholders(markdownToEmailHtml(customText), {
            tenantName: tenantName
        });
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
        subject,
        html: getBaseLayout(bodyContent, settings)
    };
}
