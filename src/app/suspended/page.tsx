import { AlertCircle, Lock } from 'lucide-react'
import Link from 'next/link'

export default function SuspendedPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Acesso Suspenso</h1>
                    <p className="text-muted-foreground text-sm">
                        Detectamos uma pendência na assinatura desta empresa. O acesso ao painel administrativo e serviços do CRM foi temporariamente bloqueado.
                    </p>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 text-left space-y-3">
                    <div className="flex items-start gap-3">
                        <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-foreground">Como resolver?</p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                                O administrador da conta deve verificar o status do pagamento ou entrar em contato com o suporte da plataforma.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 space-y-3">
                    <a 
                        href="https://wa.me/5511999999999" // TODO: Substituir por suporte real se disponível
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-sm active:scale-[0.98]"
                    >
                        Falar com Suporte
                    </a>
                    
                    <Link 
                        href="/login"
                        className="block w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Voltar para Login
                    </Link>
                </div>

                <p className="text-[10px] text-muted-foreground pt-4 border-t border-border">
                    ID da Transação: {Math.random().toString(36).substring(7).toUpperCase()}
                </p>
            </div>
        </div>
    )
}
