import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail(email: string, inviteLink: string, tenantName: string) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not set. Email not sent.');
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'CRM LAX <onboarding@resend.dev>', // Update this with your verified domain
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
