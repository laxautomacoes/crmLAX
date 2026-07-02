'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[GlobalError] Unhandled error:', error);
    }, [error]);

    return (
        <html>
            <body>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    minHeight: '100vh',
                    fontFamily: 'system-ui, sans-serif',
                    padding: '2rem',
                    textAlign: 'center',
                    backgroundColor: '#0a0a0a',
                    color: '#ffffff'
                }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                        Ops! Algo deu errado
                    </h1>
                    <p style={{ color: '#999', marginBottom: '2rem', maxWidth: '400px' }}>
                        Ocorreu um erro inesperado na aplicação.
                    </p>
                    {process.env.NODE_ENV === 'development' && (
                        <pre style={{ 
                            background: '#1a1a1a', 
                            padding: '1rem', 
                            borderRadius: '4px', 
                            fontSize: '12px', 
                            maxWidth: '600px', 
                            overflow: 'auto',
                            marginBottom: '2rem',
                            color: '#ff6b6b',
                            textAlign: 'left'
                        }}>
                            {error.message}
                            {'\n'}
                            {error.stack}
                        </pre>
                    )}
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '0.75rem 2rem',
                            backgroundColor: '#FFE600',
                            color: '#404F4F',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Tentar Novamente
                    </button>
                </div>
            </body>
        </html>
    );
}
