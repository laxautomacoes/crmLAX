'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Busca credenciais de integração da Meta (Instagram/Facebook)
 */
async function getMetaCredentials(tenantId: string) {
    const supabase = await createClient();
    const { data: integration, error } = await supabase
        .from('integrations')
        .select('credentials, status')
        .eq('tenant_id', tenantId)
        .eq('provider', 'instagram')
        .single();

    if (error || !integration || integration.status !== 'active') {
        throw new Error('Integração com Instagram não configurada ou inativa.');
    }

    return integration.credentials as {
        access_token: string;
        account_id: string;
        page_id?: string;
    };
}

/**
 * Busca o feed do Instagram usando o Token e Account ID do Tenant.
 */
export async function getInstagramFeed(tenantId: string) {
    try {
        const { access_token, account_id } = await getMetaCredentials(tenantId);

        const url = `https://graph.facebook.com/v21.0/${account_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${access_token}&limit=12`;
        
        const response = await fetch(url, { cache: 'no-store' });
        const data = await response.json();

        if (data.error) {
            console.error('Meta API Error:', data.error);
            return { success: false, error: data.error.message };
        }

        return { success: true, data: data.data || [] };
    } catch (error: any) {
        console.error('Fetch Instagram Feed Error:', error);
        return { success: false, error: error.message || 'Falha ao conectar com Instagram.' };
    }
}

/**
 * Detecta se a URL fornecida aponta para um arquivo de vídeo
 */
function isVideoUrl(url: string): boolean {
    return /\.(mp4|webm|mov|m4v|3gp|avi|mkv)(\?.*)?$/i.test(url) || url.includes('/videos/');
}

interface PublishOptions {
    tenantId: string;
    mediaUrls: string[]; // URLs das imagens/vídeo
    caption: string;
    networks: {
        instagram: boolean;
        facebook: boolean;
    };
}

/**
 * Publica um post (Feed Único, Carrossel, Reels) no Instagram e/ou Página do Facebook
 */
