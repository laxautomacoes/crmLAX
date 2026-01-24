'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Unhandled runtime error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
            <div className="bg-destructive/10 p-6 rounded-full mb-6">
                <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Ops! Algo deu errado</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                Ocorreu um erro inesperado na aplicação. Isso pode ser devido a uma falha temporária ou um problema de configuração (verifique se as variáveis do Supabase estão configuradas no Vercel).
            </p>
            
            {process.env.NODE_ENV === 'development' && (
                <div className="bg-muted p-4 rounded-md mb-8 max-w-2xl overflow-auto text-left">
                    <p className="font-mono text-sm text-destructive">{error.message}</p>
                    {error.stack && (
                        <pre className="font-mono text-[10px] text-muted-foreground mt-2 leading-tight">
                            {error.stack}
                        </pre>
                    )}
                </div>
            )}

            <div className="flex gap-4">
                <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                    Atualizar Página
                </button>
                <button 
                    onClick={() => reset()} 
                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center gap-2 transition-colors"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Tentar Novamente
                </button>
            </div>
        </div>
    );
}
