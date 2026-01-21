PROJECT SPECIFICATIONS: CRM LAX

1. VISÃO DO PRODUTO
O CRM LAX é uma plataforma vertical (SaaS) para imobiliárias e corretores independentes.
O diferencial é ser um sistema "limpo", focado em automação real e inteligência de dados, eliminando a complexidade genérica de CRMs imobiliários disponíveis no mercado.

2. ARQUITETURA TÉCNICA (CORE STACK)
- Framework: Next.js 14+ (App Router).
- Linguagem: TypeScript (Strict Mode).
- UI/UX: Tailwind CSS, Shadcn/UI, Lucide Icons.
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- IA: Google Generative AI (Gemini 1.5 Flash).
- Integrações: N8N (Webhooks), Resend (E-mail), API WhatsApp (Oficial/Não-Oficial).
- Hospedagem: Vercel (Frontend/Middleware).

Regras de Ouro (Engineering Constraints):
- Regra das 100 Linhas: Nenhum arquivo ou função deve ultrapassar 100 linhas.
- Refatorar em componentes atômicos é obrigatório.
- Modularidade: Código reaproveitável entre CRM e Site Vitrine.
- PWA: O sistema deve ser 100% responsivo e instalável via navegador.
- Segurança (RLS): Row Level Security rigoroso no Supabase por tenant_id.

3. MODELAGEM DE DADOS (SUPABASE SCHEMA)
Core:
- tenants: id, name, slug, custom_domain, plan_type, branding (jsonb), api_key.
- profiles: id (auth), tenant_id, full_name, role (superadmin|admin|user), whatsapp_number.

CRM & Vendas:
- contacts: id, tenant_id, name, phone, email, tags (jsonb), created_at. (Dados únicos do cliente).
- leads: id, contact_id, tenant_id, asset_id (fk), status (kanban_step), source, utm_data (jsonb), assigned_to (profile_id).
- assets (Estoque): id, tenant_id, type (house|apartment|land|commercial), title, price, status, details (jsonb), images (jsonb).
- interactions: id, lead_id, type (whatsapp|system|note), content, metadata (jsonb).

IA & Logs:
- ai_usage: id, tenant_id, profile_id, model, total_tokens, feature_context.
- updates: id, title, description, type (feature|fix|roadmap), status, published_at. (Público).

4. FLUXO DE LEADS & AUTOMAÇÃO (N8N)
O sistema não terá lógica de negócio no n8n. O n8n é o Ingestion Layer.

Endpoint Único: /api/v1/webhooks/leads.

Lógica Interna (CRM):
- Receber Payload do n8n (Ads, Site, Whats).
- Upsert no contacts (pelo telefone).
- Criar nova entrada em leads vinculada ao contato.
- Aplicar tags de origem automaticamente.

5. MÓDULO IA (GEMINI INTEGRATION)
- Engine: Gemini 2.5 Flash.
- Monitoramento: Cada requisição deve ser precedida por uma verificação de limites e seguida por um log em ai_usage.

Funcionalidades:
- Análise de probabilidade de fechamento de lead.
- Geração de copy para anúncios com base nos detalhes do imóvel.
- Feedback de performance do vendedor.

6. MÓDULO SITE VITRINE & DOMÍNIOS
- Infra: Middleware do Next.js para gerenciar subdomain e custom_domain.
- Dinâmica: O site deve ler a tabela assets do tenant_id identificado pelo domínio.
- Conversão: Botão de WhatsApp dinâmico e formulário de lead que injeta dados direto no banco de dados via Server Actions.

7. UI/UX DESIGN SYSTEM
Cores:
- Primária: #404F4F (Cinza Petrol).
- Secundária: #FFE600 (Amarelo).

Interface CRM: Sidebar colapsável, Kanban com Drag & Drop (Touch-friendly).

Interface Site: Galeria de fotos otimizada, busca com filtros (Tipo, Quartos, Preço).

Página de Roadmap: /updates - Timeline vertical pública para transparência com o cliente.

8. REQUISITOS DE MONETIZAÇÃO
- Freemium: Limite de 20 leads/mês.
- Starter: Domínio crmlax.com/sualoja.
- Pro: Domínio Próprio, IA ilimitada (ou créditos altos) e Módulo de Site.