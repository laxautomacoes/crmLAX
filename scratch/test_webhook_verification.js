// Simulação do teste de desafio da Meta
const VERIFY_TOKEN = 'crmlax_secret_token';
const mockParams = {
    'hub.mode': 'subscribe',
    'hub.verify_token': 'crmlax_secret_token',
    'hub.challenge': '123456789'
};

function verify(mode, token, challenge) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return { status: 200, body: challenge };
    }
    return { status: 403, body: 'Verification failed' };
}

const result = verify(mockParams['hub.mode'], mockParams['hub.verify_token'], mockParams['hub.challenge']);
console.log('Resultado do Teste (Sucesso):', result);

const failResult = verify('subscribe', 'wrong_token', '123');
console.log('Resultado do Teste (Falha):', failResult);
