# Plano de Implementação - Remoção de Destaque Amarelo

Este plano visa remover as bordas e textos amarelos que surgem ao passar o mouse (hover) nos componentes do funil de vendas (Kanban) e substituí-los por um destaque em cor escura (Preto/Petrol), conforme solicitado pelo usuário.

## Alterações Necessárias

### 1. Componente `PipelineColumn`
- Local: `src/components/dashboard/leads/PipelineColumn.tsx`
- Alterar o botão "+ Novo Lead":
    - Remover `hover:border-primary` e `dark:hover:border-secondary`.
    - Remover `hover:text-primary` e `dark:hover:text-secondary`.
    - Adicionar `hover:border-foreground` e `hover:text-foreground` (ou uma cor escura específica).
    - Ajustar o ícone `Plus` para seguir essa mesma lógica.

### 2. Componente `LeadCard`
- Local: `src/components/dashboard/leads/LeadCard.tsx`
- Alterar o card principal:
    - Remover `hover:border-primary` e `dark:hover:border-secondary`.
    - Adicionar `hover:border-foreground` para um destaque escuro constante.
- Alterar o botão "Ver Detalhes":
    - Remover `hover:bg-secondary/20` e o ícone `text-secondary`.
    - Usar cores neutras/escuras para o hover.

## Tasks

- [ ] Modificar `PipelineColumn.tsx` para remover amarelo do hover no botão de novo lead.
- [ ] Modificar `LeadCard.tsx` para remover amarelo do hover na borda do card e no botão de detalhes.
- [ ] Verificar se há outros elementos no board com este padrão.

## Walkthrough
1. Identificar as classes `hover:border-secondary` e `dark:hover:border-secondary`.
2. Substituí-las por `hover:border-foreground` ou `hover:border-black/80`.
3. Validar a consistência visual.
