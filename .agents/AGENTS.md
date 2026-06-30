

# Padrão de Header para Modais
Todo Modal no sistema deve seguir o padrão visual de título em destaque. O componente Modal já foi ajustado para usar 'text-base font-black text-foreground uppercase tracking-widest' em seu h3 de título. Sempre que criar um modal novo, certifique-se de que os textos de título sejam semânticos e consistentes com esse padrão de uppercase e espaçamento de letras estendido.

# Padrão de Textos de Instrução e Subtítulos
Sempre que existir um texto de instrução, subtítulo ou descrição longa (seja em headers, formulários, modais ou qualquer outra área), as seguintes regras estruturais e de espaçamento DEVEM ser aplicadas rigorosamente:

1. **Frases separadas por linha:** Nunca utilize um único bloco de texto contínuo. Estruture o texto dividindo cada frase em uma linha separada usando `<span className="block">`.
2. **Entrelinhas reduzido (Distância entre frases):** Utilize a classe `leading-snug` na tag `<p>` pai para garantir que as frases fiquem visualmente coesas e agrupadas.
3. **Distância curta para o título:** O subtítulo deve ficar próximo ao seu título correspondente. Utilize `mt-1` na tag `<p>`. **Crucial:** Para evitar que containers com `space-y-*` apliquem margens gigantes, você DEVE agrupar o título (ex: `h4`) e o subtítulo (`p`) dentro da MESMA tag `<div>` (wrapper).

**Exemplo de estrutura obrigatória:**
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

# Padrão para Modais de Alerta e Confirmação
Modais que exibem mensagens de alerta centralizadas (ex: exclusão, confirmação de ações destrutivas) também DEVEM seguir o padrão de espaçamento de texto acima. As frases do aviso devem ser separadas por quebras de linha (`<span className="block">`), nunca formando um bloco de texto denso.

**Exemplo de estrutura para Modais de Alerta:**
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
      <span className="block">Primeira frase de alerta (ex: Tem certeza que deseja fazer isso?).</span>
      <span className="block">Segunda frase detalhando a consequência.</span>
      <span className="block">Terceira frase (ex: Esta ação não pode ser desfeita).</span>
    </p>
  </div>
</div>
```
