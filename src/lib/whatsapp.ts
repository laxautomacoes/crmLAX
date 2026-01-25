export async function sendInvitationWhatsApp(phone: string, inviteLink: string, tenantName: string) {
    if (!process.env.WHATSAPP_API_URL) {
        console.warn('WHATSAPP_API_URL is not set. WhatsApp message not sent.');
        return;
    }

    try {
        const message = `Olá! Você foi convidado para participar da equipe ${tenantName} no CRM LAX. \n\nAcesse o link para entrar: ${inviteLink}`;

        // Clean phone number (remove non-digits)
        const cleanPhone = phone.replace(/\D/g, '');

        const response = await fetch(process.env.WHATSAPP_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.WHATSAPP_API_KEY ? { 'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}` } : {})
            },
            body: JSON.stringify({
                number: cleanPhone,
                message: message,
                type: 'text'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Error sending WhatsApp:', error);
            return { error };
        }

        return { success: true };
    } catch (error) {
        console.error('Exception sending WhatsApp:', error);
        return { error };
    }
}
