'use client'

import React from 'react'
import type { Lead } from './PipelineBoard'

interface Stage {
    id: string
    name: string
    order_index: number
    color?: string
}

interface LeadsFunnelViewProps {
    stages: Stage[]
    leads: Lead[]
}

export function LeadsFunnelView({ stages, leads }: LeadsFunnelViewProps) {
    const stageData = stages.map(stage => {
        const stageLeads = leads.filter(l => l.status === stage.id)
        return {
            ...stage,
            count: stageLeads.length,
            value: stageLeads.reduce((acc, lead) => acc + (lead.value || 0), 0)
        }
    })

    const totalStages = stageData.length
    // O funil irá de 100% de largura no topo até 40% na base (margens de 0% a 30% de cada lado)
    const MAX_OFFSET = 30

    return (
        <div className="flex-1 w-full flex flex-col items-center justify-start pt-8 pb-8 px-4 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-4xl flex flex-col items-center">
                {stageData.map((stage, index) => {
                    const topOffset = totalStages > 0 ? index * (MAX_OFFSET / totalStages) : 0
                    const bottomOffset = totalStages > 0 ? (index + 1) * (MAX_OFFSET / totalStages) : 0
                    
                    const color = stage.color && stage.color !== '#FFFFFF' ? stage.color : '#404F4F' // Petrol fallback

                    return (
                        <div 
                            key={stage.id}
                            className="relative w-full flex items-center justify-center py-6 md:py-8 transition-all duration-300 hover:brightness-110 group mb-[2px]"
                            style={{
                                backgroundColor: color,
                                clipPath: `polygon(${topOffset}% 0%, ${100 - topOffset}% 0%, ${100 - bottomOffset}% 100%, ${bottomOffset}% 100%)`,
                            }}
                        >
                            <div className="relative z-10 flex flex-col items-center text-white text-center px-4 drop-shadow-md">
                                <span className="text-sm md:text-base font-bold uppercase tracking-widest">{stage.name}</span>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-2xl md:text-4xl font-black leading-none">{stage.count}</span>
                                    <span className="text-sm md:text-base opacity-90 font-medium">leads</span>
                                </div>
                                {stage.value > 0 && (
                                    <span className="text-xs md:text-sm font-bold mt-2 bg-black/20 px-3 py-1 rounded-full">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stage.value)}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })}
                {stageData.length === 0 && (
                    <div className="text-muted-foreground text-sm font-medium py-12">
                        Nenhum estágio configurado para exibir o funil.
                    </div>
                )}
            </div>
        </div>
    )
}
