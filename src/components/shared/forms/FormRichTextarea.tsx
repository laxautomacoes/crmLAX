'use client'

import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, List, ListOrdered, Type, Quote, Underline, Strikethrough, ChevronDown, Undo, Redo, Palette, Image as ImageIcon, Paperclip, Upload, Loader2, Link } from 'lucide-react'
import { markdownToHtml } from '@/lib/utils/markdown'

interface FormRichTextareaProps {
    label?: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    error?: string
    className?: string
    attachments?: {
        images?: string[]
        documents?: { name: string, url: string }[]
        videos?: string[]
    }
    onUpload?: (file: File) => Promise<string | void>
}

export function FormRichTextarea({ label, value, onChange, placeholder, error, className = '', attachments, onUpload }: FormRichTextareaProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isMounted, setIsMounted] = useState(false)
    const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false)
    const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false)
    const [isMediaDropdownOpen, setIsMediaDropdownOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const [selectedStyle, setSelectedStyle] = useState('p')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Função para converter HTML de volta para Markdown (para o estado/banco)
    const htmlToMarkdown = (html: string) => {
        if (!html) return ''
        
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html

        // Obter a cor padrão do editor para comparar
        const defaultColor = editorRef.current ? window.getComputedStyle(editorRef.current).color : ''

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
                case 'br':
                    return '\n'
                case 'p':
                case 'div':
                    return content + '\n'
                case 'a':
                    return `[${content}](${element.getAttribute('href')})`
                case 'img':
                    return `![${element.getAttribute('alt') || ''}](${element.getAttribute('src')})`
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

    const insertHtmlAtCursor = (html: string) => {
        if (!editorRef.current) return
        editorRef.current.focus()
        document.execCommand('insertHTML', false, html)
        onChange(htmlToMarkdown(editorRef.current.innerHTML))
        setIsMediaDropdownOpen(false)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !onUpload) return

        setIsUploading(true)
        try {
            const result = await onUpload(file)
            if (result && typeof result === 'string') {
                if (file.type.startsWith('image/')) {
                    insertHtmlAtCursor(`<img src="${result}" style="max-width: 100%; border-radius: 4px; margin: 10px 0;" />`)
                } else {
                    insertHtmlAtCursor(`<a href="${result}" target="_blank" style="color: #3b82f6; text-decoration: underline;">📎 ${file.name}</a>`)
                }
            }
        } catch (err) {
            console.error('Erro no upload via toolbar:', err)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
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
            
            <div className="border border-border/40 rounded-lg bg-background focus-within:ring-2 focus-within:ring-secondary/50 focus-within:border-secondary transition-all relative">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-background border-b border-muted-foreground/20 rounded-t-lg">
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
                            <div className="absolute top-full left-0 mt-1 w-32 bg-popover border border-muted-foreground/20 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto custom-scrollbar">
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

                    {(attachments || onUpload) && (
                        <>
                            <div className="w-px h-4 bg-muted-foreground/20 mx-0.5" />
                            <div className="relative">
                                <button
                                    type="button"
                                    onMouseDown={(e) => { 
                                        e.preventDefault(); 
                                        setIsMediaDropdownOpen(!isMediaDropdownOpen);
                                        if (!isMediaDropdownOpen) {
                                            setIsStyleDropdownOpen(false);
                                            setIsColorDropdownOpen(false);
                                        }
                                    }}
                                    className={`p-1.5 hover:bg-muted rounded transition-colors ${isMediaDropdownOpen ? 'bg-secondary/10 text-secondary' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Mídias e Arquivos"
                                >
                                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                                </button>

                                {isMediaDropdownOpen && (
                                    <div 
                                        className="absolute top-full right-0 mt-1 w-64 bg-popover border border-muted-foreground/20 rounded-xl shadow-2xl z-50 p-4 transition-all animate-in fade-in zoom-in-95 duration-200"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex flex-col gap-4">
                                            {onUpload && (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Upload</p>
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={isUploading}
                                                        className="w-full flex items-center justify-center gap-2 py-2 bg-foreground/5 border border-dashed border-foreground/30 rounded-lg text-xs font-bold text-foreground hover:bg-foreground/10 transition-all active:scale-[0.98]"
                                                    >
                                                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                        Enviar Novo Arquivo
                                                    </button>
                                                    <input 
                                                        ref={fileInputRef}
                                                        type="file"
                                                        className="hidden"
                                                        onChange={handleFileUpload}
                                                    />
                                                </div>
                                            )}

                                            {attachments && (
                                                <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                                                    {attachments.images && attachments.images.length > 0 && (
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Galeria de Imagens</p>
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {attachments.images.slice(-8).map((url, i) => (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => insertHtmlAtCursor(`<img src="${url}" style="max-width: 100%; border-radius: 4px; margin: 10px 0;" />`)}
                                                                        className="aspect-square bg-muted rounded-md overflow-hidden border border-border hover:border-secondary transition-all"
                                                                    >
                                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {attachments.documents && attachments.documents.length > 0 && (
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Documentos</p>
                                                            <div className="flex flex-col gap-1">
                                                                {attachments.documents.slice(-4).map((doc, i) => (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => insertHtmlAtCursor(`<a href="${doc.url}" target="_blank" style="color: #3b82f6; text-decoration: underline;">📎 ${doc.name}</a>`)}
                                                                        className="w-full text-left px-2 py-1.5 bg-muted/50 hover:bg-secondary/10 rounded-lg text-[10px] font-medium border border-border hover:border-secondary transition-all truncate flex items-center gap-2"
                                                                    >
                                                                        <Paperclip size={12} className="shrink-0" />
                                                                        <span className="truncate">{doc.name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {(!attachments?.images?.length && !attachments?.documents?.length && !onUpload) && (
                                                <p className="text-[10px] text-muted-foreground italic text-center py-2">Nenhuma mídia encontrada.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    className="w-full bg-transparent text-sm p-4 outline-none min-h-[150px] overflow-y-auto rich-text-editor rounded-b-lg"
                />
                {!value && placeholder && (
                    <div className="absolute left-4 text-muted-foreground/50 text-sm pointer-events-none" style={{ top: 'calc(2.5rem + 1px + 1rem)' }}>
                        {placeholder}
                    </div>
                )}
            </div>
            {error && <span className="text-xs text-red-500 ml-1 mt-1">{error}</span>}
        </div>
    )
}
