import { useState, useEffect } from 'react'

import { Headphones, Loader2, ChevronDown, User, Circle } from 'lucide-react'
import { toggleServiceStatus, getServiceQueue } from '@/app/_actions/profile'
import { toast } from 'sonner'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ServiceQueueToggleProps {
    initialStatus?: boolean
    tenantId?: string
    companyName?: string
}

export function ServiceQueueToggle({ initialStatus = false, tenantId, companyName = 'Equipe' }: ServiceQueueToggleProps) {
    const [isActive, setIsActive] = useState(initialStatus)
    const [isLoading, setIsLoading] = useState(false)
    const [queue, setQueue] = useState<any[] | null>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    useEffect(() => {
        setIsActive(initialStatus)
    }, [initialStatus])

    const fetchQueue = async () => {
        if (!tenantId) {
            console.log('ServiceQueueToggle: tenantId is missing');
            return
        }
        console.log('ServiceQueueToggle: Fetching queue for tenant:', tenantId);
        const res = await getServiceQueue(tenantId)
        if (res.success) {
            console.log('ServiceQueueToggle: Queue fetched:', res.data?.length, 'users');
            setQueue(res.data || [])
        } else {
            console.error('ServiceQueueToggle: Error fetching queue:', res.error);
            toast.error('Erro ao carregar equipe')
        }
    }

    useEffect(() => {
        if (isMenuOpen) {
            fetchQueue()
        }
    }, [isMenuOpen])

    // Atualizar a cada 30 segundos se o menu estiver aberto
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isMenuOpen) {
            interval = setInterval(fetchQueue, 30000)
        }
        return () => clearInterval(interval)
    }, [isMenuOpen])

    const handleToggle = async () => {
        setIsLoading(true)
        try {
            const res = await toggleServiceStatus(!isActive)
            if (res.success) {
                setIsActive(!isActive)
                toast.success(
                    !isActive 
                        ? 'Você entrou na fila de atendimento!' 
                        : 'Você saiu da fila de atendimento.'
                )
            } else {
                toast.error(res.error || 'Erro ao alterar status de atendimento.')
            }
        } catch (error) {
            toast.error('Erro de conexão.')
        } finally {
            setIsLoading(false)
        }
    }

    const isOnline = (updatedAt: string) => {
        if (!updatedAt) return false
        const lastSeen = new Date(updatedAt).getTime()
        const now = new Date().getTime()
        const diffMinutes = (now - lastSeen) / (1000 * 60)
        return diffMinutes < 5 // Considerar online se atualizado nos últimos 5 minutos
    }

    return (
        <DropdownMenu onOpenChange={setIsMenuOpen}>
            <div className="flex items-center gap-1">
                <button
                    onClick={handleToggle}
                    disabled={isLoading}
                    className={`
                        flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-xs font-bold border shadow-sm active:scale-[0.98]
                        ${isActive 
                            ? 'bg-[#3EBC79] border-[#3EBC79] text-white hover:brightness-110' 
                            : 'bg-card border-border text-foreground/70 hover:bg-muted'}
                    `}
                    title={isActive ? 'Sair do atendimento' : 'Entrar em atendimento'}
                >
                    {isLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Headphones size={14} />
                    )}
                    <span>
                        {isActive ? 'Em Atendimento' : 'Atendimento'}
                    </span>
                </button>
                
                <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground focus:outline-none focus-visible:ring-0 outline-none">
                        <ChevronDown size={14} />
                    </button>
                </DropdownMenuTrigger>
            </div>

            <DropdownMenuContent align="end" className="w-72 p-0 rounded-2xl shadow-xl border-border bg-card overflow-hidden">
                <div className="p-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                    {queue === null ? (
                        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                            <Loader2 size={20} className="text-muted-foreground/30 animate-spin mb-2" />
                            <p className="text-xs text-muted-foreground italic">
                                Buscando colaboradores...
                            </p>
                        </div>
                    ) : queue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                            <User size={20} className="text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground italic">
                                Nenhum colaborador encontrado.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* Usuários em atendimento */}
                            {queue.filter(u => u.is_active_for_service).length > 0 && (
                                <>
                                    <div className="px-3 py-2">
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                            Em atendimento
                                        </span>
                                    </div>
                                    {queue
                                        .filter(u => u.is_active_for_service)
                                        .sort((a, b) => {
                                            const aOnline = isOnline(a.updated_at)
                                            const bOnline = isOnline(b.updated_at)
                                            if (aOnline && !bOnline) return -1
                                            if (!aOnline && bOnline) return 1
                                            return 0
                                        })
                                        .map((user) => (
                                            <DropdownMenuItem 
                                                key={user.id}
                                                className="flex items-center gap-3 px-3 py-2 rounded-xl focus:bg-muted/50 cursor-default transition-colors mb-1"
                                            >
                                                <div className="relative">
                                                    <Avatar className="h-10 w-10 border border-border bg-background">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback className="bg-secondary/10 text-[11px] font-bold text-foreground/70">
                                                            {user.full_name?.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-card rounded-full ${isOnline(user.updated_at) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                </div>
                                                
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="text-sm font-bold truncate text-foreground/90">
                                                        {user.full_name}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className="h-1 w-1 bg-emerald-500 rounded-full" />
                                                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">
                                                            Ativo na fila
                                                        </span>
                                                    </div>
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                    <DropdownMenuSeparator className="my-2 bg-border/50" />
                                </>
                            )}

                            {/* Demais colaboradores */}
                            {queue.filter(u => !u.is_active_for_service).length > 0 && (
                                <>
                                    {queue.filter(u => u.is_active_for_service).length > 0 && (
                                        <div className="px-3 py-2">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                Outros membros
                                            </span>
                                        </div>
                                    )}
                                    {queue
                                        .filter(u => !u.is_active_for_service)
                                        .sort((a, b) => {
                                            const aOnline = isOnline(a.updated_at)
                                            const bOnline = isOnline(b.updated_at)
                                            if (aOnline && !bOnline) return -1
                                            if (!aOnline && bOnline) return 1
                                            return 0
                                        })
                                        .map((user) => (
                                            <DropdownMenuItem 
                                                key={user.id}
                                                className="flex items-center gap-3 px-3 py-2 rounded-xl focus:bg-muted/50 cursor-default transition-colors mb-1 opacity-70"
                                            >
                                                <div className="relative">
                                                    <Avatar className="h-10 w-10 border border-border bg-background">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback className="bg-secondary/10 text-[11px] font-bold text-foreground/70">
                                                            {user.full_name?.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-card rounded-full ${isOnline(user.updated_at) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                </div>
                                                
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="text-sm font-bold truncate text-foreground/80">
                                                        {user.full_name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                        Fora da fila
                                                    </span>
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
                
                {queue && queue.length > 0 && (
                    <div className="px-4 py-2.5 bg-muted/20 border-top border-border/50 text-center">
                        <p className="text-[9px] text-muted-foreground font-medium">
                            {queue.filter(u => u.is_active_for_service).length} ativos no momento
                        </p>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
