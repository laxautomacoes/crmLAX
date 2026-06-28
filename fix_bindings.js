require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const bindingsMap = {
  'proponente_nome': 'contact.name',
  'proponente_identidade': 'contact.rg_cnh',
  'proponente_orgao_exp': 'contact.issuing_agency',
  'proponente_data_expedicao': 'contact.rg_cnh_date',
  'proponente_cpf': 'contact.cpf',
  'proponente_data_nascimento': 'contact.birth_date',
  'proponente_nacionalidade': 'contact.nationality',
  'proponente_naturalidade': 'contact.naturalness',
  'proponente_filiacao_pai': 'contact.father_name',
  'proponente_filiacao_mae': 'contact.mother_name',
  'proponente_estado_civil': 'contact.marital_status',
  'proponente_regime_casamento': 'contact.property_regime',
  'proponente_profissao': 'contact.profession',
  'proponente_email': 'contact.email',
  'proponente_celular': 'contact.phone',
  
  'proponente_2_nome': 'contact.spouse_name',
  'proponente_2_identidade': 'contact.spouse_rg_cnh',
  'proponente_2_orgao_exp': 'contact.spouse_issuing_agency',
  'proponente_2_data_expedicao': 'contact.spouse_rg_cnh_date',
  'proponente_2_cpf': 'contact.spouse_cpf',
  'proponente_2_data_nascimento': 'contact.spouse_birth_date',
  'proponente_2_nacionalidade': 'contact.spouse_nationality',
  'proponente_2_naturalidade': 'contact.spouse_naturalness',
  'proponente_2_filiacao_pai': 'contact.spouse_father_name',
  'proponente_2_filiacao_mae': 'contact.spouse_mother_name',
  'proponente_2_estado_civil': 'contact.spouse_marital_status',
  'proponente_2_regime_casamento': 'contact.spouse_property_regime',
  'proponente_2_profissao': 'contact.spouse_profession',
  'proponente_2_email': 'contact.spouse_email',
  'proponente_2_celular': 'contact.spouse_phone',
  
  'endereco_comercial_rua': 'contact.com_address_street',
  'endereco_comercial_numero': 'contact.com_address_number',
  'endereco_comercial_complemento': 'contact.com_address_complement',
  'endereco_comercial_bairro': 'contact.com_address_neighborhood',
  'endereco_comercial_cidade': 'contact.com_address_city',
  'endereco_comercial_estado': 'contact.com_address_state',
  'endereco_comercial_cep': 'contact.com_address_zip_code',
  
  'endereco_residencial_rua': 'contact.address_street',
  'endereco_residencial_numero': 'contact.address_number',
  'endereco_residencial_complemento': 'contact.address_complement',
  'endereco_residencial_bairro': 'contact.address_neighborhood',
  'endereco_residencial_cidade': 'contact.address_city',
  'endereco_residencial_estado': 'contact.address_state',
  'endereco_residencial_cep': 'contact.address_zip_code',

  // Ficha Agenciamento specific
  'nome_autorizador': 'contact.name',
  'identidade_autorizador': 'contact.rg_cnh',
  'orgao_exp_autorizador': 'contact.issuing_agency',
  'cpf_autorizador': 'contact.cpf',
  'data_nasc_autorizador': 'contact.birth_date',
  'nacionalidade_autorizador': 'contact.nationality',
  'estado_civil_autorizador': 'contact.marital_status',
  'profissao_autorizador': 'contact.profession',
  'email_autorizador': 'contact.email',
  'fone_res_autorizador': 'contact.phone',
  'celular_autorizador': 'contact.phone',
  
  'nome_conjuge': 'contact.spouse_name',
  'identidade_conjuge': 'contact.spouse_rg_cnh',
  'cpf_conjuge': 'contact.spouse_cpf',
  'data_nasc_conjuge': 'contact.spouse_birth_date',
  'nacionalidade_conjuge': 'contact.spouse_nationality',
  'estado_civil_conjuge': 'contact.spouse_marital_status',
  'profissao_conjuge': 'contact.spouse_profession',
  'email_conjuge': 'contact.spouse_email',
  'fone_res_conjuge': 'contact.spouse_phone',
  'celular_conjuge': 'contact.spouse_phone'
};

(async () => {
  const { data: templates, error } = await supabase.from('proposal_templates').select('id, name, mapped_fields');
  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }
  
  for (const template of templates) {
    let updated = false;
    const newFields = template.mapped_fields.map(field => {
      if (bindingsMap[field.name]) {
        if (field.crm_binding !== bindingsMap[field.name]) {
          field.crm_binding = bindingsMap[field.name];
          updated = true;
        }
      }
      return field;
    });

    if (updated) {
      const { error: updateError } = await supabase.from('proposal_templates').update({ mapped_fields: newFields }).eq('id', template.id);
      if (updateError) {
        console.error('Failed to update', template.name, updateError);
      } else {
        console.log('Successfully updated template:', template.name);
      }
    } else {
      console.log('No updates needed for template:', template.name);
    }
  }
})();
