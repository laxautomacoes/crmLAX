function mapBaseField(baseNorm: string): string {
  const mapping: Record<string, string> = {
    'nome': 'nome',
    'cpf': 'cpf',
    'email': 'email',
    'celular': 'celular',
    'profissao': 'profissao',
    'estadocivil': 'estado_civil',
    'regimedecasamento': 'regime_casamento',
    'nacionalidade': 'nacionalidade',
    'naturalidade': 'naturalidade',
    'pai': 'filiacao_pai',
    'mae': 'filiacao_mae',
    'localcasamento': 'local_casamento',
    'datacasamento': 'data_casamento',
    'cident': 'c_ident',
    'orgaoexp': 'orgao_exp',
    'dataexp': 'data_exp',
    'datanasc': 'data_nasc'
  }
  return mapping[baseNorm] || baseNorm
}

export function findMatchingKey(pdfFieldName: string, buyerDataKeys: string[]): string | null {
  const normPdf = pdfFieldName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, "")
  
  // Ignorar campos numéricos ou especiais que tratamos de forma explícita na Action
  if (/^[0-9_]+$/.test(normPdf) || normPdf === 'de' || normPdf === 'de20' || normPdf === 'undefined') {
    return null
  }
  
  if (normPdf.includes('conjuge') || normPdf.includes('conjugue')) {
    return buyerDataKeys.find(k => k.includes('proponente_2_nome')) || null
  }
  
  if (normPdf.endsWith('_2') || normPdf.endsWith('2')) {
    const base = normPdf.replace(/_?2$/, '')
    
    if (['n', 'num', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep', 'fone', 'telefone'].includes(base)) {
      const fieldMap: Record<string, string> = {
        'n': 'endereco_residencial_numero', 'num': 'endereco_residencial_numero', 'numero': 'endereco_residencial_numero',
        'complemento': 'endereco_residencial_complemento', 'bairro': 'endereco_residencial_bairro',
        'cidade': 'endereco_residencial_cidade', 'estado': 'endereco_residencial_estado',
        'cep': 'endereco_residencial_cep', 'fone': 'endereco_residencial_fone', 'telefone': 'endereco_residencial_fone'
      }
      return buyerDataKeys.find(k => k === fieldMap[base]) || null
    }
    
    if (base === 'nome') {
      return buyerDataKeys.find(k => k.includes('vendedor_nome')) || null
    }
    
    const targetKey = `proponente_2_${mapBaseField(base)}`
    return buyerDataKeys.find(k => k === targetKey || k.replace(/[^a-z0-9]/g, '').includes(targetKey.replace(/[^a-z0-9]/g, ''))) || null
  }
  
  if (normPdf === 'enderecoresidencial') return buyerDataKeys.find(k => k === 'endereco_residencial_rua') || null
  if (normPdf === 'enderecocomercial') return buyerDataKeys.find(k => k === 'endereco_comercial_rua') || null
  
  if (['complemento', 'bairro', 'cidade', 'estado', 'cep', 'fone', 'telefone'].includes(normPdf) || normPdf === 'n') {
    const fieldMap: Record<string, string> = {
      'n': 'endereco_comercial_numero', 'complemento': 'endereco_comercial_complemento',
      'bairro': 'endereco_comercial_bairro', 'cidade': 'endereco_comercial_cidade',
      'estado': 'endereco_comercial_estado', 'cep': 'endereco_comercial_cep',
      'fone': 'endereco_comercial_fone', 'telefone': 'endereco_comercial_fone'
    }
    return buyerDataKeys.find(k => k === fieldMap[normPdf]) || null
  }
  
  if (normPdf === 'associado') return buyerDataKeys.find(k => k.includes('corretor_associado_nome')) || null
  if (normPdf === 'imovel') return buyerDataKeys.find(k => k.includes('imovel_descricao')) || null
  if (normPdf === 'valor_de_venda' || normPdf === 'valordevenda') return buyerDataKeys.find(k => k.includes('valor_venda_imovel')) || null
  if (normPdf === 'valor_proposto' || normPdf === 'valorproposto') return buyerDataKeys.find(k => k.includes('valor_proposto_total') || k.includes('value')) || null
  if (normPdf === 'condicoes_pagamento' || normPdf.includes('pagamento')) return buyerDataKeys.find(k => k.includes('condicoes_pagamento') || k.includes('installments')) || null
  
  const mappedBase = mapBaseField(normPdf)
  const targetKey = `proponente_1_${mappedBase}`
  
  const found = buyerDataKeys.find(k => k === targetKey)
  if (found) return found
  
  const foundSimilar = buyerDataKeys.find(k => {
    const normK = k.replace(/[^a-z0-9]/g, '')
    return normK.includes(mappedBase.replace(/[^a-z0-9]/g, '')) && k.includes('proponente_1')
  })
  
  if (foundSimilar) return foundSimilar

  return buyerDataKeys.find(k => {
    const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normP = normPdf.replace(/[^a-z0-9]/g, '')
    return normK === normP || normK.includes(normP) || normP.includes(normK)
  }) || null
}
