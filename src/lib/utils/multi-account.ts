import { Session } from '@supabase/supabase-js';

export interface StoredAccount {
    email: string;
    name: string;
    avatar_url: string | null;
    role: string | null;
    session: Session;
    tenant_id: string | null;
}

const STORAGE_KEY = 'crmlax-logged-accounts';

export function getStoredAccounts(): StoredAccount[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

export function saveAccount(account: StoredAccount) {
    if (typeof window === 'undefined') return;
    const accounts = getStoredAccounts();
    const existingIndex = accounts.findIndex(a => a.email === account.email);
    
    if (existingIndex > -1) {
        accounts[existingIndex] = account;
    } else {
        accounts.push(account);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function removeAccount(email: string) {
    if (typeof window === 'undefined') return;
    const accounts = getStoredAccounts().filter(a => a.email !== email);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function clearAccounts() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}
