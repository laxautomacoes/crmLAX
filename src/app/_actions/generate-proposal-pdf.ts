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
    if (prop) {
      prop.address_city = prop.details?.endereco?.cidade || prop.address_city
      prop.address_state = prop.details?.endereco?.estado || prop.address_state
    }
    let imovelDescricao = ''
    if (prop) {
      const details = prop.details || {}
      const parts = [];
      const apto = details.endereco?.apto || details.apto;
      
      if (prop.type === 'Empreendimento' || details.is_empreendimento) {
        if (proposal.unit) {
          parts.push(`apto ${proposal.unit}`);
        }
      } else {
        if (apto) parts.push(`apto ${apto}`);
      }
      
      const vagas = details.vagas;
      if (vagas && parseInt(String(vagas)) > 0) {
        const vagasNum = details.vagas_numeracao ? ` (${details.vagas_numeracao})` : '';
        parts.push(`vg ${vagas}${vagasNum}`);
      }
      
      const hb = details.hobby_box_numeracao || details.hobby_box;
      if (hb && hb !== 'Não') {
        if (details.hobby_box_numeracao) {
          parts.push(`hb ${details.hobby_box_numeracao}`);
        } else if (hb.toLowerCase() !== 'sim') {
          parts.push(`hb ${hb}`);
        } else {
          parts.push(`hb sim`);
        }
      }
      
      if (parts.length > 0) {
        imovelDescricao = `${prop.title} - ${parts.join(' • ')}`;
      } else {
        imovelDescricao = prop.title;
      }
    } else {
      imovelDescricao = proposal.lead?.property_interest || ''
    }

    // 3. Formatar valor de venda do imóvel
    const propPrice = prop?.price || 0
    const valorVendaImovel = propPrice 
      ? parseFloat(propPrice.toString()).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : ''

    // 4. Formatar condições de pagamento descritivas
    let condicoesPagamento = ''
    
    // Verifica se o usuário preencheu um campo personalizado para condições de pagamento na ficha
    const customPaymentKey = proposal.buyer_data ? Object.keys(proposal.buyer_data).find(k => 
      k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('pagamento')
    ) : null;

    if (customPaymentKey && proposal.buyer_data[customPaymentKey]) {
      let customText = String(proposal.buyer_data[customPaymentKey]);
      // Se o usuário digitou tudo na mesma linha separado por " - ", força a quebra de linha
      if (customText.includes(' - ') && !customText.includes('\n')) {
        customText = customText.split(' - ').map(s => s.trim()).filter(Boolean).map(s => s.startsWith('-') ? s : `- ${s}`).join('\n');
      }
      condicoesPagamento = customText;
    } else {
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
      condicoesPagamento = condLines.join('\n')
    }

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
    // Só sobrescreve valores se o cálculo automático retornou algo (evita limpar dados do formulário)
    const enrichedBuyerData: Record<string, any> = {
      ...(proposal.buyer_data || {}),
      corretor_associado_nome: creatorName,
      ...(imovelDescricao ? { imovel_descricao: imovelDescricao } : {}),
      ...(valorVendaImovel ? { valor_venda_imovel: valorVendaImovel } : {}),
      condicoes_pagamento: condicoesPagamento
    }
    const buyerDataKeys = Object.keys(enrichedBuyerData)

    // Preparar linhas de condições de pagamento para campos numerados do PDF
    // Os campos "1", "2", "1_2", "2_2" no PDF correspondem às linhas da seção "Condições de Pagamento"
    const paymentFieldOrder = ['1', '2', '1_2', '2_2']
    const paymentLines = condicoesPagamento
      ? condicoesPagamento.replace(/\\n/g, '\n').split('\n').map((l: string) => l.trim()).filter(Boolean)
      : []

    fields.forEach((field) => {
      const fieldName = field.getName()
      const normFieldName = fieldName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, "")

      // A0. Preencher campos numéricos que são linhas de condições de pagamento
      const paymentLineIndex = paymentFieldOrder.indexOf(fieldName)
      if (paymentLineIndex !== -1 && paymentLines[paymentLineIndex]) {
        if (field instanceof PDFTextField) {
          field.setText(paymentLines[paymentLineIndex])
        }
        return
      }

      // A1. Preencher campos da área de assinatura (Proponentes, Vendedores, Data)
      // Campo longo da cláusula 3 = campo da cidade na linha de data (à esquerda)
      if (fieldName.startsWith('3 Os proponentes')) {
        if (field instanceof PDFTextField) {
          field.setText(userCity)
        }
        return
      }
      if (fieldName === 'undefined') {
        // Campo sem nome no PDF = dia da data de criação da proposta
        if (field instanceof PDFTextField) {
          field.setText(String(day))
        }
        return
      }
      if (fieldName === 'Proponentes') {
        if (field instanceof PDFTextField) {
          const clientName = proposal.contact?.name || ''
          field.setText(clientName)
        }
        return
      }
      if (fieldName === 'Vendedores') {
        if (field instanceof PDFTextField) {
          const adminName = enrichedBuyerData['vendedor_nome'] || ''
          // Se admin e corretor são diferentes, exibe ambos
          const vendorText = (adminName && creatorName && adminName !== creatorName)
            ? `${adminName} / ${creatorName}`
            : adminName || creatorName
          field.setText(vendorText)
        }
        return
      }

      // A2. Verificar se é um campo de data/cidade explícito do bloco de assinatura
      let dateValue = ''
      if (normFieldName === 'cidade' || normFieldName === 'local' || normFieldName === 'cidade_assinatura') {
        dateValue = userCity
      } else if (normFieldName === 'dia' || normFieldName === 'data_dia') {
        dateValue = String(day)
      } else if (normFieldName === 'de' || normFieldName === 'mes' || normFieldName === 'data_mes' || normFieldName === 'mes_extenso') {
        dateValue = monthName.toLowerCase()
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

          // Se for campo de celular/fone, formatar como (DDD) XXXXX XXXX
          if (/celular|fone|telefone/.test(matchedKey.toLowerCase())) {
            const digits = valueToSet.replace(/\D/g, '')
            if (digits.length === 11) {
              valueToSet = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)} ${digits.slice(7)}`
            } else if (digits.length === 10) {
              valueToSet = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`
            }
          }

          if (field instanceof PDFTextField) {
            const match = normFieldName.match(/_?(\d+)$/);
            if (match && valueToSet.includes('\n')) {
              const lines = valueToSet.split('\n').map(l => l.trim()).filter(Boolean);
              const lineIndex = parseInt(match[1], 10) - 1;
              if (lineIndex >= 0 && lines[lineIndex]) {
                field.setText(lines[lineIndex]);
              }
            } else {
              field.setText(valueToSet);
            }
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

    // Construir nome amigável do arquivo: "Proposta Apto 501 vg 22 hb 22 Nome Cliente.pdf"
    const contactName = proposal.contact?.name || ''
    // Extrair apenas as partes (apto X • vg Y • hb Z) da descrição do imóvel
    const partsMatch = imovelDescricao.match(/- (.+)$/)
    const unitParts = partsMatch ? partsMatch[1].replace(/•/g, '').replace(/\s+/g, ' ').trim() : ''
    const fileNameParts = ['Proposta', unitParts, contactName].filter(Boolean).join(' ')
    const sanitizedFileName = fileNameParts.replace(/[<>:"/\\|?*]/g, '').trim()

    return { 
      success: true, 
      base64, 
      fileName: `${sanitizedFileName}.pdf` 
    }
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return { success: false, error: error.message || 'Erro ao gerar o PDF.' }
  }
}
