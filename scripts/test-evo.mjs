import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if(match) env[match[1]] = match[2].trim().replace(/['"]/g, '');
});

async function check() {
    const url = env['EVOLUTION_URL'];
    const apikey = env['EVOLUTION_GLOBAL_API_KEY'];
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    const instanceName = 'loacostaimveisadm';
    
    try {
        console.log("Testing sendMedia payload V2 format...");
        const res2 = await fetch(`${baseUrl}/message/sendMedia/${instanceName}`, {
            method: 'POST',
            headers: { 'apikey': apikey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: "554888231720",
                options: { delay: 1200, presence: 'composing' },
                mediatype: "image",
                media: "https://vkrpmxratnkywywqoecv.supabase.co/storage/v1/object/public/crm-attachments/bulk-media/0.7809367847179487.jpg",
                caption: "Teste Mídia Supabase"
            })
        });
        console.log("Status Media:", res2.status);
        console.log("Response Media:", await res2.text());

        /*
        console.log("Testing sendText payload V2 format...");
        const resText = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: { 'apikey': apikey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: "554888231720",
                options: { delay: 1200, presence: 'composing' },
                text: "Teste de Texto Puro",
                textMessage: { text: "Teste de Texto Puro" }
            })
        });
        console.log("Status Text:", resText.status);
        console.log("Response Text:", await resText.text());
        */

    } catch(e) {
        console.error(e.message);
    }
}
check();
