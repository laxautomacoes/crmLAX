# Plano de Implementação - Remoção do Botão "Ver Detalhes"

Remover o botão "Ver Detalhes" do componente `LeadCard` na seção de Leads, simplificando a visualização dos detalhes do lead.

## Alterações Propostas

### 1. Componente LeadCard
- Remover o elemento `<button>` que contém o texto "Ver Detalhes" e o ícone `Sparkles`.
- Ajustar a renderização do rodapé do card expandido para exibir apenas o valor do lead, se disponível.

## Tasks

- [ ] Remover botão "Ver Detalhes" em `src/components/dashboard/leads/LeadCard.tsx` <!-- id: 0 -->

## Walkthrough

### LeadCard.tsx
- Localizar o bloco de código do botão "Ver Detalhes" (dentro do `isExpanded` footer).
- Remover o botão e as classes de layout associadas que não forem mais necessárias.
