import { redirect } from 'next/navigation';

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MarketingPage({ searchParams }: Props) {
    const params = await searchParams;
    const queryString = new URLSearchParams(params as any).toString();
    redirect(`/marketing/studio${queryString ? `?${queryString}` : ''}`);
}
