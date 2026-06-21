'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from './profile'
import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib'
import { findMatchingKey } from '@/lib/utils/pdf-filler'

export async function generateProposalPdf(proposalId: string) {
  const { profile } = await getProfile()
  if (!profile) return { success: false, error: 'Usuário não autenticado.' }

  try {
    const supabase = await createClient()
    const { data: proposalData, error: proposalError } = await supabase
      .from('proposals')
      .select('*, template:proposal_templates(*), property:properties(*), lead:leads(*, property:properties(*)), contact:contacts(*)')
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposalData) {
      throw new Error(proposalError?.message || 'Proposta não encontrada.')
    }

    const proposal = proposalData as any
    const template = proposal.template as any
    if (!template || !template.file_path) {
      throw new Error('Esta proposta não possui um modelo de ficha associado.')
    }

    const response = await fetch(template.file_path)
    if (!response.ok) {
      throw new Error('Não foi possível carregar o arquivo PDF original.')
    }
    const pdfBytes = await response.arrayBuffer()

    const pdfDoc = await PDFDocument.load(pdfBytes)
    const form = pdfDoc.getForm()
    const fields = form.getFields()

    // 1. Obter nome do criador da proposta (Corretor Associado)
    let creatorName = profile.full_name
    if (proposal.created_by) {
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', proposal.created_by)
        .maybeSingle()
      if (creatorProfile?.full_name) {
        creatorName = creatorProfile.full_name
      }
    }

    // 2. Construir descrição detalhada do imóvel
    const prop = proposal.property || proposal.lead?.property
    let imovelDescricao = ''
    if (prop) {
      const details = prop.details || {}
      const parts = [prop.title]
      
      const apto = details.endereco?.apto || details.apto
      if (apto) parts.push(`Apto: ${apto}`)
      
      const vagas = details.vagas
      if (vagas && parseInt(String(vagas)) > 0) {
        const vagasNum = details.vagas_numeracao ? ` (${details.vagas_numeracao})` : ''
        parts.push(`Vagas: ${vagas}${vagasNum}`)
      }
      
      const hb = details.hobby_box_numeracao || details.hobby_box
      if (hb && hb !== 'Não' && hb !== 'Sim') {
        parts.push(`Hobby Box: ${hb}`)
      } else if (details.hobby_box === 'Sim' || details.hobby_box_numeracao) {
        const hbVal = details.hobby_box_numeracao ? ` (${details.hobby_box_numeracao})` : ''
        parts.push(`Hobby Box: Sim${hbVal}`)
      }
      
      imovelDescricao = parts.join(', ')
    } else {
      imovelDescricao = proposal.lead?.property_interest || ''
    }

    // 3. Formatar valor de venda do imóvel
    const propPrice = prop?.price || 0
    const valorVendaImovel = propPrice 
      ? parseFloat(propPrice.toString()).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : ''

    // 4. Formatar condições de pagamento descritivas
    const terms = proposal.payment_terms || {}
    const condLines = []
    if (terms.down_payment && parseFloat(terms.down_payment) > 0) {
      condLines.push(`Sinal/Entrada: ${parseFloat(terms.down_payment).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
    }
    if (terms.financing && parseFloat(terms.financing) > 0) {
      condLines.push(`Saldo Financiado: ${parseFloat(terms.financing).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
    }
    if (terms.installments) {
      condLines.push(`Parcelamento: ${terms.installments}`)
    }
    if (terms.permutas) {
      condLines.push(`Permutas/Bens: ${terms.permutas}`)
    }
    if (terms.notes) {
      condLines.push(`Obs: ${terms.notes}`)
    }
    const condicoesPagamento = condLines.join('\n')

    // 5. Determinar cidade e partes da data para assinatura
    const userCity = prop?.address_city || proposal.contact?.address_city || 'Florianópolis'
    const creationDate = new Date(proposal.created_at || new Date())
    const day = creationDate.getDate()
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    const monthName = months[creationDate.getMonth()]
    const year = creationDate.getFullYear()
    const dateSignature = `${userCity}, ${day} de ${monthName.toLowerCase()} de ${year}`

    // 6. Enriquecer o objeto buyerData
    const enrichedBuyerData = {
      ...(proposal.buyer_data || {}),
      corretor_associado_nome: creatorName,
      imovel_descricao: imovelDescricao,
      valor_venda_imovel: valorVendaImovel,
      condicoes_pagamento: condicoesPagamento
    }
    const buyerDataKeys = Object.keys(enrichedBuyerData)

    fields.forEach((field) => {
      const fieldName = field.getName()
      const normFieldName = fieldName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, "")

      // A. Verificar se é um campo de data/cidade explícito do bloco de assinatura
      let dateValue = ''
      if (normFieldName === 'cidade' || normFieldName === 'local' || normFieldName === 'cidade_assinatura') {
        dateValue = userCity
      } else if (normFieldName === 'dia' || normFieldName === 'data_dia' || normFieldName === 'de') {
        dateValue = String(day)
      } else if (normFieldName === 'mes' || normFieldName === 'data_mes' || normFieldName === 'mes_extenso') {
        dateValue = monthName
      } else if (normFieldName === 'ano' || normFieldName === 'data_ano' || normFieldName === 'de20' || normFieldName === 'de_20') {
        dateValue = (normFieldName === 'de20' || normFieldName === 'de_20') ? String(year).slice(-2) : String(year)
      } else if (normFieldName === 'data' || normFieldName === 'data_assinatura' || normFieldName === 'data_proposta' || normFieldName === 'data_criacao' || normFieldName === 'data_extenso') {
        dateValue = dateSignature
      }

      if (dateValue) {
        if (field instanceof PDFTextField) {
          field.setText(dateValue)
        }
        return
      }

      // B. Senão, faz a busca tradicional no buyerData enriquecido
      const matchedKey = findMatchingKey(fieldName, buyerDataKeys)

      if (matchedKey) {
        let valueToSet = String(enrichedBuyerData[matchedKey])
        if (valueToSet) {
          // Se for uma data ISO (YYYY-MM-DD), formatar para o padrão BR (DD/MM/YYYY)
          if (/^\d{4}-\d{2}-\d{2}$/.test(valueToSet)) {
            const [y, m, d] = valueToSet.split('-')
            valueToSet = `${d}/${m}/${y}`
          }

          if (field instanceof PDFTextField) {
            field.setText(valueToSet)
          } else if (field instanceof PDFCheckBox) {
            if (['true', 'yes', '1', 'sim'].includes(valueToSet.toLowerCase())) {
              field.check()
            } else {
              field.uncheck()
            }
          }
        }
      }
    })

    form.flatten()
    const pdfBytesModified = await pdfDoc.save()
    const base64 = Buffer.from(pdfBytesModified).toString('base64')

    return { 
      success: true, 
      base64, 
      fileName: `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}-${proposalId}.pdf` 
    }
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return { success: false, error: error.message || 'Erro ao gerar o PDF.' }
  }
}
