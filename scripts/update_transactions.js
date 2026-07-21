require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data: transactions, error } = await supabase
    .from('transacoes_financeiras')
    .select('id, descricao');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${transactions.length} transactions`);
  let count = 0;

  for (const t of transactions) {
    if (!t.descricao) continue;

    let newDesc = t.descricao;
    // Replace "Comissão Parcela" with "Comissão"
    newDesc = newDesc.replace(/Comissão Parcela/g, 'Comissão');
    // Replace "Repasse Corretor Parcela" with "Corretor"
    newDesc = newDesc.replace(/Repasse Corretor Parcela/g, 'Corretor');
    // Replace "Comissão Corretor Parcela" with "Corretor"
    newDesc = newDesc.replace(/Comissão Corretor Parcela/g, 'Corretor');
    // Replace "Repasse Parceria Parcela" with "Parceria"
    newDesc = newDesc.replace(/Repasse Parceria Parcela/g, 'Parceria');
    // Replace "Comissão Parceiro Parcela" with "Parceria"
    newDesc = newDesc.replace(/Comissão Parceiro Parcela/g, 'Parceria');

    if (newDesc !== t.descricao) {
      console.log(`Updating: ${t.descricao} -> ${newDesc}`);
      const { error: upError } = await supabase
        .from('transacoes_financeiras')
        .update({ descricao: newDesc })
        .eq('id', t.id);
      
      if (upError) console.error(upError);
      else count++;
    }
  }

  console.log(`Updated ${count} transactions`);
}

main();
