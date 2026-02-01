'use client'

import React from 'react'

interface SafeMarkdownRendererProps {
    content: string
    className?: string
}

export function SafeMarkdownRenderer({ content, className = '' }: SafeMarkdownRendererProps) {
    if (!content) return null

    // Função simples para converter Markdown básico em HTML seguro via React elements
    // Para um sistema real, poderíamos usar react-markdown, mas vamos fazer algo leve
    const renderContent = () => {
        const lines = content.split('\n')
        const elements: React.ReactNode[] = []
        
        let currentList: React.ReactNode[] = []
        let listType: 'ul' | 'ol' | null = null

        const flushList = () => {
            if (currentList.length > 0) {
                if (listType === 'ul') {
                    elements.push(<ul key={`ul-${elements.length}`} className="list-disc ml-6 mb-4 space-y-1">{[...currentList]}</ul>)
                } else {
                    elements.push(<ol key={`ol-${elements.length}`} className="list-decimal ml-6 mb-4 space-y-1">{[...currentList]}</ol>)
                }
                currentList = []
                listType = null
            }
        }

        lines.forEach((line, index) => {
            // Títulos
            if (line.startsWith('# ')) {
                flushList()
                elements.push(<h1 key={index} className="text-2xl font-bold mb-4 mt-6">{processInlineStyles(line.substring(2))}</h1>)
            } else if (line.startsWith('## ')) {
                flushList()
                elements.push(<h2 key={index} className="text-xl font-bold mb-3 mt-5">{processInlineStyles(line.substring(3))}</h2>)
            }
            // Listas
            else if (line.startsWith('- ') || line.startsWith('* ')) {
                if (listType !== 'ul') flushList()
                listType = 'ul'
                currentList.push(<li key={index}>{processInlineStyles(line.substring(2))}</li>)
            } else if (/^\d+\. /.test(line)) {
                if (listType !== 'ol') flushList()
                listType = 'ol'
                const contentStart = line.indexOf('. ') + 2
                currentList.push(<li key={index}>{processInlineStyles(line.substring(contentStart))}</li>)
            }
            // Citação
            else if (line.startsWith('> ')) {
                flushList()
                elements.push(
                    <blockquote key={index} className="border-l-4 border-muted-foreground/30 pl-4 italic my-4 text-muted-foreground">
                        {processInlineStyles(line.substring(2))}
                    </blockquote>
                )
            }
            // Linha vazia
            else if (line.trim() === '') {
                flushList()
                elements.push(<div key={index} className="h-4" />)
            }
            // Parágrafo normal
            else {
                flushList()
                elements.push(<p key={index} className="mb-3 leading-relaxed">{processInlineStyles(line)}</p>)
            }
        })

        flushList()
        return elements
    }

    const processInlineStyles = (text: string) => {
        // Processa negrito (**texto**), itálico (*texto*), e código (`texto`)
        const parts: (string | React.ReactNode)[] = []
        let remaining = text

        // Regex para encontrar os padrões
        const pattern = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g
        const matches = text.split(pattern)

        return matches.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={i}>{part.slice(1, -1)}</em>
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>
            }
            return part
        })
    }

    return (
        <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
            {renderContent()}
        </div>
    )
}
