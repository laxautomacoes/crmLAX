'use client'

import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, List, ListOrdered, Type, Quote, Underline, Strikethrough, ChevronDown, Undo, Redo, Palette } from 'lucide-react'

interface FormRichTextareaProps {
    label?: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    error?: string
    className?: string
}

export function FormRichTextarea({ label, value, onChange, placeholder, error, className = '' }: FormRichTextareaProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isMounted, setIsMounted] = useState(false)
    const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false)
    const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false)

    const [selectedStyle, setSelectedStyle] = useState('p')

    // Função para converter Markdown básico para HTML (para o editor)
    const markdownToHtml = (md: string) => {
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
            .replace(/\n/g, '<br>')
        
        // Corrigir listas consecutivas
        html = html.replace(/<\/ul><br><ul>/g, '')
        html = html.replace(/<\/ol><br><ol>/g, '')
        
        return html
    }

    // Função para converter HTML de volta para Markdown (para o estado/banco)
    const htmlToMarkdown = (html: string) => {
        if (!html) return ''
        
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html

        // Obter a cor padrão do editor para comparar
        const defaultColor = editorRef.current ? window.getComputedStyle(editorRef.current).color : ''

        // Limpar spans de cor inicial/inherit/currentColor para evitar que persistam no Markdown
        const spans = tempDiv.querySelectorAll('span')
        spans.forEach(span => {
            const color = span.style.color
            if (!color || color === 'initial' || color === 'inherit' || color === 'currentColor' || color === 'transparent' || color === defaultColor) {
                const parent = span.parentNode
                if (parent) {
                    while (span.firstChild) {
                        parent.insertBefore(span.firstChild, span)
                    }
                    parent.removeChild(span)
                }
            }
        })

        // Função recursiva para converter nós
        const convertNode = (node: Node): string => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent || ''
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return ''
            }

            const element = node as HTMLElement
            const tagName = element.tagName.toLowerCase()
            let content = ''

            for (let i = 0; i < element.childNodes.length; i++) {
                content += convertNode(element.childNodes[i])
            }

            switch (tagName) {
                case 'strong':
                case 'b':
                    return `**${content}**`
                case 'em':
                case 'i':
                    return `*${content}*`
                case 'u':
                    return `__${content}__`
                case 'strike':
                case 's':
                    return `~~${content}~~`
                case 'h1':
                    return `# ${content}\n`
                case 'h2':
                    return `## ${content}\n`
                case 'h3':
                    return `### ${content}\n`
                case 'blockquote':
                    return `> ${content}\n`
                case 'li':
                    const parent = element.parentElement
                    const isOrdered = parent?.tagName.toLowerCase() === 'ol'
                    if (isOrdered) {
                        const index = Array.from(parent!.children).indexOf(element) + 1
                        return `${index}. ${content}\n`
                    }
                    return `- ${content}\n`
                case 'ul':
                case 'ol':
                    return content
                case 'span':
                    const color = element.style.color
                    let result = content

                    // Aplicar outras formatações que podem vir de spans (especialmente com styleWithCSS)
                    if (element.style.fontWeight === 'bold' || (element.style.fontWeight && parseInt(element.style.fontWeight) >= 700)) {
                        result = `**${result}**`
                    }
                    if (element.style.fontStyle === 'italic') {
                        result = `*${result}*`
                    }
                    if (element.style.textDecoration.includes('underline')) {
                        result = `__${result}__`
                    }
                    if (element.style.textDecoration.includes('line-through')) {
                        result = `~~${result}~~`
                    }

                    if (color && color !== 'initial' && color !== 'inherit' && color !== 'currentColor' && color !== 'transparent' && color !== defaultColor) {
                        return `<color:${color}>${result}</color>`
                    }
                    return result
                case 'font':
                    const fontColor = element.getAttribute('color')
                    if (fontColor) {
                        return `<color:${fontColor}>${content}</color>`
                    }
                    return content
                case 'div':
                case 'p':
                    return `${content}\n`
                case 'br':
                    return '\n'
                default:
                    return content
            }
        }

        let md = convertNode(tempDiv)
        
        // Limpeza final
        return md
            .replace(/\n{3,}/g, '\n\n')
            .trim()
    }

    useEffect(() => {
        setIsMounted(true)
        
        // Garantir que o separador padrão de parágrafos seja <p> para consistência
        try {
            document.execCommand('defaultParagraphSeparator', false, 'p')
            // @ts-ignore - execCommand uses boolean for styleWithCSS but TS expects string
            document.execCommand('styleWithCSS', false, true)
        } catch (e) {
            // Ignorar se o comando não for suportado
        }

        const handleSelectionChange = () => {
            if (!editorRef.current || document.activeElement !== editorRef.current) return

            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
                let node = selection.anchorNode
                while (node && node !== editorRef.current) {
                    const tag = node.nodeName.toLowerCase()
                    if (['h1', 'h2', 'h3', 'p', 'blockquote'].includes(tag)) {
                        setSelectedStyle(tag)
                        return
                    }
                    node = node.parentNode
                }
                setSelectedStyle('p')
            }
        }

        document.addEventListener('selectionchange', handleSelectionChange)
        return () => document.removeEventListener('selectionchange', handleSelectionChange)
    }, [])

    // Sincronizar valor quando mudar externamente
    useEffect(() => {
        if (isMounted && editorRef.current) {
            const currentContent = editorRef.current.innerHTML
            const currentMd = htmlToMarkdown(currentContent)
            
            // Só atualiza se o valor vindo das props for diferente do MD atual
            // E se o valor vindo das props não for apenas uma string vazia enquanto temos conteúdo
            if (value !== currentMd) {
                // Previne sobrescrever com vazio se já tivermos conteúdo (pode ser delay de carregamento)
                if (value === '' && currentMd !== '') return
                
                editorRef.current.innerHTML = markdownToHtml(value)
            }
        }
    }, [isMounted, value])

    const execCommand = (command: string, value: string | undefined = undefined) => {
        if (!editorRef.current) return
        
        editorRef.current.focus()
        
        // Para formatBlock, alguns navegadores precisam do valor entre tags < >
        let finalValue = value
        if (command === 'formatBlock' && value && !value.startsWith('<')) {
            finalValue = `<${value}>`
        }

        try {
            document.execCommand(command, false, finalValue)
            if (command === 'formatBlock' && value) {
                setSelectedStyle(value)
            }
            onChange(htmlToMarkdown(editorRef.current.innerHTML))
        } catch (err) {
            console.error('Erro ao executar comando:', err)
        }
    }

    const handleInput = () => {
        if (editorRef.current) {
            onChange(htmlToMarkdown(editorRef.current.innerHTML))
        }
    }

    const textStyles = [
        { label: 'Texto', value: 'p' },
        { label: 'Título 1', value: 'h1' },
        { label: 'Título 2', value: 'h2' },
        { label: 'Título 3', value: 'h3' },
    ]

    const textColors = [
        { label: 'Padrão', value: 'inherit', color: 'currentColor' },
        { label: 'Vermelho', value: '#ef4444', color: '#ef4444' },
        { label: 'Azul', value: '#3b82f6', color: '#3b82f6' },
        { label: 'Verde', value: '#22c55e', color: '#22c55e' },
        { label: 'Amarelo', value: '#eab308', color: '#eab308' },
        { label: 'Laranja', value: '#f97316', color: '#f97316' },
        { label: 'Roxo', value: '#a855f7', color: '#a855f7' },
        { label: 'Cinza', value: '#94a3b8', color: '#94a3b8' },
    ]

    return (
        <div className={`space-y-1 ${className}`}>
            <style>{`
                .rich-text-editor h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; display: block; }
                .rich-text-editor h2 { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.4rem; display: block; }
                .rich-text-editor h3 { font-size: 1.125rem; font-weight: bold; margin-bottom: 0.3rem; display: block; }
                .rich-text-editor blockquote { border-left: 4px solid var(--border); padding-left: 1rem; margin-left: 0; font-style: italic; color: var(--muted-foreground); display: block; }
                .rich-text-editor ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; display: block; }
                .rich-text-editor ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; display: block; }
                .rich-text-editor li { display: list-item; }
                .rich-text-editor p { margin-bottom: 0.5rem; }
            `}</style>
            {label && (
                <label className="block text-sm font-bold text-foreground/80 ml-1">
                    {label}
                </label>
            )}
            
            <div className="border border-muted-foreground/30 rounded-lg bg-card focus-within:ring-2 focus-within:ring-secondary/50 focus-within:border-secondary transition-all relative">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/30 border-b border-muted-foreground/20 rounded-t-lg">
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCommand('undo'); }}
                        className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Desfazer"
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCommand('redo'); }}
                        className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Refazer"
                    >
                        <Redo size={16} />
                    </button>
                    
                    <div className="w-px h-4 bg-muted-foreground/20 mx-0.5" />

                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }}
                        className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Negrito"
                    >
                        <Bold size={16} />
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }}
                        className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Itálico"
                    >
                        <Italic size={16} />
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCommand('underline'); }}
                        className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Sublinhado"
                    >
                        <Underline size={16} />
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCommand('strikeThrough'); }}
                        className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Riscado"
                    >
                        <Strikethrough size={16} />
                    </button>
                    
                    <div className="w-px h-4 bg-muted-foreground/20 mx-0.5" />
                    
                    {/* Style Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onMouseDown={(e) => { 
                                e.preventDefault(); 
                                setIsStyleDropdownOpen(!isStyleDropdownOpen); 
                                if (!isStyleDropdownOpen) setIsColorDropdownOpen(false);
                            }}
                            className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1 min-w-[40px] justify-center"
                            title="Estilo de Texto"
                        >
                            <div className="flex items-center gap-0.5">
                                <Type size={16} />
                                {selectedStyle.startsWith('h') && (
                                    <span className="text-[10px] font-bold">{selectedStyle.replace('h', '')}</span>
                                )}
                            </div>
                            <ChevronDown size={12} className={`transition-transform ${isStyleDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isStyleDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-32 bg-card border border-muted-foreground/20 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto custom-scrollbar">
                                {textStyles.map((style) => (
                                    <button
                                        key={style.value}
                                        type="button"
                                        onMouseDown={(e) => { 
                                            e.preventDefault(); 
                                            execCommand('formatBlock', style.value);
                                            setIsStyleDropdownOpen(false);
                                        }}
                                        className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between ${selectedStyle === style.value ? 'bg-muted text-secondary font-medium' : ''}`}
                                    >
                                        {style.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-muted-foreground/20 mx-0.5" />

                    {/* Color Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onMouseDown={(e) => { 
                                e.preventDefault(); 
                                setIsColorDropdownOpen(!isColorDropdownOpen); 
                                if (!isColorDropdownOpen) setIsStyleDropdownOpen(false);
                            }}
                            className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1"
                            title="Cor do Texto"
                        >
                            <Palette size={16} />
                            <ChevronDown size={12} className={`transition-transform ${isColorDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isColorDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-32 bg-card border border-muted-foreground/20 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto custom-scrollbar">
                                {textColors.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onMouseDown={(e) => { 
                                            e.preventDefault(); 
                                            execCommand('foreColor', color.value);
                                            setIsColorDropdownOpen(false);
                                        }}
                                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                    >
                                        <div 
                                            className="w-3 h-3 rounded-full border border-muted-foreground/20" 
                                            style={{ backgroundColor: color.color }} 
                                        />
                                        {color.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-muted-foreground/20 mx-0.5" />
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCommand('insertUnorderedList'); }}
                        className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Lista"
                    >
                        <List size={16} />
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCommand('insertOrderedList'); }}
                        className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Lista Numerada"
                    >
                        <ListOrdered size={16} />
                    </button>
                    <div className="w-px h-4 bg-muted-foreground/20 mx-0.5" />
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCommand('formatBlock', 'blockquote'); }}
                        className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Citação"
                    >
                        <Quote size={16} />
                    </button>
                </div>

                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    className="w-full bg-transparent text-sm p-4 outline-none min-h-[150px] overflow-y-auto rich-text-editor rounded-b-lg"
                />
                {!value && placeholder && (
                    <div className="absolute top-[88px] left-4 text-muted-foreground/50 text-sm pointer-events-none">
                        {placeholder}
                    </div>
                )}
            </div>
            {error && <span className="text-xs text-red-500 ml-1 mt-1">{error}</span>}
        </div>
    )
}
