/**
 * Converte o Markdown básico gerado pelo FormRichTextarea em HTML formatado para renderização
 */
export function markdownToHtml(md: string): string {
    if (!md) return ''
    
    let html = md
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/~~(.*?)~~/g, '<strike>$1</strike>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
        .replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>')
        .replace(/^1\. (.*$)/gm, '<ol><li>$1</li></ol>')
        .replace(/<color:\s*([^>]+?)\s*>(.*?)<\/color>/g, '<span style="color: $1">$2</span>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 4px;" />')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>')
    
    // Corrigir listas consecutivas
    html = html.replace(/<\/ul><br><ul>/g, '')
    html = html.replace(/<\/ol><br><ol>/g, '')
    
    // Reduzir quebras de linha redundantes adjacentes a elementos de bloco
    html = html.replace(/(<br>){2,}(<ul>|<ol>|<h1>|<h2>|<h3>|<blockquote>)/g, '<br>$2')
    html = html.replace(/(<\/ul>|<\/ol>|<\/h1>|<\/h2>|<\/h3>|<\/blockquote>)(<br>){2,}/g, '$1<br>')
    
    return html
}
