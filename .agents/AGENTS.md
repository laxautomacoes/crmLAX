# CRM LAX — Design System & Regras de Construção

Este documento é a **fonte única de verdade** para interface e construção do CRM LAX.
Leia antes de qualquer implementação para garantir consistência visual em todo o sistema.

---

## 0. Instruções para o Agente de IA

1. Sempre entregue Plano de Implementação, Tasks e Walkthroughs em **PT-BR**.
2. Sempre consulte `project_specs.md` antes de implementar funcionalidades de produto, banco de dados ou arquitetura.
3. Mantenha rigorosamente o padrão de construção das páginas: fontes, cores, espaçamentos, centralizações, arredondamentos, posições e alinhamentos.
4. Nunca utilize o termo **"site vitrine"**. O termo correto é exclusivamente **"site"**.
5. É **proibido** usar a função nativa `confirm()` do navegador. Use sempre o componente `ConfirmModal` em `@/components/shared/ConfirmModal`.

---

## 1. Identidade Cromática (Paleta de Cores)

| Elemento | Hex Code | Uso Principal |
| :--- | :--- | :--- |
| **Petrol (Primária)** | `#404F4F` | Sidebar, Títulos, Botões neutros/secundários, Texto principal. |
| **Yellow (Secundária)** | `#FFE600` | Botões de ação principal (CTA), Destaques de marca. |
| **Background (Páginas)** | `#F0F2F5` | Fundo de páginas da Dashboard e Login. |
| **Background (Cards)** | `#FFFFFF` | Fundo de cards, modais e áreas de conteúdo. |
| **Gray 50/100** | `#F9FAFB` / `#F3F4F6` | Fundo de inputs, bordas suaves de cards. |
| **Gray 500/800/900** | `#6B7280` / `#1F2937` / `#111827` | Placeholders (500), Labels (800), Texto de Input (900). |
| **Success** | `#00B087` / `#10B981` | Badges de status 'Ganho', confirmações. |
| **Danger** | `#EF4444` | Botões de exclusão, erros, alertas críticos. |

### Regras de Contraste (OBRIGATÓRIAS)