export async function publishSocialPost({ tenantId, mediaUrls, caption, networks }: PublishOptions) {
    if (!mediaUrls || mediaUrls.length === 0) {
        return { success: false, error: 'Nenhuma mídia fornecida.' };
    }

    try {
        const { access_token, account_id, page_id } = await getMetaCredentials(tenantId);
        
        const results = { instagram: false, facebook: false, errors: [] as string[] };

        // 1. PUBLICAR NO INSTAGRAM
        if (networks.instagram) {
            try {
                if (mediaUrls.length === 1) {
                    const isVideo = isVideoUrl(mediaUrls[0]);
                    let containerId = '';

                    if (isVideo) {
                        // POST ÚNICO (Vídeo - Reels)
                        const createRes = await fetch(`https://graph.facebook.com/v21.0/${account_id}/media`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                media_type: 'REELS',
                                video_url: mediaUrls[0],
                                caption: caption,
                                access_token
                            })
                        });
                        const createData = await createRes.json();
                        if (createData.error) throw new Error(`IG Reels Create: ${createData.error.message}`);
                        containerId = createData.id;

                        // Polling para o status do Reels
                        let status = 'IN_PROGRESS';
                        let attempts = 0;
                        const maxAttempts = 10;
                        while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            attempts++;
                            const statusRes = await fetch(`https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${access_token}`);
                            const statusData = await statusRes.json();
                            if (statusData.error) {
                                console.error(`Error checking container status: ${statusData.error.message}`);
                                break;
                            }
                            status = statusData.status_code;
                        }

                        if (status !== 'FINISHED') {
                            throw new Error(`Processamento do vídeo no Instagram demorou muito ou falhou (status: ${status}).`);
                        }
                    } else {
                        // POST ÚNICO (Imagem)
                        const createRes = await fetch(`https://graph.facebook.com/v21.0/${account_id}/media`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                image_url: mediaUrls[0],
                                caption: caption,
                                access_token
                            })
                        });
                        const createData = await createRes.json();
                        if (createData.error) throw new Error(`IG Create: ${createData.error.message}`);
                        containerId = createData.id;
                    }
                    
                    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${account_id}/media_publish`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            creation_id: containerId,
                            access_token
                        })
                    });
                    const publishData = await publishRes.json();
                    if (publishData.error) throw new Error(`IG Publish: ${publishData.error.message}`);
                    
                    results.instagram = true;
                } else {
                    // CARROSSEL (Máximo 10)
                    const carouselUrls = mediaUrls.slice(0, 10);
                    const childIds = [];
                    
                    for (const url of carouselUrls) {
                        const isVideo = isVideoUrl(url);
                        const bodyParams: any = {
                            is_carousel_item: true,
                            access_token
                        };

                        if (isVideo) {
                            bodyParams.media_type = 'VIDEO';
                            bodyParams.video_url = url;
                        } else {
                            bodyParams.image_url = url;
                        }

                        const childRes = await fetch(`https://graph.facebook.com/v21.0/${account_id}/media`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(bodyParams)
                        });
                        const childData = await childRes.json();
                        if (childData.error) throw new Error(`IG Child Create: ${childData.error.message}`);
                        const childId = childData.id;

                        if (isVideo) {
                            // Polling para o vídeo filho
                            let status = 'IN_PROGRESS';
                            let attempts = 0;
                            const maxAttempts = 10;
                            while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                attempts++;
                                const statusRes = await fetch(`https://graph.facebook.com/v21.0/${childId}?fields=status_code&access_token=${access_token}`);
                                const statusData = await statusRes.json();
                                if (statusData.error) break;
                                status = statusData.status_code;
                            }
                            if (status !== 'FINISHED') {
                                throw new Error(`Processamento do vídeo no carrossel falhou ou demorou muito.`);
                            }
                        }
                        childIds.push(childId);
                    }
                    
                    const carouselRes = await fetch(`https://graph.facebook.com/v21.0/${account_id}/media`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            caption: caption,
                            media_type: 'CAROUSEL',
                            children: childIds,
                            access_token
                        })
                    });
                    const carouselData = await carouselRes.json();
                    if (carouselData.error) throw new Error(`IG Carousel Create: ${carouselData.error.message}`);
                    
                    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${account_id}/media_publish`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            creation_id: carouselData.id,
                            access_token
                        })
                    });
                    const publishData = await publishRes.json();
                    if (publishData.error) throw new Error(`IG Carousel Publish: ${publishData.error.message}`);
                    
                    results.instagram = true;
                }
            } catch (igError: any) {
                console.error('Instagram Publish Error:', igError);
                results.errors.push(`Instagram: ${igError.message}`);
            }
        }

        // 2. PUBLICAR NO FACEBOOK
        if (networks.facebook && page_id) {
            try {
                if (mediaUrls.length === 1) {
                    const isVideo = isVideoUrl(mediaUrls[0]);
                    if (isVideo) {
                        // POST ÚNICO (Vídeo)
                        const fbRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/videos`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                file_url: mediaUrls[0],
                                description: caption,
                                access_token
                            })
                        });
                        const fbData = await fbRes.json();
                        if (fbData.error) throw new Error(`FB Video Publish: ${fbData.error.message}`);
                        results.facebook = true;
                    } else {
                        // POST ÚNICO (Foto)
                        const fbRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/photos`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                url: mediaUrls[0],
                                message: caption,
                                access_token
                            })
                        });
                        const fbData = await fbRes.json();
                        if (fbData.error) throw new Error(`FB Publish: ${fbData.error.message}`);
                        results.facebook = true;
                    }
                } else {
                    // MÚLTIPLAS MÍDIAS NO FACEBOOK (Post com mídias anexadas)
                    const attachedMedia = [];
                    for (const url of mediaUrls) {
                        const isVideo = isVideoUrl(url);
                        if (isVideo) {
                            const videoRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/videos`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    file_url: url,
                                    published: false,
                                    access_token
                                })
                            });
                            const videoData = await videoRes.json();
                            if (videoData.error) throw new Error(`FB Video Upload: ${videoData.error.message}`);
                            attachedMedia.push({ media_fbid: videoData.id });
                        } else {
                            const photoRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/photos`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    url: url,
                                    published: false,
                                    access_token
                                })
                            });
                            const photoData = await photoRes.json();
                            if (photoData.error) throw new Error(`FB Photo Upload: ${photoData.error.message}`);
                            attachedMedia.push({ media_fbid: photoData.id });
                        }
                    }
                    
                    const postRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/feed`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: caption,
                            attached_media: attachedMedia,
                            access_token
                        })
                    });
                    const postData = await postRes.json();
                    if (postData.error) throw new Error(`FB Feed Publish: ${postData.error.message}`);
                    
                    results.facebook = true;
                }
            } catch (fbError: any) {
                console.error('Facebook Publish Error:', fbError);
                results.errors.push(`Facebook: ${fbError.message}`);
            }
        } else if (networks.facebook && !page_id) {
            results.errors.push(`Facebook: Page ID não encontrado na integração.`);
        }

        if (!results.instagram && !results.facebook) {
            return { success: false, error: 'Falha ao publicar nas redes solicitadas.', details: results.errors };
        }

        return { success: true, results };
    } catch (error: any) {
        console.error('Publish Social Post Error:', error);
        return { success: false, error: error.message || 'Falha ao processar publicação.' };
    }
}
