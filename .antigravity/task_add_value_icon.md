# Plano de Implementação - Adição de Ícone de Valor no LeadCard

Inserir um ícone junto ao valor monetário no `LeadCard` (Leads), seguindo o padrão visual (cor, tamanho e alinhamento) dos ícones de Telefone e E-mail.

## Alterações Propostas

### 1. Componente LeadCard
- Importar o ícone `CircleDollarSign` do `lucide-react`.
- No rodapé do card expandido, envolver o valor em um container flexível com o ícone.
- Aplicar as mesmas classes de estilo: `size={12}` e `className="text-foreground/70"`.

## Tasks

- [ ] Adicionar ícone de valor em `src/components/dashboard/leads/LeadCard.tsx` <!-- id: 0 -->

## Walkthrough

### LeadCard.tsx
- Atualizar a lista de imports para incluir `CircleDollarSign`.
- Modificar o bloco condicional de `lead.value` para incluir o componente de ícone antes do texto do valor, mantendo o `gap-2` e `items-center` para alinhamento perfeito.
