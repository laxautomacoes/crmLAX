import { Resend } from 'resend';

export async function sendInvitationEmail(email: string, inviteLink: string, tenantName: string) {
    if (!process.env.RESEND_API_KEY) {
        const error = 'RESEND_API_KEY is not set. Email not sent.';
        console.warn(error);
        return { error };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const defaultEmail = 'noreply@laxperience.online';
        const envEmail = process.env.RESEND_FROM_EMAIL;
        
        // Extrai apenas o e-mail se a env tiver o formato "Nome <email@dominio.com>"
        const emailAddress = envEmail?.includes('<') 
            ? envEmail.split('<')[1].replace('>', '').trim() 
            : envEmail || defaultEmail;

        const fromEmail = `"${tenantName}" <${emailAddress}>`;
        
        console.log(`Enviando e-mail para ${email} através do Resend (Remetente: ${fromEmail})...`);
        
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: `Convite para participar da ${tenantName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Você foi convidado!</h2>
                    <p>Você foi convidado para colaborar na equipe da <strong>${tenantName}</strong> no CRM LAX.</p>
                    <p>Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
                    <br/>
                    <a href="${inviteLink}" style="background-color: #FFE600; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Aceitar Convite
                    </a>
                    <br/><br/>
                    <p style="color: #666; font-size: 14px;">Ou cole este link no seu navegador: <br/> ${inviteLink}</p>
                </div>
            `,
        });

        if (error) {
            console.error('Error sending email:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Exception sending email:', error);
        return { error };
    }
}

export async function sendConfirmationEmail(email: string, confirmLink: string, tenantName: string) {
    if (!process.env.RESEND_API_KEY) {
        const error = 'RESEND_API_KEY is not set. Email not sent.';
        console.warn(error);
        return { error };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const defaultEmail = 'noreply@laxperience.online';
        const envEmail = process.env.RESEND_FROM_EMAIL;
        
        const emailAddress = envEmail?.includes('<') 
            ? envEmail.split('<')[1].replace('>', '').trim() 
            : envEmail || defaultEmail;

        const fromEmail = `"${tenantName}" <${emailAddress}>`;
        
        console.log(`Enviando e-mail de confirmação para ${email} (Remetente: ${fromEmail})...`);
        
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: `Confirme seu cadastro na ${tenantName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Bem-vindo(a)!</h2>
                    <p>Ficamos felizes em ter você na equipe da <strong>${tenantName}</strong>.</p>
                    <p>Por favor, confirme seu e-mail clicando no botão abaixo para ativar sua conta no CRM LAX:</p>
                    <br/>
                    <a href="${confirmLink}" style="background-color: #FFE600; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Confirmar E-mail
                    </a>
                    <br/><br/>
                    <p style="color: #666; font-size: 14px;">Ou cole este link no seu navegador: <br/> ${confirmLink}</p>
                </div>
            `,
        });

        if (error) {
            console.error('Error sending confirmation email:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Exception sending confirmation email:', error);
        return { error };
    }
}
