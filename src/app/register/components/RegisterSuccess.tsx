interface RegisterSuccessProps {
    tenantId?: string;
}

export function RegisterSuccess({ tenantId }: RegisterSuccessProps) {
    return (
        <div className="flex flex-col items-center space-y-4 md:space-y-6 animate-in fade-in zoom-in duration-300">

            <div className="text-center space-y-3 md:space-y-4">
                <h3 className="text-sm md:text-lg font-bold text-foreground whitespace-nowrap">
                    Obrigado por se cadastrar no CRM LAX!
                </h3>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                    Verifique seu e-mail para confirmar o cadastro.
                </p>
            </div>
            <div className="pt-2 md:pt-4 w-full">
                <Link
                    href={`/login${tenantId ? `?tenant=${tenantId}` : ''}`}
                    className="w-full flex justify-center py-3 md:py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-secondary-foreground bg-secondary hover:opacity-90 transition-opacity text-center"
                >
                    Voltar para o Login
                </Link>
            </div>
        </div>
    );
}
