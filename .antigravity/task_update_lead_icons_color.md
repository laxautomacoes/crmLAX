# Plano de Implementação - Alteração de Cor dos Ícones no LeadCard

Alterar a cor dos ícones no componente `LeadCard` (Leads) de Amarelo para uma cor escura e sóbria (Petrol/Cinza), conforme solicitado pelo usuário.

## Alterações Propostas

### 1. Componente LeadCard
- Remover as classes de cor amarela (`dark:text-secondary`) dos ícones de contato e de ação.
- Padronizar os ícones com a cor de destaque do sistema (Petrol) ou uma variante neutra escura (`text-foreground/70`).

## Tasks

- [ ] Alterar cores dos ícones em `src/components/dashboard/leads/LeadCard.tsx` <!-- id: 0 -->

## Walkthrough

### LeadCard.tsx
- Localizar o ícone `Phone` e alterar sua classe para `text-foreground/70`.
- Localizar o ícone `Mail` e alterar sua classe para `text-foreground/70`.
- Localizar o ícone `Sparkles` (dentro do botão "Ver Detalhes") e alterar sua classe para `text-foreground/60`.
