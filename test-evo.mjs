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
    
    const instanceName = 'leoacostaimoveis';
    
    try {
        console.log("Testing sendMedia payload V2 format...");
        const res2 = await fetch(`${baseUrl}/message/sendMedia/${instanceName}`, {
            method: 'POST',
            headers: { 'apikey': apikey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: "5511999999999",
                options: { delay: 1200, presence: 'composing' },
                mediatype: "image",
                media: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
                caption: "Teste"
            })
        });
        console.log("Status Media:", res2.status);
        console.log("Response Media:", await res2.text());

    } catch(e) {
        console.error(e.message);
    }
}
check();
