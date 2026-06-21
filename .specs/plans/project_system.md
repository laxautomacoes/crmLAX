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

- **Cards Principais**: `rounded-lg` (8px).
- **Inputs (Campos)**: `rounded-lg` (8px).
- **Botões (Padrão)**: `rounded-lg` (8px).
- **Botões de Header**: `px-4 py-3 md:py-2` (Padrão de altura: 48px mobile / 40px desktop).
- **Modais e Overlays**: `rounded-lg` (8px).
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

## 7. Padronização Completa de Tabelas

Todas as tabelas do CRM LAX devem seguir rigorosamente as diretrizes abaixo para garantir consistência de fontes, cores, divisores e alinhamentos:

### 1. Estrutura e Container
- **Container Principal (Wrapper):** `bg-card rounded-xl border border-muted-foreground/30 overflow-hidden shadow-sm`
- **Rolagem Horizontal:** Sempre envelopar a tabela com `<div className="overflow-x-auto">` para garantir usabilidade em telas mobile.
- **Layout de Tabela:** `<table className="w-full text-left" style={{ tableLayout: 'fixed' }}>` (utilizar layout fixo para controle exato da largura das colunas).

### 2. Cabeçalho (`<thead>`)
- **Cor de Fundo (Modo Claro):** `bg-gray-200` (cinza `#E5E7EB` sólido para destaque claro).
- **Cor de Fundo (Modo Escuro):** `dark:bg-muted/50` (preservando opacidade e tom escuro).
- **Borda Inferior:** `border-b border-muted-foreground/30`.
- **Fonte do Título:** `text-[10px] font-bold text-foreground uppercase tracking-wider`.
- **Padding:** `px-4 py-4`.
- **Alinhamento:** O alinhamento horizontal do título deve coincidir perfeitamente com o alinhamento da respectiva informação na célula (ex: se o conteúdo é centralizado, o cabeçalho usa `text-center`).
  - *Exemplo de Alinhamento e Classes (Propostas):*
    - **Imóvel:** Alinhamento à esquerda (`text-left`) em cabeçalho e célula.
    - **Valor tabela / Valor proposto:** Alinhamento à direita (`text-right`) em cabeçalho e célula.
    - **Criado em / Atualizado em / Status / Ações:** Centralizado (`text-center`) em cabeçalho e célula.

### 3. Corpo da Tabela (`<tbody>`)
- **Divisor de Linhas:** `divide-y divide-muted-foreground/30`.
- **Efeito Hover na Linha (`<tr>`):** `hover:bg-muted/50 transition-colors cursor-pointer group` (caso seja clicável).
- **Células (`<td>`):**
  - **Padding:** `px-4 py-5`.
  - **Texto Principal:** `text-sm font-medium text-foreground`.
  - **Subtexto / Legendas:** `text-[10px] font-medium text-muted-foreground`.
  - **Avatares:** Compactos com `h-8 w-8 rounded-full border border-border/10 flex items-center justify-center font-bold text-xs bg-[#404F4F] text-white dark:bg-white dark:text-[#404F4F]`.
  - **Badges de Status:** `px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase whitespace-nowrap inline-block`.

### 4. Paginação e Contadores (Rodapé)
- **Espaçamento:** `mt-4 px-2 flex flex-col sm:flex-row items-center justify-between gap-4`.
- **Texto do Contador:** `text-xs text-muted-foreground`.
- **Botões de Páginas:** `w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all active:scale-[0.97]`
  - *Ativo:* `bg-secondary text-secondary-foreground shadow-sm`
  - *Inativo:* `bg-card border border-border text-foreground hover:bg-muted`

---
 
## 8. Padrão de Layout Multicolunas (Configurações / Perfis)
 
Em páginas de configurações que utilizam layouts de múltiplos cards dispostos em colunas (ex: Meu Perfil):
- **Títulos e Subtítulos Externos**: Os títulos e subtítulos das seções devem ficar localizados **fora e acima** de seus respectivos cards de conteúdo.
- **Estrutura dos Títulos**: Usar `<h3 className="text-lg font-bold text-foreground">`. Não utilizar ícones decorativos junto a esses títulos.
- **Estrutura dos Subtítulos**: Usar `<p className="text-sm text-muted-foreground">` posicionado logo abaixo do título correspondente para contextualização rápida.
- **Alinhamento e Espaçamento**: O contêiner de cada coluna deve usar a estrutura `flex flex-col space-y-3` para agrupar o cabeçalho externo e o card, mantendo o espaçamento padrão de 12px.
- **Card de Conteúdo**: O card interno (ex: `bg-card p-6 rounded-lg border border-border`) não deve conter títulos ou descrições redundantes em seu interior.
- **Alinhamento pelo Topo no Desktop**: Para garantir que os cards comecem na mesma linha horizontal quando os subtítulos externos têm número de linhas diferente no desktop, o cabeçalho externo deve possuir uma altura mínima constante e alinhamento inferior no desktop (ex: classe `md:min-h-[85px] flex flex-col justify-end pb-1`). Isso impede que a variação de linhas de texto empurre um card para baixo desordenadamente.

---

> [!IMPORTANT]
> A seriedade do sistema é transmitida pela precisão matemática dos arredondamentos e o uso equilibrado do Petrol com o Amarelo. **Nunca** utilize `rounded-3xl` ou `rounded-xl` em novos layouts sem autorização prévia.
