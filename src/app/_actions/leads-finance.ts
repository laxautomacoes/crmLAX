'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getProfile } from './profile'

export async function getLeadFinancials(leadId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        const { data, error } = await supabase
            .from('transacoes_financeiras')
            .select('*')
            .eq('lead_id', leadId)
            .order('data_transacao', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching lead financials:', error)
        return { success: false, error: error.message }
    }
}

interface InvoiceData {
    saleValue: number;
    commissionRate: number; // ex: 6% = 6.00
    commissionValue: number; // raw value
    installmentsCount: number;
    firstDueDate: string; // YYYY-MM-DD
    brokerId?: string; // Corretor que receberá o repasse
    brokerRate?: number; // ex: 30% do valor da comissão da imobiliária
    partnerId?: string; // ID do parceiro
    partnerRate?: number; // ex: 50% de repasse
    agencyTaxType?: 'percent' | 'fixed';
    agencyTaxValue?: number;
    brokerTaxType?: 'percent' | 'fixed';
    brokerTaxValue?: number;
    partnerTaxType?: 'percent' | 'fixed';
    partnerTaxValue?: number;
}

export async function invoiceLeadCommission(leadId: string, tenantId: string, data: InvoiceData) {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        // 1. Buscar dados do Lead para compor a descrição
        const { data: lead } = await supabase
            .from('leads')
            .select('*, contacts(name)')
            .eq('id', leadId)
            .single()

        const leadName = lead?.contacts?.name || 'Cliente'

        // 2. Atualizar tabela leads com dados de faturamento
        const { error: updateError } = await supabase
            .from('leads')
            .update({
                sale_value: data.saleValue,
                final_commission_rate: data.commissionRate,
                lead_source: lead?.lead_source || 'Direto', // Preserva origem
                finance_installments_count: data.installmentsCount
            })
            .eq('id', leadId)

        if (updateError) throw updateError

        // 3. Remover transações financeiras pendentes anteriores vinculadas a este lead para evitar duplicidade
        await supabase
            .from('transacoes_financeiras')
            .delete()
            .eq('lead_id', leadId)
            .eq('status', 'pendente')

        // 4. Calcular comissões
        const totalCommission = data.commissionValue !== undefined && data.commissionValue !== null 
            ? data.commissionValue 
            : (data.saleValue * data.commissionRate) / 100
        const installmentValue = totalCommission / data.installmentsCount

        const partnerCommissionBruto = data.partnerId && data.partnerRate
            ? (totalCommission * data.partnerRate) / 100
            : 0
        const partnerInstallmentValue = partnerCommissionBruto / data.installmentsCount

        const baseBrokerCommission = data.partnerId && data.partnerRate 
            ? (totalCommission - partnerCommissionBruto) 
            : totalCommission;

        const brokerCommissionBruto = data.brokerId && data.brokerRate 
            ? (baseBrokerCommission * data.brokerRate) / 100 
            : 0
        const brokerInstallmentValue = brokerCommissionBruto / data.installmentsCount

        const agencyCommissionBruto = totalCommission - brokerCommissionBruto - partnerCommissionBruto;

        // Impostos
        const agencyTax = data.agencyTaxType === 'percent' ? (agencyCommissionBruto * (data.agencyTaxValue || 0) / 100) : (data.agencyTaxValue || 0);
        const brokerTax = data.brokerTaxType === 'percent' ? (brokerCommissionBruto * (data.brokerTaxValue || 0) / 100) : (data.brokerTaxValue || 0);
        const partnerTax = data.partnerTaxType === 'percent' ? (partnerCommissionBruto * (data.partnerTaxValue || 0) / 100) : (data.partnerTaxValue || 0);

        const agencyTaxInstallment = agencyTax / data.installmentsCount;
        const brokerTaxInstallment = brokerTax / data.installmentsCount;
        const partnerTaxInstallment = partnerTax / data.installmentsCount;

        const startDate = new Date(data.firstDueDate)

        // 5. Inserir as parcelas no banco
        const transactionsToInsert = []

        for (let i = 1; i <= data.installmentsCount; i++) {
            const dueDate = new Date(startDate)
            dueDate.setMonth(startDate.getMonth() + (i - 1))
            const isoDueDate = dueDate.toISOString()

            // A. Lançamento da Comissão (Receita para a imobiliária)
            transactionsToInsert.push({
                tenant_id: tenantId,
                profile_id: profile.id,
                lead_id: leadId,
                valor: parseFloat(installmentValue.toFixed(2)),
                tipo: 'Receita',
                categoria: 'Comissão',
                descricao: `Comissão ${i}/${data.installmentsCount} - Venda ${leadName}`,
                data_transacao: isoDueDate,
                status: 'pendente',
                fonte: 'CRM'
            })

            // A.1 Imposto da Imobiliária (Despesa)
            if (agencyTax > 0) {
                transactionsToInsert.push({
                    tenant_id: tenantId,
                    profile_id: profile.id,
                    lead_id: leadId,
                    valor: parseFloat(agencyTaxInstallment.toFixed(2)),
                    tipo: 'Despesa',
                    categoria: 'Imposto / Nota Fiscal',
                    descricao: `Imposto NF ${i}/${data.installmentsCount} - Admin ${leadName}`,
                    data_transacao: isoDueDate,
                    status: 'pendente',
                    fonte: 'CRM'
                })
            }

            // B. Lançamento do Repasse do Corretor (Despesa para a imobiliária, se houver)
            if (brokerCommissionBruto > 0 && data.brokerId) {
                transactionsToInsert.push({
                    tenant_id: tenantId,
                    profile_id: data.brokerId,
                    lead_id: leadId,
                    valor: parseFloat(brokerInstallmentValue.toFixed(2)),
                    tipo: 'Despesa',
                    categoria: 'Repasse de Comissão',
                    descricao: `Corretor ${i}/${data.installmentsCount} - Venda ${leadName}`,
                    data_transacao: isoDueDate,
                    status: 'pendente',
                    fonte: 'CRM'
                })
                
                // B.1 Imposto do Corretor (Despesa)
                if (brokerTax > 0) {
                    transactionsToInsert.push({
                        tenant_id: tenantId,
                        profile_id: data.brokerId,
                        lead_id: leadId,
                        valor: parseFloat(brokerTaxInstallment.toFixed(2)),
                        tipo: 'Despesa',
                        categoria: 'Imposto / Nota Fiscal',
                        descricao: `Imposto NF ${i}/${data.installmentsCount} - Corretor ${leadName}`,
                        data_transacao: isoDueDate,
                        status: 'pendente',
                        fonte: 'CRM'
                    })
                }
            }

            // C. Lançamento do Repasse do Parceiro (Despesa, se houver)
            if (partnerCommissionBruto > 0 && data.partnerId) {
                transactionsToInsert.push({
                    tenant_id: tenantId,
                    profile_id: profile.id,
                    lead_id: leadId,
                    valor: parseFloat(partnerInstallmentValue.toFixed(2)),
                    tipo: 'Despesa',
                    categoria: 'Repasse de Comissão Parceria',
                    descricao: `Parceria ${i}/${data.installmentsCount} - Venda ${leadName}`,
                    data_transacao: isoDueDate,
                    status: 'pendente',
                    fonte: 'CRM',
                    metadata: { partner_id: data.partnerId }
                })
                
                // C.1 Imposto do Parceiro (Despesa)
                if (partnerTax > 0) {
                    transactionsToInsert.push({
                        tenant_id: tenantId,
                        profile_id: profile.id,
                        lead_id: leadId,
                        valor: parseFloat(partnerTaxInstallment.toFixed(2)),
                        tipo: 'Despesa',
                        categoria: 'Imposto / Nota Fiscal',
                        descricao: `Imposto NF ${i}/${data.installmentsCount} - Parceria ${leadName}`,
                        data_transacao: isoDueDate,
                        status: 'pendente',
                        fonte: 'CRM',
                        metadata: { partner_id: data.partnerId }
                    })
                }
            }
        }

        const { error: insertError } = await supabase
            .from('transacoes_financeiras')
            .insert(transactionsToInsert)

        if (insertError) throw insertError

        // Registrar uma interação no histórico do Lead
        let contentMsg = `Comissão faturada no financeiro: R$ ${totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${data.installmentsCount}x.`
        if (brokerCommissionBruto > 0) {
            contentMsg += ` Com repasse ao corretor (R$ ${brokerCommissionBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
        }
        if (partnerCommissionBruto > 0) {
            contentMsg += ` Com repasse ao parceiro comercial (R$ ${partnerCommissionBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
        }
        const totalTaxes = agencyTax + brokerTax + partnerTax;
        if (totalTaxes > 0) {
            contentMsg += ` Descontos de Nota Fiscal registrados no valor total de R$ ${totalTaxes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
        }

        await supabase
            .from('interactions')
            .insert([{
                lead_id: leadId,
                type: 'system',
                content: contentMsg
            }])

        revalidatePath(`/leads`)
        revalidatePath(`/financeiro`)
        return { success: true }
    } catch (error: any) {
        console.error('Error invoicing lead commission:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteLeadFinancials(leadId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        const { error } = await supabase
            .from('transacoes_financeiras')
            .delete()
            .eq('lead_id', leadId)

        if (error) throw error
        
        await supabase.from('interactions').insert([{
            lead_id: leadId,
            type: 'system',
            content: 'Faturamento excluído.'
        }])

        revalidatePath(`/leads`)
        revalidatePath(`/financeiro`)
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting lead financials:', error)
        return { success: false, error: error.message }
    }
}

export async function archiveLeadFinancials(leadId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    if (!profile) return { success: false, error: 'Usuário não autenticado.' }

    try {
        const { error } = await supabase
            .from('transacoes_financeiras')
            .update({ status: 'cancelado' })
            .eq('lead_id', leadId)

        if (error) throw error
        
        await supabase.from('interactions').insert([{
            lead_id: leadId,
            type: 'system',
            content: 'Faturamento arquivado (cancelado).'
        }])

        revalidatePath(`/leads`)
        revalidatePath(`/financeiro`)
        return { success: true }
    } catch (error: any) {
        console.error('Error archiving lead financials:', error)
        return { success: false, error: error.message }
    }
}
