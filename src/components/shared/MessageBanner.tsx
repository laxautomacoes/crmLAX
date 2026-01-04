interface MessageBannerProps {
    type: 'success' | 'error';
    text: string;
}

export function MessageBanner({ type, text }: MessageBannerProps) {
    return (
        <div
            className={`px-4 py-2 rounded-lg text-xs font-medium text-center border animate-in fade-in duration-300 ${
                type === 'success'
                    ? 'bg-green-500/10 border-green-500/20 text-green-600'
                    : 'bg-red-500/10 border-red-500/20 text-red-600'
            }`}
        >
            {text}
        </div>
    );
}

