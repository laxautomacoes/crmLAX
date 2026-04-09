import 'dotenv/config';

const PROJECT_REF = 'vkrpmxratnkywywqoecv';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'gemini';
UPDATE plan_limits SET ai_provider = 'gemini' WHERE ai_provider IS NULL;
COMMENT ON COLUMN plan_limits.ai_provider IS 'Provedor de IA padrão para o plano (gemini ou openai)';
`;

async function applySql() {
  if (!ACCESS_TOKEN) {
    console.error('Erro: SUPABASE_ACCESS_TOKEN não encontrado no .env');
    return;
  }

  console.log(`Tentando aplicar SQL ao projeto ${PROJECT_REF}...`);

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SQL aplicado com sucesso!');
      console.log(result);
    } else {
      console.error('❌ Erro ao aplicar SQL:', result);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

applySql();
