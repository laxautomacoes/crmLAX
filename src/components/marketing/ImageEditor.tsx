'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Type, Download, Loader2, Save, Move, Trash2, Sun, Moon, Bold, Italic, Underline, Strikethrough } from 'lucide-react';
import html2canvas from 'html2canvas';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface TextLayer {
    id: string;
    text: string;
    html: string;
    x: number;
    y: number;
    color: string;
    fontSize: number;
    fontWeight: string;
    isItalic?: boolean;
    isUnderline?: boolean;
    isStrikethrough?: boolean;
}

interface ImageEditorProps {
    imageUrl: string;
    tenantId: string;
    onSave: (newUrl: string) => void;
    onClose: () => void;
}

export function ImageEditor({ imageUrl, tenantId, onSave, onClose }: ImageEditorProps) {
    const [layers, setLayers] = useState<TextLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [overlayOpacity, setOverlayOpacity] = useState(0);
    const [saving, setSaving] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const editableRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // Sincroniza o editor quando o selecionado muda
    useEffect(() => {
        if (editableRef.current && selectedLayerId) {
            const layer = layers.find(l => l.id === selectedLayerId);
            if (layer && editableRef.current.innerHTML !== (layer.html || layer.text)) {
                editableRef.current.innerHTML = layer.html || layer.text;
            }
        }
    }, [selectedLayerId]);

    // Drag state
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const addTextLayer = () => {
        const newLayer: TextLayer = {
            id: Math.random().toString(36).substr(2, 9),
            text: 'Novo Texto',
            html: 'Novo Texto',
            x: 50,
            y: 50,
            color: '#ffffff',
            fontSize: 32,
            fontWeight: 'bold',
            isItalic: false,
            isUnderline: false,
            isStrikethrough: false
        };
        setLayers([...layers, newLayer]);
        setSelectedLayerId(newLayer.id);
    };

    const updateLayer = (id: string, updates: Partial<TextLayer>) => {
        setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const removeLayer = (id: string) => {
        setLayers(layers.filter(l => l.id !== id));
        if (selectedLayerId === id) setSelectedLayerId(null);
    };

    const execFmt = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        if (editableRef.current && selectedLayerId) {
            updateLayer(selectedLayerId, { html: editableRef.current.innerHTML });
        }
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        setDraggingId(id);
        setSelectedLayerId(id);
        setStartPos({ x: e.clientX, y: e.clientY });
        e.stopPropagation();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingId) return;

        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;

        const layer = layers.find(l => l.id === draggingId);
        if (layer) {
            updateLayer(draggingId, {
                x: layer.x + dx,
                y: layer.y + dy
            });
            setStartPos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setDraggingId(null);
    };

    const handleSave = async () => {
        if (!containerRef.current) return;
        setSaving(true);

        try {
            // Deselecionar tudo antes de tirar print
            setSelectedLayerId(null);
            
            // Pequeno delay para react renderizar sem seleção
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(containerRef.current, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                scale: 2 // Melhor qualidade
            });

            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error('Falha ao gerar imagem.');

                const fileName = `edited_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
                const filePath = `marketing-studio/${tenantId}/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('crm-attachments').upload(filePath, blob, {
                    contentType: 'image/jpeg'
                });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('crm-attachments').getPublicUrl(filePath);
                
                toast.success('Imagem editada com sucesso!');
                onSave(publicUrl);
            }, 'image/jpeg', 0.9);

        } catch (error: any) {
            console.error('Save Error:', error);
            toast.error('Erro ao salvar a imagem: ' + error.message);
            setSaving(false); // Retorna botão caso erro
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="w-full h-full flex flex-col md:flex-row">
                
                {/* Header (Mobile Only) / Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Área de Edição (Canvas) */}
                <div 
                    className="flex-1 h-full flex items-center justify-center p-8 bg-neutral-900/50 overflow-hidden"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onClick={() => setSelectedLayerId(null)}
                >
                    <div 
                        ref={containerRef}
                        className="relative max-w-full max-h-full inline-block shadow-2xl"
                        style={{ userSelect: 'none' }}
                    >
                        {/* Imagem Base */}
                        <img 
                            src={imageUrl} 
                            alt="Base" 
                            className="max-w-full max-h-[85vh] object-contain pointer-events-none"
                            crossOrigin="anonymous"
                        />

                        {/* Overlay Escuro */}
                        {overlayOpacity > 0 && (
                            <div 
                                className="absolute inset-0 bg-black pointer-events-none" 
                                style={{ opacity: overlayOpacity / 100 }} 
                            />
                        )}

                        {/* Textos */}
                        {layers.map(layer => (
                            <div
                                key={layer.id}
                                className={`absolute cursor-move px-2 py-1 border-2 ${selectedLayerId === layer.id ? 'border-dashed border-white bg-white/10' : 'border-transparent'}`}
                                style={{
                                    left: layer.x,
                                    top: layer.y,
                                    color: layer.color,
                                    fontSize: layer.fontSize,
                                    fontWeight: layer.fontWeight,
                                    fontStyle: layer.isItalic ? 'italic' : 'normal',
                                    textDecoration: [layer.isUnderline ? 'underline' : '', layer.isStrikethrough ? 'line-through' : ''].filter(Boolean).join(' '),
                                    whiteSpace: 'pre-wrap',
                                    textShadow: layer.color === '#ffffff' ? '1px 1px 4px rgba(0,0,0,0.8)' : 'none'
                                }}
                                onMouseDown={(e) => handleMouseDown(e, layer.id)}
                                onClick={(e) => e.stopPropagation()}
                                dangerouslySetInnerHTML={{ __html: layer.html || layer.text }}
                            />
                        ))}
                    </div>
                </div>

                {/* Painel de Ferramentas */}
                <div className="w-full md:w-[350px] bg-card border-l border-border flex flex-col h-full shadow-2xl z-40">
                    <div className="p-6 border-b border-border">
                        <h2 className="text-lg font-bold text-foreground">Editor de Imagens</h2>
                        <p className="text-xs text-muted-foreground mt-1">Adicione textos e filtros antes de postar.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Ferramentas Globais */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Ajustes Globais</h3>
                            <button
                                onClick={addTextLayer}
                                className="w-full h-12 flex items-center justify-center gap-2 bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold rounded-lg transition-colors border border-border"
                            >
                                <Type size={18} />
                                Adicionar Texto
                            </button>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-foreground flex items-center gap-2">
                                        <Moon size={16} /> Escurecer Imagem
                                    </label>
                                    <span className="text-xs text-muted-foreground">{overlayOpacity}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="80" 
                                    value={overlayOpacity}
                                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                                    className="w-full accent-secondary"
                                />
                                <p className="text-[10px] text-muted-foreground">Ajuda a dar leitura para textos brancos.</p>
                            </div>
                        </div>

                        <hr className="border-border/50" />

                        {/* Editor do Texto Selecionado */}
                        {selectedLayerId ? (() => {
                            const layer = layers.find(l => l.id === selectedLayerId)!;
                            return (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Editar Texto</h3>
                                        <button 
                                            onClick={() => removeLayer(layer.id)}
                                            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
                                            title="Excluir texto"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    
                                    <div
                                        ref={editableRef}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={(e) => updateLayer(layer.id, { html: e.currentTarget.innerHTML })}
                                        className="w-full h-24 p-3 rounded-lg bg-foreground/5 border border-border text-foreground text-sm overflow-y-auto focus:ring-1 focus:ring-secondary outline-none"
                                        style={{ color: '#fff' }}
                                    />

                                    {/* Formatadores */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => execFmt('bold')}
                                            className="p-2 rounded-lg border transition-colors bg-foreground/5 text-foreground border-border hover:bg-foreground/10"
                                            title="Negrito"
                                        >
                                            <Bold size={16} />
                                        </button>
                                        <button
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => execFmt('italic')}
                                            className="p-2 rounded-lg border transition-colors bg-foreground/5 text-foreground border-border hover:bg-foreground/10"
                                            title="Itálico"
                                        >
                                            <Italic size={16} />
                                        </button>
                                        <button
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => execFmt('underline')}
                                            className="p-2 rounded-lg border transition-colors bg-foreground/5 text-foreground border-border hover:bg-foreground/10"
                                            title="Sublinhado"
                                        >
                                            <Underline size={16} />
                                        </button>
                                        <button
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => execFmt('strikeThrough')}
                                            className="p-2 rounded-lg border transition-colors bg-foreground/5 text-foreground border-border hover:bg-foreground/10"
                                            title="Riscado"
                                        >
                                            <Strikethrough size={16} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground">Tamanho</label>
                                            <input 
                                                type="number" 
                                                value={layer.fontSize}
                                                onChange={(e) => updateLayer(layer.id, { fontSize: Number(e.target.value) })}
                                                className="w-full h-10 px-3 rounded-lg bg-foreground/5 border border-border text-foreground text-sm outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground">Cor (Seleção)</label>
                                            <div className="flex gap-2">
                                                {['#ffffff', '#000000', '#facc15', '#ef4444', '#3b82f6'].map(color => (
                                                    <button
                                                        key={color}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => execFmt('foreColor', color)}
                                                        className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-all shadow-sm"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                                <Move size={32} className="mb-2 text-muted-foreground" />
                                <p className="text-sm text-foreground">Nenhum texto selecionado</p>
                                <p className="text-xs text-muted-foreground mt-1">Clique em um texto na imagem para editá-lo.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-border bg-muted/20">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full h-12 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold rounded-lg uppercase tracking-widest text-sm transition-all shadow-lg disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Salvar Arte
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
