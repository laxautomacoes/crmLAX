import { createAdminClient } from '@/lib/supabase/admin';

export interface SyncResult {
    imported: number;
    updated: number;
    skipped: number;
    notes_synced?: number;
}

export async function fetchRDStationDealsPage(token: string, page = 1, limit = 200) {
    const url = `https://crm.rdstation.com/api/v1/deals?token=${encodeURIComponent(token)}&page=${page}&limit=${limit}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        throw new Error(`Erro na API do RD Station: HTTP ${res.status}`);
    }
    return res.json();
}

export async function fetchRDStationDealStages(token: string) {
    try {
        const url = `https://crm.rdstation.com/api/v1/deal_stages?token=${encodeURIComponent(token)}&limit=100`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.deal_stages || []) as Array<{
            _id: string;
            name: string;
            order?: number;
            deal_pipeline?: { id: string; name: string };
        }>;
    } catch (err) {
        console.warn('[RD Station] Erro ao buscar deal_stages:', err);
        return [];
    }
}

export async function processRDStationBatch(
    tenantId: string,
    profileId: string,
    stagesMap: Map<string, string>,
    defaultStageId: string | null,
    targetFunnelId: string | null,
    deals: any[]
): Promise<SyncResult> {
    const supabase = createAdminClient();
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    // Buscar sequências ativas de "new_lead" para auto-enrollment
    const { data: activeSequences } = await supabase
        .from('followup_sequences')
        .select(`
            id, campaign_keywords,
            followup_steps ( id, order_index, delay_value, delay_unit )
        `)
        .eq('tenant_id', tenantId)
        .eq('trigger_type', 'new_lead')
        .eq('is_active', true);

    for (const deal of deals) {
        const dealId = deal.id || deal._id;
        const primaryContact = deal.contacts?.[0];
        const rawPhone = primaryContact?.phones?.[0]?.phone || '';
        const phone = rawPhone.replace(/\D/g, '');

        if (!phone && !primaryContact?.name) {
            skipped++;
            continue;
        }

        const contactName = primaryContact?.name || deal.name || 'Lead RD Station';
        const contactEmail = primaryContact?.emails?.[0]?.email || null;
        const contactRdId = primaryContact?.id || primaryContact?._id || dealId;

        // 1. Upsert Contato
        const { data: contact } = await supabase
            .from('contacts')
            .upsert({
                tenant_id: tenantId,
                name: contactName,
                phone: phone || null,
                email: contactEmail,
                rd_station_id: contactRdId,
            }, { onConflict: 'tenant_id,phone' })
            .select('id')
            .single();

        const contactId = contact?.id;
        if (!contactId) {
            skipped++;
            continue;
        }

        // 2. Mapeamento preciso do estágio da negociação
        const rdStageName = (deal.deal_stage?.name || '').trim();
        let targetStageId: string | null = null;

        if (rdStageName) {
            const normalized = rdStageName.toLowerCase();
            targetStageId = stagesMap.get(normalized) || null;

            // Se o estágio ainda não existe e temos um targetFunnelId, criar automaticamente no funil
            if (!targetStageId && targetFunnelId) {
                const { data: createdStage } = await supabase
                    .from('lead_stages')
                    .insert({
                        tenant_id: tenantId,
                        funnel_id: targetFunnelId,
                        name: rdStageName,
                        order_index: stagesMap.size
                    })
                    .select('id, name')
                    .maybeSingle();

                if (createdStage) {
                    targetStageId = createdStage.id;
                    stagesMap.set(normalized, createdStage.id);
                }
            }
        }

        if (!targetStageId) {
            targetStageId = defaultStageId;
        }

        // 3. Verificar se já existe lead pelo rd_station_id
        const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('rd_station_id', dealId)
            .maybeSingle();

        const sourceName = deal.deal_source?.name || 'RD Station';
        const campaignName = deal.campaign?.name || null;
        const dealValue = Number(deal.amount_total || deal.amount_unique || 0);

        // 4. Garantir que a fonte exista em lead_sources
        if (deal.deal_source?.name) {
            await supabase
                .from('lead_sources')
                .upsert({ tenant_id: tenantId, name: sourceName }, { onConflict: 'tenant_id,name' });
        }

        // 5. Garantir que a campanha exista em lead_campaigns
        if (campaignName && sourceName) {
            await supabase
                .from('lead_campaigns')
                .upsert(
                    { tenant_id: tenantId, source_name: sourceName, name: campaignName },
                    { onConflict: 'tenant_id,source_name,name' }
                );
        }

        if (existingLead) {
            const updatePayload: Record<string, any> = {
                value: dealValue,
                valor_estimado: dealValue,
                stage_id: targetStageId,
                last_interaction_at: new Date().toISOString(),
            };
            if (campaignName) {
                updatePayload.campaign = campaignName;
            }
            if (deal.deal_source?.name) {
                updatePayload.source = sourceName;
                updatePayload.lead_source = sourceName;
            }
            await supabase
                .from('leads')
                .update(updatePayload)
                .eq('id', existingLead.id);
            updated++;
        } else {
            const { data: newLead } = await supabase
                .from('leads')
                .insert({
                    tenant_id: tenantId,
                    contact_id: contactId,
                    assigned_to: profileId,
                    stage_id: targetStageId,
                    status: 'new',
                    source: sourceName,
                    lead_source: sourceName,
                    campaign: campaignName,
                    rd_station_id: dealId,
                    value: dealValue,
                    valor_estimado: dealValue,
                    date: new Date().toISOString().split('T')[0],
                    utm_data: {
                        ...(deal.deal_source ? { rd_source: deal.deal_source } : {}),
                        ...(deal.campaign ? { rd_campaign: deal.campaign } : {}),
                    },
                })
                .select('id')
                .single();

            if (newLead) {
                imported++;
                
                // Auto-enrollment por match de campanha
                if (campaignName && activeSequences && activeSequences.length > 0) {
                    const campaignLower = campaignName.toLowerCase();
                    for (const seq of activeSequences) {
                        if (!seq.campaign_keywords || seq.campaign_keywords.length === 0) continue;
                        
                        const matches = seq.campaign_keywords.some((kw: string) => campaignLower.includes(kw.trim().toLowerCase()));
                        if (matches) {
                            const steps = seq.followup_steps as any[];
                            if (!steps || steps.length === 0) continue;
                            
                            const firstStep = steps.sort((a, b) => a.order_index - b.order_index)[0];
                            if (firstStep) {
                                const nextActionAt = new Date();
                                if (firstStep.delay_unit === 'minutes') nextActionAt.setMinutes(nextActionAt.getMinutes() + firstStep.delay_value);
                                else if (firstStep.delay_unit === 'hours') nextActionAt.setHours(nextActionAt.getHours() + firstStep.delay_value);
                                else if (firstStep.delay_unit === 'days') nextActionAt.setDate(nextActionAt.getDate() + firstStep.delay_value);
                                else if (firstStep.delay_unit === 'weeks') nextActionAt.setDate(nextActionAt.getDate() + (firstStep.delay_value * 7));

                                await supabase.from('followup_enrollments').insert({
                                    tenant_id: tenantId,
                                    sequence_id: seq.id,
                                    lead_id: newLead.id,
                                    status: 'active',
                                    current_step_index: 0,
                                    enrolled_at: new Date().toISOString(),
                                    next_action_at: nextActionAt.toISOString()
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    return { imported, updated, skipped };
}

export async function runFullRDStationSync(
    tenantId: string,
    profileId: string,
    token: string,
    targetFunnelId?: string | null
): Promise<SyncResult> {
    const supabase = createAdminClient();

    // 1. Buscar estágios existentes no RD Station CRM via API
    const apiStages = await fetchRDStationDealStages(token);

    let activeFunnelId: string | null = null;
    const isAutoMode = !targetFunnelId || targetFunnelId === 'auto';

    if (isAutoMode) {
        // Modo Automático: Buscar ou criar o funil "RD Station"
        let { data: rdFunnel } = await supabase
            .from('funnels')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .ilike('name', 'RD Station')
            .maybeSingle();

        if (!rdFunnel) {
            // Checar limites do plano antes de criar o funil
            const { data: tenant } = await supabase
                .from('tenants')
                .select('plan_type')
                .eq('id', tenantId)
                .maybeSingle();

            let maxFunnels = 10;
            if (tenant?.plan_type) {
                const { data: planLimit } = await supabase
                    .from('plan_limits')
                    .select('max_funnels')
                    .eq('plan_type', tenant.plan_type)
                    .maybeSingle();
                if (planLimit?.max_funnels) maxFunnels = planLimit.max_funnels;
            }

            const { count: currentFunnelsCount } = await supabase
                .from('funnels')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId);

            if ((currentFunnelsCount || 0) < maxFunnels) {
                const { data: lastFunnel } = await supabase
                    .from('funnels')
                    .select('order_index')
                    .eq('tenant_id', tenantId)
                    .order('order_index', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const nextOrder = (lastFunnel?.order_index ?? -1) + 1;
                const { data: newFunnel } = await supabase
                    .from('funnels')
                    .insert({
                        tenant_id: tenantId,
                        name: 'RD Station',
                        order_index: nextOrder,
                    })
                    .select('id, name')
                    .maybeSingle();

                rdFunnel = newFunnel;
            }
        }

        // Fallback para o funil padrão se não foi possível criar o funil RD Station
        if (!rdFunnel) {
            const { data: defaultFunnel } = await supabase
                .from('funnels')
                .select('id, name')
                .eq('tenant_id', tenantId)
                .order('order_index', { ascending: true })
                .limit(1)
                .maybeSingle();
            rdFunnel = defaultFunnel;
        }

        activeFunnelId = rdFunnel?.id || null;
    } else {
        activeFunnelId = targetFunnelId;
    }

    // 2. Mapear e provisionar estágios do funil ativo
    const stagesMap = new Map<string, string>(); // lowercase name -> id
    let defaultStageId: string | null = null;

    if (activeFunnelId) {
        const { data: existingStages } = await supabase
            .from('lead_stages')
            .select('id, name, order_index')
            .eq('tenant_id', tenantId)
            .eq('funnel_id', activeFunnelId)
            .order('order_index', { ascending: true });

        const stagesList = [...(existingStages || [])];

        // Se houver estágios do RD Station que ainda não existem no funil, criá-los na ordem exata
        if (apiStages.length > 0) {
            const sortedApiStages = [...apiStages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            for (let idx = 0; idx < sortedApiStages.length; idx++) {
                const apiStage = sortedApiStages[idx];
                const cleanName = apiStage.name?.trim();
                if (!cleanName) continue;

                const alreadyExists = stagesList.some(s => s.name.trim().toLowerCase() === cleanName.toLowerCase());
                if (!alreadyExists) {
                    const { data: createdStage } = await supabase
                        .from('lead_stages')
                        .insert({
                            tenant_id: tenantId,
                            funnel_id: activeFunnelId,
                            name: cleanName,
                            order_index: typeof apiStage.order === 'number' ? apiStage.order : stagesList.length,
                        })
                        .select('id, name, order_index')
                        .maybeSingle();

                    if (createdStage) stagesList.push(createdStage);
                }
            }
        }

        // Se o funil ativo ainda não tem estágios, criar um estágio padrão "Novo"
        if (stagesList.length === 0 && activeFunnelId) {
            const { data: createdDefault } = await supabase
                .from('lead_stages')
                .insert({
                    tenant_id: tenantId,
                    funnel_id: activeFunnelId,
                    name: 'Novo',
                    order_index: 0,
                })
                .select('id, name, order_index')
                .maybeSingle();

            if (createdDefault) stagesList.push(createdDefault);
        }

        stagesList.forEach((s, idx) => {
            stagesMap.set(s.name.trim().toLowerCase(), s.id);
            if (idx === 0) defaultStageId = s.id;
        });
    }

    // Fallback final: se ainda não temos defaultStageId, buscar dentro do funil ativo (nunca de outro funil)
    if (!defaultStageId && activeFunnelId) {
        const { data: fallbackStage } = await supabase
            .from('lead_stages')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('funnel_id', activeFunnelId)
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle();

        defaultStageId = fallbackStage?.id || null;
    }

    // 3. Processar lotes de negócios da API
    let page = 1;
    let hasMore = true;
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    while (hasMore && page <= 25) { // limite de segurança: 25 páginas (até 5.000 deals)
        const data = await fetchRDStationDealsPage(token, page, 200);
        const deals = data.deals || [];
        if (deals.length === 0) break;

        const batchRes = await processRDStationBatch(
            tenantId,
            profileId,
            stagesMap,
            defaultStageId,
            activeFunnelId,
            deals
        );
        totalImported += batchRes.imported;
        totalUpdated += batchRes.updated;
        totalSkipped += batchRes.skipped;

        hasMore = Boolean(data.has_more);
        page++;
    }

    // 4. Sincronizar as anotações manuais do histórico do RD Station em "Notas"
    let notesSynced = 0;
    try {
        const notesRes = await syncRDStationNotes(tenantId, token, profileId);
        notesSynced = notesRes.synced;
    } catch (notesErr) {
        console.warn('[RD Station] Erro ao sincronizar anotações:', notesErr);
    }

    return { imported: totalImported, updated: totalUpdated, skipped: totalSkipped, notes_synced: notesSynced };
}

export async function fetchRDStationActivitiesPage(token: string, page = 1, limit = 200) {
    const url = `https://crm.rdstation.com/api/v1/activities?token=${encodeURIComponent(token)}&page=${page}&limit=${limit}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        throw new Error(`Erro na API do RD Station (activities): HTTP ${res.status}`);
    }
    return res.json();
}

export async function syncRDStationNotes(
    tenantId: string,
    token: string,
    fallbackProfileId?: string
): Promise<{ synced: number }> {
    const supabase = createAdminClient();

    // 1. Mapear leads do tenant vinculados ao RD Station
    const { data: leads } = await supabase
        .from('leads')
        .select('id, contact_id, assigned_to, rd_station_id')
        .eq('tenant_id', tenantId)
        .not('rd_station_id', 'is', null);

    if (!leads || leads.length === 0) return { synced: 0 };

    const leadMap = new Map<string, { id: string; contact_id: string | null; assigned_to: string | null }>();
    for (const l of leads) {
        if (l.rd_station_id) {
            leadMap.set(l.rd_station_id, {
                id: l.id,
                contact_id: l.contact_id,
                assigned_to: l.assigned_to,
            });
        }
    }

    let defaultProfileId = fallbackProfileId || '';
    if (!defaultProfileId) {
        const { data: firstProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('tenant_id', tenantId)
            .limit(1)
            .maybeSingle();
        defaultProfileId = firstProfile?.id || '';
    }

    // 2. Buscar anotações manuais paginadas do RD Station
    let page = 1;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore && page <= 30) {
        try {
            const data = await fetchRDStationActivitiesPage(token, page, 200);
            const activities = data.activities || [];
            if (activities.length === 0) break;

            for (const act of activities) {
                const dealId = act.deal_id;
                if (!dealId) continue;

                const lead = leadMap.get(dealId);
                if (!lead) continue;

                const targetProfileId = lead.assigned_to || defaultProfileId;
                if (!targetProfileId) continue;

                const actId = act.id || act._id;
                const text = (act.text || '').trim();
                if (!text) continue;

                const dateStr = act.date || new Date().toISOString();
                const dateOnly = dateStr.substring(0, 10);

                const { error } = await supabase
                    .from('notes')
                    .upsert({
                        tenant_id: tenantId,
                        lead_id: lead.id,
                        contact_id: lead.contact_id,
                        profile_id: targetProfileId,
                        content: text,
                        date: dateOnly,
                        created_at: dateStr,
                        rd_station_id: actId,
                    }, { onConflict: 'tenant_id,rd_station_id' });

                if (!error) {
                    totalSynced++;
                }
            }

            hasMore = Boolean(data.has_more);
            page++;
        } catch (err) {
            console.warn(`[RD Station] Erro ao buscar atividades página ${page}:`, err);
            break;
        }
    }

    return { synced: totalSynced };
}

