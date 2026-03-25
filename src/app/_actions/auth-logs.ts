'use server';

import { createLog } from '@/lib/utils/logging';

/**
 * Registra um log de acesso (login ou logout).
 * Chamado a partir de componentes ou fluxos de autenticação.
 */
export async function recordAccessLog(action: 'login' | 'logout') {
    return await createLog({
        action: action,
        entityType: 'auth',
        details: {
            message: `Usuário realizou ${action === 'login' ? 'entrada' : 'saída'} no sistema.`
        }
    });
}
