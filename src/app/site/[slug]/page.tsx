export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1 className="text-4xl font-bold">Vitrine da Loja: {slug}</h1>
            <p className="mt-4 text-xl">Bem-vindo ao site da sua revenda de veículos.</p>
        </div>
    );
}
