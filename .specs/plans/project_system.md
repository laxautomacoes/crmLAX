# CRM LAX: Design System & UI Standards

Este documento é a fonte única de verdade para a interface do CRM LAX. Deve ser consultado antes de qualquer nova implementação para garantir consistência visual em todo o sistema.

## 1. Identidade Cromática (Paleta de Cores)

| Elemento | Hex Code | Uso Principal |
| :--- | :--- | :--- |
| **Petrol (Primária)** | `#404F4F` | Sidebar, Títulos, Botões neutros/secundários, Texto principal. |
| **Yellow (Secundária)** | `#FFE600` | Botões de ação principal (CTA), Destaques de marca. |
| **Background (Páginas)** | `#F0F2F5` | Fundo de páginas da Dashboard e Login. |
| **Background (Cards)** | `#FFFFFF` | Fundo de cards, modais e áreas de conteúdo. |
| **Gray 50/100** | `#F9FAFB` / `#F3F4F6` | Fundo de inputs, bordas suaves de cards. |
| **Gray 500/800/900** | `#6B7280` / `#1F2937` / `#111827`| Placeholders (500), Labels (800), Texto de Input (900). |
| **Success** | `#00B087` / `#10B981` | Badges de status 'Ganho', confirmações. |
| **Danger** | `#EF4444` | Botões de exclusão, erros, alertas críticos. |

> [!NOTE]
> **Regra de Contraste**: Para textos ou ícones sobre fundos claros (#FFFFFF ou #F0F2F5), **nunca** use Amarelo (#FFE600) puro. Utilize a cor Petrol (#404F4F) via `text-accent-icon` para garantir a legibilidade. O Amarelo é usado automaticamente no dark mode através da mesma variável. O Amarelo direto (`text-[#FFE600]`) só deve ser usado em contextos com fundo explicitamente escuro (landing pages, sidebar, botões preenchidos).

> [!IMPORTANT]
> **Variável `accent-icon`**: Usar `text-accent-icon` (e `bg-accent-icon`, `border-accent-icon`) para ícones, textos de destaque e bordas decorativas. Light: `#404F4F` (Petrol). Dark: `#FFE600` (Amarelo). Nunca usar `text-[#FFE600]` em componentes do dashboard/CRM.

---

## 2. Tipografia

- **Font Sans**: `Geist Sans` (Next.js default).
- **Font Mono**: `Geist Mono`.
- **Títulos de Página**: `text-2xl font-bold text-[#404F4F]`.
- **Legendas de Página**: `text-sm text-gray-500 mt-4 md:mt-1`.
- **Títulos de Card**: `font-semibold text-gray-900` ou `font-bold text-[#404F4F]`.
- **Labels de Input**: `text-sm font-bold text-gray-800 ml-1`.
- **Textos de Corpo**: `text-sm font-medium` ou `text-base`.

---

## 3. Elementos de Layout (Bordas e Arredondamentos)

Seguir rigorosamente para evitar inconsistências visuais:

- **Cards Principais**: `rounded-2xl` (16px).
- **Inputs (Campos)**: `rounded-lg` (8px).
- **Botões (Padrão)**: `rounded-lg` (8px).
- **Botões de Header**: `px-4 py-3 md:py-2` (Padrão de altura: 48px mobile / 40px desktop).
- **Modais e Overlays**: `rounded-2xl` (16px).
- **Badges e Avatares**: `rounded-full`.
- **Bordas**: `border border-gray-100` ou `border-gray-200` para separação sutil.

---

## 4. Espaçamento e Grid

- **Padding de Página (Desktop)**: `max-w-[1600px] mx-auto space-y-6 md:space-y-8`.
- **Padding interno de Cards**: `p-6` (padrão) ou `p-8` (áreas de destaque como Login).
- **Espaçamento entre Inputs**: `space-y-4` ou `space-y-5`.
- **Gap entre Cards**: `gap-6` (grid padrão).

---

## 5. Padrões de Interação (Hover & Focus)

- **Botões Yellow**: `hover:bg-[#F2DB00] transition-all transform active:scale-[0.99]`.
- **Botões Petrol (Neutros)**: `text-[#404F4F] border-[#404F4F]/20 hover:bg-[#404F4F]/5 transition-all`. Para botões preenchidos: `bg-[#404F4F] text-white hover:bg-[#2d3939]`.
- **Inputs**: `focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none`.
- **Animações de Entrada**: `animate-in fade-in slide-in-from-bottom-4 duration-300`.

---

## 6. Page Headers (Padrão de Título)

Todas as telas principais devem utilizar o componente `<PageHeader />` para garantir o alinhamento:

- **Title**: `text-2xl font-bold text-foreground` (`#404F4F`).
- **Subtitle**: `text-sm text-muted-foreground mt-4 md:mt-1`.
- **Layout (Desktop)**: `flex justify-between items-center gap-4`. Alinhamento `md:text-left`.
- **Layout (Mobile)**: `text-center`, seguido de um separador `h-px bg-foreground/25 w-full mt-2 mb-6`.
- **Botões de Ação**: Alinhados à direita no desktop e centralizados no mobile, com `gap-3`.
- **Botões de Ação (Padding)**: Sempre utilizar `px-4 py-3 md:py-2` para garantir consistência de altura e usabilidade em telas touch.

---

> [!IMPORTANT]
> A seriedade do sistema é transmitida pela precisão matemática dos arredondamentos e o uso equilibrado do Petrol com o Amarelo. **Nunca** utilize `rounded-3xl` ou `rounded-xl` em novos layouts sem autorização prévia.
