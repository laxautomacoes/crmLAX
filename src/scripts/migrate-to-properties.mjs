import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_REF = 'vkrpmxratnkywywqoecv';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function applySql() {
  if (!ACCESS_TOKEN) {
    console.error('Erro: SUPABASE_ACCESS_TOKEN não encontrado no .env');
    return;
  }

  const sqlPath = path.join(__dirname, '../../supabase/migrations/20260419000000_rename_assets_to_properties.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Tentando aplicar migração de nomes ao projeto ' + PROJECT_REF + '...');

  try {
    const response = await fetch('https://api.supabase.com/v1/projects/' + PROJECT_REF + '/sql', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Migração de banco aplicada com sucesso!');
      console.log(result);
    } else {
      console.log('❌ Erro ao aplicar migração:', result);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

applySql();
