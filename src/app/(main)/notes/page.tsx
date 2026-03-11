'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, FileText, User, Building2, Calendar, Trash2, Edit2, LayoutGrid, Table as TableIcon, Paperclip, Image as ImageIcon, ExternalLink, PlayCircle } from 'lucide-react'
import { getNotes, deleteNote } from '@/app/_actions/notes'
import { getProfile } from '@/app/_actions/profile'
import { NoteModal } from '@/components/dashboard/notes/NoteModal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Componente local para o Dropdown de Anexos
function AttachmentsDropdown({ attachments }: { attachments: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    if (!attachments || attachments.length === 0) return null

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(!isOpen)
                }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all relative ${isOpen ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted'}`}
            >
                <Paperclip size={14} />
                <span className="text-[10px] font-bold">{attachments.length}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl border border-border shadow-2xl overflow-hidden z-[1000] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                    <div className="bg-muted px-4 py-2 border-b border-border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Arquivos Anexados ({attachments.length})</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {attachments.map((file, idx) => (
                            <a
                                key={idx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
                            >
                                <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                                    {file.type === 'images' ? <ImageIcon size={14} /> : file.type === 'videos' ? <PlayCircle size={14} /> : <FileText size={14} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">
                                        {file.name || (file.type === 'images' ? 'Imagem' : file.type === 'videos' ? 'Vídeo' : 'Documento')}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground capitalize">{file.type === 'documents' ? file.url.split('.').pop()?.toUpperCase() : file.type.slice(0, -1)}</p>
                                </div>
                                <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function NotesPage() {
    const [notes, setNotes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingNote, setEditingNote] = useState<any>(null)
    const [tenantId, setTenantId] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

    const loadNotes = async () => {
        setIsLoading(true)
        const { profile } = await getProfile()
        if (profile?.tenant_id) {
            setTenantId(profile.tenant_id)
            const res = await getNotes(profile.tenant_id)
            if (res.success) {
                setNotes(res.data || [])
            }
        }
        setIsLoading(false)
    }

    useEffect(() => {
        loadNotes()
    }, [])

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta nota?')) {
            const res = await deleteNote(id)
            if (res.success) {
                loadNotes()
            }
        }
    }

    const filteredNotes = notes.filter(note => 
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.leads?.contacts?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.assets?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground text-center md:text-left">Notas</h1>
                <div className="h-px bg-foreground/25 w-full md:hidden mt-2 mb-6" />
                <div className="flex items-center justify-center md:justify-end gap-3">
                    <FormInput
                        placeholder="Buscar notas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={Search}
                        className="md:w-64"
                    />
                    
                    {/* View Toggle */}
                    <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                            title="Visualização em Grade"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                            title="Visualização em Tabela"
                        >
                            <TableIcon size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setEditingNote(null)
                            setIsModalOpen(true)
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-all text-sm font-bold shadow-sm active:scale-[0.99] whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Nova Nota
                    </button>
                </div>
            </div>

            {/* Listagem */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin" />
                    <p className="text-muted-foreground font-medium animate-pulse">Carregando notas</p>
                </div>
            ) : filteredNotes.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNotes.map((note) => (
                            <div key={note.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col group p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-secondary/10 rounded-xl text-secondary">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                {format(new Date(note.date), "dd 'de' MMMM", { locale: ptBR })}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground italic">
                                                Criado por {note.profiles?.full_name || 'Usuário'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditingNote(note)
                                                    setIsModalOpen(true)
                                                }}
                                                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-secondary"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(note.id)}
                                                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <AttachmentsDropdown attachments={note.attachments} />
                                    </div>
                                </div>

                                <div 
                                    className="text-card-foreground text-sm line-clamp-4 leading-relaxed overflow-hidden prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: note.content }}
                                />

                                <div className="space-y-2 pt-2 border-t border-border">
                                    {note.assets && (
                                        <div className="flex items-center gap-2 text-[11px] font-semibold text-secondary bg-secondary/10 dark:bg-secondary/20 px-3 py-1.5 rounded-lg border border-secondary/20 w-fit max-w-full transition-colors">
                                            <Building2 size={12} className="shrink-0" />
                                            <span className="truncate">{note.assets.title}</span>
                                        </div>
                                    )}
                                    {note.leads && (
                                        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground bg-muted dark:bg-muted/40 px-3 py-1.5 rounded-lg border border-border w-fit max-w-full transition-colors">
                                            <User size={12} className="shrink-0 text-muted-foreground/80 dark:text-muted-foreground/60" />
                                            <span className="truncate text-foreground/80 dark:text-foreground/90">{note.leads.contacts?.name || 'Lead'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-card rounded-2xl border border-border shadow-sm">
                        <div className="rounded-2xl">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border first:rounded-tl-2xl">Data</th>
                                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Conteúdo</th>
                                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Relacionados</th>
                                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right border-b border-border last:rounded-tr-2xl">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredNotes.map((note, index) => (
                                        <tr key={note.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className={`px-6 py-4 whitespace-nowrap ${index === filteredNotes.length - 1 ? 'rounded-bl-2xl' : ''}`}>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-foreground">
                                                        {format(new Date(note.date), "dd/MM/yyyy")}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground italic">
                                                        Por {note.profiles?.full_name?.split(' ')[0] || 'Usuário'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-md">
                                                <div 
                                                    className="text-sm text-card-foreground line-clamp-2 prose prose-sm dark:prose-invert"
                                                    dangerouslySetInnerHTML={{ __html: note.content }}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {note.assets && (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-secondary bg-secondary/10 dark:bg-secondary/20 px-2 py-1 rounded-md border border-secondary/20 transition-colors">
                                                            <Building2 size={10} className="shrink-0" />
                                                            <span className="truncate">{note.assets.title}</span>
                                                        </div>
                                                    )}
                                                    {note.leads && (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted dark:bg-muted/40 px-2 py-1 rounded-md border border-border transition-colors">
                                                            <User size={10} className="shrink-0 text-muted-foreground/80 dark:text-muted-foreground/60" />
                                                            <span className="truncate text-foreground/80 dark:text-foreground/90">{note.leads.contacts?.name || 'Lead'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-right ${index === filteredNotes.length - 1 ? 'rounded-br-2xl' : ''}`}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <AttachmentsDropdown attachments={note.attachments} />
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingNote(note)
                                                                setIsModalOpen(true)
                                                            }}
                                                            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-secondary"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(note.id)}
                                                            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-card rounded-3xl border border-border shadow-sm">
                    <div className="p-6 bg-muted rounded-full mb-4">
                        <FileText size={48} className="text-muted-foreground/40" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Nenhuma nota encontrada</h3>
                    <p className="text-muted-foreground text-sm max-w-xs text-center mt-2">
                        {searchTerm ? 'Tente buscar por termos diferentes ou limpe a busca.' : 'Comece criando sua primeira anotação para organizar seu fluxo de trabalho.'}
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-6 text-secondary font-bold text-sm hover:underline"
                    >
                        Criar minha primeira nota
                    </button>
                </div>
            )}

            <NoteModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingNote(null)
                }}
                editingNote={editingNote}
                tenantId={tenantId}
                onSaveSuccess={loadNotes}
            />
        </div>
    )
}
