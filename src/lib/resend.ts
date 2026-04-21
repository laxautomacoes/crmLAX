import { sendBaseEmail } from './emails/client';
import { 
    getInvitationEmailTemplate, 
    getConfirmationEmailTemplate, 
    getSuspensionEmailTemplate,
    EmailSettings
} from './emails/templates';

/**
 * Envia um e-mail de convite para um novo colaborador
 * @param email Destinatário
 * @param inviteLink Link de registro
 * @param tenantName Nome da imobiliária
 * @param settings Configurações personalizadas (opcional)
 * @param data Dados adicionais para variáveis (ex: {{nome}})
 */
export async function sendInvitationEmail(
    email: string, 
    inviteLink: string, 
    tenantName: string, 
    settings?: EmailSettings,
    data: Record<string, string> = {}
) {
    const { subject, html } = getInvitationEmailTemplate(inviteLink, tenantName, settings, { email, ...data });
    return sendBaseEmail({
        to: email,
        subject,
        html,
        fromName: tenantName
    });
}

/**
 * Envia um e-mail de confirmação de cadastro
 */
export async function sendConfirmationEmail(
    email: string, 
    confirmLink: string, 
    tenantName: string,
    settings?: EmailSettings,
    data: Record<string, string> = {}
) {
    const { subject, html } = getConfirmationEmailTemplate(confirmLink, tenantName, settings, { email, ...data });
    return sendBaseEmail({
        to: email,
        subject,
        html,
        fromName: tenantName
    });
}

/**
 * Envia um e-mail de aviso de suspensão
 */
export async function sendSuspensionEmail(
    email: string, 
    tenantName: string,
    settings?: EmailSettings,
    data: Record<string, string> = {}
) {
    const { subject, html } = getSuspensionEmailTemplate(tenantName, settings, data);
    return sendBaseEmail({
        to: email,
        subject,
        html,
        fromName: 'CRM LAX'
    });
}
