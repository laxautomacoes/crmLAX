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
        
        const response = await fetch(url, { next: { revalidate: 3600 } });
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
 * Publica um post (Feed Único, Carrossel) no Instagram e/ou Página do Facebook
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
                    // POST ÚNICO (Imagem)
                    // TODO: Suportar vídeo (Reels) checando a extensão da URL
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
                    
                    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${account_id}/media_publish`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            creation_id: createData.id,
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
                        const childRes = await fetch(`https://graph.facebook.com/v21.0/${account_id}/media`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                image_url: url,
                                is_carousel_item: true,
                                access_token
                            })
                        });
                        const childData = await childRes.json();
                        if (childData.error) throw new Error(`IG Child Create: ${childData.error.message}`);
                        childIds.push(childData.id);
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
                    // POST ÚNICO
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
                } else {
                    // MÚLTIPLAS FOTOS NO FACEBOOK (Post com fotos anexadas)
                    // Facebook permite fazer upload das fotos não publicadas e depois anexar a um post no feed.
                    const attachedMedia = [];
                    for (const url of mediaUrls) {
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
