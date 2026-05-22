/**
 * Auxiliar para verificar se o ambiente atual é desenvolvimento ou localhost.
 */
export function checkIsDev(): boolean {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.endsWith('.local');
    }
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    return process.env.NODE_ENV === 'development' || rootDomain.includes('localhost');
}

/**
 * Obtém dinamicamente o domínio raiz do sistema de forma segura.
 */
export function getRootDomain(): string {
    const envDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    
    if (typeof window === 'undefined') {
        if (envDomain && !envDomain.includes('localhost')) {
            return envDomain;
        }
        return 'laxperience.online';
    }

    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.endsWith('.local');

    if (isLocal) {
        return envDomain || 'localhost:3000';
    }

    // Se estiver rodando sob crm.leoacosta.online ou qualquer subdomínio de leoacosta.online
    if (hostname.endsWith('leoacosta.online')) {
        return 'leoacosta.online';
    }
    // Se estiver rodando sob crm.laxperience.online ou qualquer subdomínio de laxperience.online
    if (hostname.endsWith('laxperience.online')) {
        return 'laxperience.online';
    }

    // Fallback genérico para crm.*
    if (hostname.startsWith('crm.')) {
        return hostname.substring(4);
    }

    if (envDomain && !envDomain.includes('localhost')) {
        return envDomain;
    }

    // Fallback final: extrai a partir das últimas partes do hostname
    const parts = hostname.split('.');
    if (parts.length > 2) {
        return parts.slice(1).join('.');
    }

    return hostname;
}
