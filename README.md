This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel (CRM LAX)

1. **Repositório**: Suba o código para o GitHub/GitLab.
2. **Importação**: No painel da Vercel, importe o repositório.
3. **Variáveis de Ambiente**: Configure as seguintes chaves:
   - `NEXT_PUBLIC_ROOT_DOMAIN`: Domínio base (ex: `crmlax.com.br`)
   - `NEXT_PUBLIC_SUPABASE_URL`: URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key do Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key
   - `GOOGLE_GEMINI_API_KEY`: Chave da API Gemini
4. **Build & Deploy**: O arquivo `vercel.json` já contém as configurações necessárias. O sistema está pronto para ser escalado como SaaS multi-tenant.
