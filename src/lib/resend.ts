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

export async function sendSuspensionEmail(email: string, tenantName: string) {
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

        const fromEmail = `CRM LAX <${emailAddress}>`;
        
        console.log(`Enviando e-mail de suspensão para ${email} (Remetente: ${fromEmail})...`);
        
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: `Aviso: Suspensão Temporária de Acesso - ${tenantName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
                    <h2 style="color: #1a1a1a; margin-top: 0;">Suspensão Temporária de Acesso</h2>
                    <p style="color: #444; line-height: 1.6;">Olá,</p>
                    <p style="color: #444; line-height: 1.6;">Estamos entrando em contato para informar que o acesso da empresa <strong>${tenantName}</strong> ao CRM LAX foi suspenso temporariamente por decisão administrativa.</p>
                    <div style="background: #fff8e1; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffb300;">
                        <p style="margin: 0; color: #856404; font-size: 14px;"><strong>O que isso significa?</strong></p>
                        <ul style="margin: 8px 0 0 0; color: #856404; font-size: 14px; padding-left: 20px;">
                            <li>O acesso ao painel administrativo e ferramentas está pausado.</li>
                            <li>Seus dados e leads permanecem seguros e guardados.</li>
                            <li>Visitantes de seus sites serão informados sobre a manutenção temporária.</li>
                        </ul>
                    </div>
                    <p style="color: #444; line-height: 1.6;">Para entender os motivos da suspensão ou solicitar a reativação, por favor entre em contato com o suporte através do e-mail: <a href="mailto:contato@laxperience.online" style="color: #404F4F; font-weight: bold;">contato@laxperience.online</a></p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
                    <p style="color: #666; font-size: 12px; text-align: center;">Atenciosamente,<br/>Equipe CRM LAX</p>
                </div>
            `,
        });

        if (error) {
            console.error('Error sending suspension email:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Exception sending suspension email:', error);
        return { error };
    }
}
