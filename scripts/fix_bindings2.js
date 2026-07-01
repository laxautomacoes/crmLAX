require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const bindingsMap = {
  // Proponente 1
  'proponente_1_nome': 'contact.name',
  'proponente_1_c_ident': 'contact.rg_cnh',
  'proponente_1_orgao_exp': 'contact.issuing_agency',
  'proponente_1_data_exp': 'contact.rg_cnh_date',
  'proponente_1_cpf': 'contact.cpf',
  'proponente_1_data_nasc': 'contact.birth_date',
  'proponente_1_nacionalidade': 'contact.nationality',
  'proponente_1_naturalidade': 'contact.naturalness',
  'proponente_1_filiacao_pai': 'contact.father_name',
  'proponente_1_filiacao_mae': 'contact.mother_name',
  'proponente_1_estado_civil': 'contact.marital_status',
  'proponente_1_regime_casamento': 'contact.property_regime',
  'proponente_1_profissao': 'contact.profession',
  'proponente_1_email': 'contact.email',
  'proponente_1_celular': 'contact.phone',
  'proponente_1_data_casamento': 'contact.marriage_date',
  
  // Proponente 2 (Cônjuge)
  'proponente_2_nome': 'contact.spouse_name',
  'proponente_2_c_ident': 'contact.spouse_rg_cnh',
  'proponente_2_orgao_exp': 'contact.spouse_issuing_agency',
  'proponente_2_data_exp': 'contact.spouse_rg_cnh_date',
  'proponente_2_cpf': 'contact.spouse_cpf',
  'proponente_2_data_nasc': 'contact.spouse_birth_date',
  'proponente_2_nacionalidade': 'contact.spouse_nationality',
  'proponente_2_naturalidade': 'contact.spouse_naturalness',
  'proponente_2_filiacao_pai': 'contact.spouse_father_name',
  'proponente_2_filiacao_mae': 'contact.spouse_mother_name',
  'proponente_2_estado_civil': 'contact.spouse_marital_status',
  'proponente_2_regime_casamento': 'contact.spouse_property_regime',
  'proponente_2_profissao': 'contact.spouse_profession',
  'proponente_2_email': 'contact.spouse_email',
  'proponente_2_celular': 'contact.spouse_phone'
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
