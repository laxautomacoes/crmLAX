import { openDB, DBSchema } from 'idb';

interface OfflineDB extends DBSchema {
    properties: {
        key: string;
        value: any; // Armazenaremos o objeto inteiro do imóvel
    };
    sync_metadata: {
        key: string;
        value: {
            key: string;
            lastSync: number;
        };
    };
}

const DB_NAME = 'crm-lax-offline';
const DB_VERSION = 1;

export const initDB = async () => {
    return openDB<OfflineDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('properties')) {
                db.createObjectStore('properties', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('sync_metadata')) {
                db.createObjectStore('sync_metadata', { keyPath: 'key' });
            }
        },
    });
};

export const savePropertiesToOffline = async (properties: any[]) => {
    const db = await initDB();
    const tx = db.transaction('properties', 'readwrite');
    const store = tx.objectStore('properties');

    // Limpar dados antigos? Ou update?
    // Por simplicidade, vamos limpar e adicionar novos por enquanto, 
    // mas idealmente faríamos um 'put' em cada um.
    // await store.clear(); 

    for (const prop of properties) {
        await store.put(prop);
    }

    await tx.done;

    // Atualizar timestamp
    await db.put('sync_metadata', { key: 'properties_sync', lastSync: Date.now() });
};

export const getOfflineProperties = async () => {
    const db = await initDB();
    return db.getAll('properties');
};

export const getLastSyncTime = async () => {
    const db = await initDB();
    const meta = await db.get('sync_metadata', 'properties_sync');
    return meta?.lastSync || null;
};
