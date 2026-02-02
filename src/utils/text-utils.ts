/**
 * Utilitário para limpar tags de Markdown e retornar apenas texto puro.
 * Útil para previews em cards e listas.
 */
export function stripMarkdown(text: string): string {
    if (!text) return '';
    
    return text
        // Remover negrito, itálico, sublinhado, tachado
        .replace(/(\*\*|__|~~|\*)/g, '')
        // Remover headers
        .replace(/^#+\s+/gm, '')
        // Remover citações
        .replace(/^>\s+/gm, '')
        // Remover listas
        .replace(/^[-*]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        // Remover tags de cor customizadas
        .replace(/<color:\s*[^>]+?>(.*?)<\/color>/g, '$1')
        // Remover quebras de linha múltiplas por espaço
        .replace(/\n+/g, ' ')
        .trim();
}
