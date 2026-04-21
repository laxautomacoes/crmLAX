import { Resend } from 'resend';

/**
 * Interface base para resposta de envio de e-mail
 */
export interface EmailResponse {
    data?: any;
    error?: any;
}

/**
 * Obtém a instância do cliente Resend
 */
export function getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('RESEND_API_KEY is not set.');
        return null;
    }
    return new Resend(apiKey);
}

/**
 * Extrai o endereço de e-mail limpo de uma string que pode conter nome (ex: "Nome <email@dominio.com>")
 */
export function getCleanEmailAddress(emailEnv: string | undefined): string {
    const defaultEmail = 'noreply@laxperience.online';
    if (!emailEnv) return defaultEmail;
    
    if (emailEnv.includes('<')) {
        return emailEnv.split('<')[1].replace('>', '').trim();
    }
    
    return emailEnv.trim() || defaultEmail;
}

/**
 * Função base para envio de e-mail centralizando logs e tratamentos
 */
export async function sendBaseEmail(params: {
    to: string;
    subject: string;
    html: string;
    fromName?: string;
    fromEmail?: string;
}): Promise<EmailResponse> {
    const resend = getResendClient();
    if (!resend) {
        return { error: 'RESEND_API_KEY is not set. Email not sent.' };
    }

    try {
        const defaultFrom = getCleanEmailAddress(process.env.RESEND_FROM_EMAIL);
        const emailAddress = params.fromEmail || defaultFrom;
        
        const from = params.fromName 
            ? `"${params.fromName}" <${emailAddress}>`
            : `CRM LAX <${emailAddress}>`;
        
        console.log(`Enviando e-mail para ${params.to} (Assunto: ${params.subject}) via ${emailAddress}...`);
        
        const { data, error } = await resend.emails.send({
            from: from,
            to: [params.to],
            subject: params.subject,
            html: params.html,
        });

        if (error) {
            console.error('Resend Error:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Resend Exception:', error);
        return { error };
    }
}