- `text-secondary` (#FFE600) é **PROIBIDO** como cor de texto sobre fundos claros (`bg-card`, `bg-muted`, `bg-background` no modo claro). O contraste é insuficiente.
- Para textos informativos, labels, badges e valores: usar SEMPRE `text-foreground` ou `text-muted-foreground`.
- `text-secondary` só é permitido em: (1) botões com `bg-secondary` usando `text-secondary-foreground`, (2) hovers em modo escuro, (3) bordas e fundos (`border-secondary`, `bg-secondary/10`).
- Para ícones de destaque, usar `text-accent-icon` → `#404F4F` no light, `#FFE600` no dark. Nunca usar `text-[#FFE600]` em componentes do dashboard.
- Na dúvida, usar `text-foreground`. Nunca sacrificar legibilidade por estética.

---

## 2. Tipografia

- **Font Sans**: `Geist Sans` (Next.js default).
- **Font Mono**: `Geist Mono`.
- **Títulos de Página**: `text-2xl font-bold text-foreground`.
- **Legendas de Página**: `text-sm text-muted-foreground mt-4 md:mt-1`.
- **Títulos de Card**: `font-semibold text-foreground` ou `font-bold text-foreground`.
- **Labels de Input**: `text-xs font-bold text-foreground ml-1`.
- **Textos de Corpo**: `text-sm font-medium` ou `text-base`.
- **Cabeçalhos de Tabela**: `text-[10px] font-bold text-foreground uppercase tracking-wider`. Nunca `text-xs` ou `text-muted-foreground` em `<th>`.
- **Títulos de Seção em Modais**: `text-sm font-bold text-foreground uppercase tracking-widest`.
- **Títulos de Header de Modal (h3)**: `text-base font-black text-foreground uppercase tracking-widest`.

---

## 3. Arredondamentos e Bordas

- **Cards e Containers Principais**: `rounded-lg` (4px). Nunca `rounded-3xl` ou `rounded-xl` sem autorização.
- **Inputs**: `rounded-lg`.
- **Botões**: `rounded-lg`.
- **Modais e Overlays**: `rounded-lg`.
- **Tags, Badges e Avatares**: `rounded-full` ou `rounded-md`.
- **Bordas de separação**: `border border-border` (sempre tokens semânticos).

---

## 4. Espaçamento e Grid

- **Padding de Página (Desktop)**: `max-w-[1600px] mx-auto space-y-6 md:space-y-8`.
- **Padding interno de Cards**: `p-6` (padrão) ou `p-8` (áreas de destaque como Login).
- **Espaçamento entre Inputs**: `space-y-4` ou `space-y-5`.
- **Gap entre Cards**: `gap-6` (grid padrão).
- **Mobile — Título e Subtítulo**: sempre `mt-4` para respiro visual adequado.

---

## 5. Padrões de Interação (Hover & Focus)

- **Botões Yellow**: `hover:bg-[#F2DB00] transition-all transform active:scale-[0.99]`.
- **Botões Petrol (Neutros)**: `text-foreground border-border/20 hover:bg-muted/50 transition-all`.
- **Inputs**: `focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none`.
- **Animações de Entrada**: `animate-in fade-in slide-in-from-bottom-4 duration-300`.

---

## 6. Page Headers

Todas as telas principais devem usar o componente `<PageHeader />`.

- **Title**: `text-2xl font-bold text-foreground`.
- **Subtitle**: `text-sm text-muted-foreground mt-4 md:mt-1`.
- **Layout Desktop**: `flex justify-between items-center gap-4`, alinhamento `md:text-left`.
- **Layout Mobile**: `text-center`, seguido de separador `h-px bg-foreground/25 w-full mt-2 mb-6`.
- **Altura Constante**: quando não há subtítulo, o `PageHeader` insere `<div className="hidden md:block h-[20px] mt-1" aria-hidden="true" />` para igualar o espaçamento.

### Separador de Cabeçalho (Desktop)

Logo após o `PageHeader`. Espaçamento herdado do container pai (`space-y-8` ou `gap-8`). Nunca adicionar `mt-` ou `mb-` manuais no `<hr>`.

- **Página SEM subtítulo**: `<hr className="hidden md:block border-border" />`
- **Página COM subtítulo**: `<hr className="hidden md:block border-border -mt-2" />` (o `-mt-2` anula o espaço fantasma do `items-center`)

### Botões de Ação do Header

- Altura obrigatória: `h-[34px]`.
- **Classe mestra**: `h-[34px] min-w-[130px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-sm font-bold uppercase tracking-wide shadow-sm whitespace-nowrap`.
- **Ícone Lucide**: `size={14} strokeWidth={1}`.

---

## 7. Tabelas

### Container Principal

```
bg-card rounded-xl border border-muted-foreground/30 overflow-hidden shadow-sm
```

Sempre envelopar com `<div className="overflow-x-auto">`. Layout: `<table className="w-full text-left" style={{ tableLayout: 'fixed' }}>`.

### Cabeçalho (`<thead>`)

- **Fundo**: `bg-gray-200 dark:bg-muted/50`.
- **Borda inferior**: `border-b border-muted-foreground/30`.
- **Fonte**: `text-[10px] font-bold text-foreground uppercase tracking-wider`.
- **Padding**: `px-4 py-4`.
- **Alinhamento**: cabeçalho e célula correspondente SEMPRE com o mesmo alinhamento.

### Corpo (`<tbody>`)

- **Divisor de linhas**: `divide-y divide-muted-foreground/30`.
- **Hover na linha**: `hover:bg-muted/50 transition-colors cursor-pointer group`.
- **Células `<td>`**: padding `px-4 py-5`, texto `text-sm font-medium text-foreground`, subtexto `text-[10px] font-medium text-muted-foreground`.
- **Avatares**: `h-8 w-8 rounded-full border border-border/10 flex items-center justify-center font-bold text-xs bg-[#404F4F] text-white dark:bg-white dark:text-[#404F4F]`.
- **Badges de Status**: `px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase whitespace-nowrap inline-block`.

### Paginação (Rodapé)

- Container: `mt-4 px-2 flex flex-col sm:flex-row items-center justify-between gap-4`.
- Contador: `text-xs text-muted-foreground`.
- Botões: `w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all active:scale-[0.97]`.
  - Ativo: `bg-secondary text-secondary-foreground shadow-sm`.
  - Inativo: `bg-card border border-border text-foreground hover:bg-muted`.

---

## 8. Modais

### Header de Modal

Todo `h3` de título de modal: `text-base font-black text-foreground uppercase tracking-widest`.

### Separadores de Seção dentro de Modais

- **Container principal**: `space-y-8` (32px entre seções filhas).
- **Primeira seção** (sem separador): `space-y-4`.
- **Demais seções** (com separador): `space-y-4 pt-8 border-t border-border/50`. Distância total: 64px.
- **Título de seção**: `<h3 className="text-sm font-bold text-foreground uppercase tracking-widest">`.
- Nunca usar `<hr>` com `py-3`. Usar sempre `border-t` no `<div>` da seção.
- Cada seção deve ser filha direta do container `space-y-8`.

### Modais de Alerta e Confirmação

É proibido usar `confirm()` nativo. Sempre usar `ConfirmModal` em `@/components/shared/ConfirmModal`.

Estrutura obrigatória:

```tsx
<div className="flex flex-col text-center items-center">
  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
    <AlertTriangle size={24} className="text-red-500" />
  </div>
  <div>
    <h3 className="text-base font-black text-foreground uppercase tracking-widest">
      Título do Alerta
    </h3>
    <p className="text-sm text-muted-foreground leading-snug mt-1">
      <span className="block">Primeira frase de alerta.</span>
      <span className="block">Segunda frase detalhando a consequência.</span>
      <span className="block">Esta ação não pode ser desfeita.</span>
    </p>
  </div>
</div>
```

---

## 9. Dark Mode (Design Tokens)

**Extremamente proibido** usar cores fixas/hardcoded em estruturas de componentes:

| Proibido | Correto |
|---|---|
| `bg-gray-50`, `bg-white` | `bg-card`, `bg-background` |
| `border-gray-100`, `border-gray-200` | `border-border` |
| `text-gray-900`, `text-gray-800` | `text-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `bg-white border-gray-200` (inputs) | `bg-background border-input` ou `bg-muted/30` |

- **Tags/Badges com cores de paleta**: sempre declarar variante dark mode. Ex: `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`.

---

## 10. Formulários e Inputs

### Labels e Inputs

- Container: `<div className="flex flex-col">` — nunca `space-y-2` no pai (componentes Headless UI invisíveis quebram esse padrão).
- Espaçamento direto no label: `<label className="text-xs font-bold text-foreground ml-1 mb-2">`.
- Distância padrão: `mb-2`.
- **Unificação e Coesão**: Todos os componentes de entrada compartilhados (`FormInput`, `FormSelect`, `FormTextarea`) devem aplicar obrigatoriamente a mesma estilização para seus labels: `text-xs font-bold text-foreground ml-1 mb-2`. É proibida qualquer discrepância de fonte ou margem inferior entre eles.

### Upload / Dropzones

- **Proibido**: `border-dashed`, `hover:border-accent` colorido.
- **Correto**: `border border-border/40 bg-background hover:bg-gray-50 dark:hover:bg-muted/30 transition-all rounded-lg`.

### Dropdowns (`<select>`)

- Sempre usar `appearance-none` para remover seta nativa do navegador.
- Incluir manualmente o ícone `ChevronDown` do `lucide-react`.

---

## 11. Abas de Navegação (Tabs)

### Cabeçalho de Aba (Espaçamento)

- Container pai da coluna: `flex flex-col space-y-3`.
- Bloco interno de título + subtítulo: `px-1 space-y-1`.
- Nunca usar `min-h-[]` forçado nos cabeçalhos.

### Abas Horizontais (Active Tabs)

- Classe base: `px-6 py-3 text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap`.
- **Ativa**: `text-foreground border-b-[3px] active-tab-indicator`.
- **Inativa**: `text-muted-foreground hover:text-foreground`.
- **Ícones Lucide**: `size={18} strokeWidth={1}`.

---

## 12. View Toggle (Lista / Grid)

- **Botão ativo**: `bg-secondary text-secondary-foreground`. O botão ativo deve preencher todo o espaço vertical e lateral destinado a ele na barra, sem margens ou paddings internos no container.
- **Botão inativo**: `text-muted-foreground hover:bg-muted`.
- **Container**: `bg-card border border-border rounded-lg overflow-hidden shadow-sm flex items-center p-0`. Os botões internos devem preencher 100% da altura da barra, e o arredondamento das pontas é herdado do container por meio da propriedade `overflow-hidden`.


---

## 13. Dropdown de Ações em Tabelas/Listas

- **Botão (MoreVertical)**: `p-2 bg-muted text-foreground rounded-lg shadow-sm`.
- **Menu**: `w-44 bg-card border-border rounded-lg shadow-xl overflow-hidden z-30`.
- **Items**: `px-4 py-2.5 text-sm text-foreground`.
- **Cores de ícones**: azul = editar/ver, âmbar = arquivar, vermelho = excluir.
- **Fechar ao clicar fora**: `useRef + useEffect` com listener `mousedown`.

---

## 14. Layout Multicolunas (Configurações / Perfis)

- Títulos e subtítulos ficam **fora e acima** dos respectivos cards.
- **Título externo**: `<h3 className="text-lg font-bold text-foreground">`. Sem ícones decorativos.
- **Subtítulo externo**: `<p className="text-sm text-muted-foreground">` imediatamente abaixo.
- **Container da coluna**: `flex flex-col space-y-3`.
- **Alinhamento pelo topo no desktop** (quando subtítulos têm alturas diferentes): `md:min-h-[85px] flex flex-col justify-end pb-1`.
- **Card interno**: `bg-card p-6 rounded-lg border border-border` — sem títulos redundantes dentro.

---

## 15. Textos de Instrução e Subtítulos

Sempre que houver texto de instrução, subtítulo ou descrição longa:

1. **Frases separadas por linha**: nunca bloco de texto contínuo. Usar `<span className="block">`.
2. **Entrelinhas reduzido**: `leading-snug` na tag `<p>` pai.
3. **Distância curta ao título**: `mt-1` na `<p>`. Agrupar título e subtítulo na **mesma `<div>`**.

```tsx
<div>
  <h4 className="text-base font-black text-foreground uppercase tracking-widest">
    Título da Seção
  </h4>
  <p className="text-xs text-muted-foreground leading-snug mt-1">
    <span className="block">Primeira frase de instrução detalhada.</span>
    <span className="block">Segunda frase para complementar a instrução.</span>
  </p>
</div>
```

---

## 16. Cards de DNS (Configurações de Domínio)

- Labels dos registros (Tipo, Host, Valor, Prioridade, TTL): obrigatoriamente `w-20` (80px).
- Classe: `text-[9px] font-bold text-muted-foreground uppercase tracking-wider w-20`.
- Nunca usar `w-8` ou `w-14`.

---

## 17. Ícones em Botões

- Não inserir ícones em botões salvo onde estritamente necessário para compreensão (setas de paginação, menu hambúrguer).
- Botões "Confirmar Exclusão", "Salvar", "Cancelar" contêm apenas texto.
- Objetivo: estética clean, sem poluição visual decorativa.

---

## 18. Ordenação de Listas e Checkboxes

- Checkboxes, listas de seleção e modais com atributos (Amenidades, Condomínio, Especificações, Características) DEVEM ser organizados em **ordem alfabética**.
