import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
            <div className="bg-primary/10 p-6 rounded-full mb-6">
                <Home className="h-12 w-12 text-primary" />
            </div>
            
            <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
            <h2 className="text-xl font-semibold text-foreground mb-2">Página não encontrada</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
                A página que você está procurando não existe ou foi movida.
                Verifique o endereço e tente novamente.
            </p>
            
            <Link 
                href="/dashboard"
                className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard
            </Link>
        </div>
    )
}
