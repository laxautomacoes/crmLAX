import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'

interface AmenitiesFieldsProps {
    formData: any
    setFormData: (data: any) => void
}

export function AmenitiesFields({ formData, setFormData }: AmenitiesFieldsProps) {
    const amenities = [
        { id: 'portaria_24h', label: 'Portaria 24h' },
        { id: 'portaria_virtual', label: 'Portaria Virtual' },
        { id: 'piscina', label: 'Piscina' },
        { id: 'piscina_aquecida', label: 'Piscina Aquecida' },
        { id: 'espaco_gourmet', label: 'Espaço Gourmet' },
        { id: 'salao_festas', label: 'Salão de Festas' },
        { id: 'academia', label: 'Academia' },
        { id: 'sala_jogos', label: 'Sala de Jogos' },
        { id: 'sala_estudos_coworking', label: 'Estudos/Coworking' },
        { id: 'sala_cinema', label: 'Sala de Cinema' },
        { id: 'playground', label: 'Playground' },
        { id: 'brinquedoteca', label: 'Brinquedoteca' },
        { id: 'home_market', label: 'Home Market' }
    ]

    return (
        <div className="pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Área comum | lazer</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {amenities.map((amenity) => (
                    <FormCheckbox
                        key={amenity.id}
                        label={amenity.label}
                        checked={(formData.details as any)[amenity.id]}
                        onChange={(e) => setFormData({
                            ...formData,
                            details: { ...formData.details, [amenity.id]: e.target.checked }
                        })}
                    />
                ))}
            </div>
        </div>
    )
}
