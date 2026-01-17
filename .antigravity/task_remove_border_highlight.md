# Plano de Implementação - Remoção de Destaque de Borda em Leads

Remover os efeitos de destaque de borda (pretos no modo claro e amarelos no modo escuro) dos cards de lead e botões relacionados na seção de Leads, conforme solicitado pelo usuário.

## Alterações Propostas

### 1. Componente LeadCard
- Remover o destaque de borda e o anel (ring) quando o card está em modo de sobreposição (`isOverlay`).
- Remover o destaque de borda quando o card está expandido (`isExpanded`).
- Remover o destaque de borda no hover do botão "Ver Detalhes".

### 2. Componente PipelineColumn
- Remover o destaque de borda no hover do botão "+ Novo Lead".

## Tasks

- [ ] Remover destaques de borda em `src/components/dashboard/leads/LeadCard.tsx` <!-- id: 0 -->
- [ ] Remover destaques de borda em `src/components/dashboard/leads/PipelineColumn.tsx` <!-- id: 1 -->

## Walkthrough

### LeadCard.tsx
- Localizar a div principal e remover as classes de borda e ring dentro das condicionais `${isOverlay ? ...}` e `${isExpanded ? ...}`.
- Localizar o botão "Ver Detalhes" e remover `hover:border-[#000000]` e `dark:hover:border-secondary`.

### PipelineColumn.tsx
- Localizar o botão "Novo Lead" e remover `hover:border-[#000000]` e `dark:hover:border-secondary`.
