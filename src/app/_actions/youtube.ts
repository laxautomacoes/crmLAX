'use server';

import { createClient } from '@/lib/supabase/server';
import { getValidGoogleToken } from '@/lib/auth/google-auth';

interface YouTubeUploadParams {
    tenantId: string;
    propertyId: string;
    videoUrl: string;
    title: string;
    description: string;
    privacyStatus?: 'private' | 'public' | 'unlisted';
}

/**
 * Realiza o upload de um vídeo para o YouTube como Shorts.
 */
export async function uploadShortToYouTube({
    tenantId,
    propertyId,
    videoUrl,
    title,
    description,
    privacyStatus = 'public'
}: YouTubeUploadParams) {
    try {
        // 1. Obter Token Válido
        const accessToken = await getValidGoogleToken(tenantId);

        // 2. Preparar Metadados
        // Adicionamos #Shorts para ajudar no ranqueamento do YouTube
        const metadata = {
            snippet: {
                title: title.includes('#Shorts') ? title : `${title} #Shorts`,
                description: `${description}\n\n#Shorts #Properties #CRM`,
                categoryId: '22' // People & Blogs
            },
            status: {
                privacyStatus: privacyStatus,
                selfDeclaredMadeForKids: false
            }
        };

        // 3. Iniciar Upload Resumable
        const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': 'video/*',
            },
            body: JSON.stringify(metadata)
        });

        if (!initResponse.ok) {
            const errorData = await initResponse.json();
            throw new Error(`Erro ao iniciar upload: ${errorData.error?.message || 'Erro desconhecido'}`);
        }

        const uploadUrl = initResponse.headers.get('location');
        if (!uploadUrl) throw new Error('Não foi possível obter a URL de upload do Google.');

        // 4. Baixar o vídeo do Supabase Storage e enviar para o YouTube
        const videoFileResponse = await fetch(videoUrl);
        const videoBlob = await videoFileResponse.blob();

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'video/*',
            },
            body: videoBlob
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(`Erro durante o streaming do vídeo: ${errorData.error?.message || 'Falha no upload'}`);
        }

        const result = await uploadResponse.json();

        // 5. Opcional: Registrar nos logs ou atualizar o property
        const supabase = await createClient();
        await supabase.from('system_logs').insert({
            tenant_id: tenantId,
            action: 'youtube_upload_success',
            entity_type: 'property',
            entity_id: propertyId,
            details: { video_id: result.id, title }
        });

        return { success: true, videoId: result.id };

    } catch (error: any) {
        console.error('YouTube Upload Action Error:', error.message);
        return { success: false, error: error.message };
    }
}
