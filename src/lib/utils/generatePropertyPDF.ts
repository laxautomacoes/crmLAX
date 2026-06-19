import { jsPDF } from 'jspdf'

interface PropertyDocument {
    name?: string
    url: string
}

interface PropertyDetailsAddress {
    bairro?: string
    cidade?: string
    rua?: string
    numero?: string
}

interface PropertyDetails {
    dormitorios?: number
    quartos?: number
    suites?: number
    area_privativa?: number
    endereco?: PropertyDetailsAddress
    [key: string]: any
}

interface PropertyData {
    id: string
    slug: string
    type: string
    title: string
    price: number
    description?: string
    images?: string[]
    videos?: string[]
    documents?: PropertyDocument[]
    details?: PropertyDetails
    created_by_profile?: {
        id: string
        full_name: string
        whatsapp_number?: string
        avatar_url?: string | null
    }
}

interface SendConfig {
    title: boolean;
    price: boolean;
    showCondo: boolean;
    showIptu: boolean;
    description: 'full' | 'none';
    location: 'exact' | 'approximate' | 'none';
    showBedrooms: boolean;
    showSuites: boolean;
    showArea: boolean;
    showType: boolean;
    showAmenities: boolean;
    showSacada: boolean;
    showEscritorio: boolean;
    showDependencia: boolean;
    showObservations: boolean;
    showResponsavel: boolean;
    showConstrutora: boolean;
    selectedImages: string[];
}

// Convert image URL to Base64
async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            resolve(reader.result as string);
        }, false);
        reader.onerror = () => {
            reject(new Error("Failed to convert image to Base64"));
        };
        reader.readAsDataURL(blob);
    });
}

// Get image natural dimensions to preserve aspect ratio
function getImageDimensions(base64Data: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Data;
        img.onload = () => {
            resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
        };
        img.onerror = () => {
            resolve({ width: 800, height: 600 });
        };
    });
}

function calculateAspectRatioFit(srcWidth: number, srcHeight: number, maxWidth: number, maxHeight: number) {
    const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return { width: srcWidth * ratio, height: srcHeight * ratio };
}

export async function generatePropertyPDF(params: {
    property: PropertyData;
    config: SendConfig;
    tenantName: string;
}) {
    const { property, config, tenantName } = params;
    
    // Create new PDF (A4 size, vertical)
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4'
    });

    const margin = 40;
    const contentWidth = 595 - (margin * 2); // 515 pt
    let currentY = 50;

    // Helper: Header for the first page
    function drawFirstPageHeader() {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor('#404F4F');
        doc.text(tenantName.toUpperCase(), margin, currentY);
        
        currentY += 8;
        doc.setDrawColor('#FFE600');
        doc.setLineWidth(2);
        doc.line(margin, currentY, 595 - margin, currentY);
        
        currentY += 25;
    }

    // Helper: Add a new page
    function addNewPage() {
        doc.addPage();
        currentY = 50;
    }

    // Helper: Print a section separator line
    function printSectionHeader(title: string) {
        if (currentY + 35 > 790) {
            addNewPage();
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor('#404F4F');
        
        const textY = currentY + 8;
        doc.text(title.toUpperCase(), margin, textY);
        
        const textWidth = doc.getTextWidth(title.toUpperCase());
        doc.setDrawColor('#FFE600');
        doc.setLineWidth(1.5);
        doc.line(margin + textWidth + 10, textY - 3, 595 - margin, textY - 3);
        
        currentY += 22;
    }

    // Helper: Print a bullet point
    function printBullet(text: string) {
        if (currentY + 16 > 790) {
            addNewPage();
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor('#404F4F');
        
        doc.text('•', margin + 5, currentY);
        
        // Multi-line bullet text wrap
        const bulletTextWidth = contentWidth - 20;
        const splitText = doc.splitTextToSize(text, bulletTextWidth);
        
        splitText.forEach((line: string, index: number) => {
            if (index > 0) {
                if (currentY + 14 > 790) {
                    addNewPage();
                }
                doc.text(line, margin + 15, currentY);
            } else {
                doc.text(line, margin + 15, currentY);
            }
            currentY += 14;
        });
    }

    // Helper: Print description paragraph
    function printDescription(text: string) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor('#404F4F');
        
        const splitDescription = doc.splitTextToSize(text, contentWidth);
        splitDescription.forEach((line: string) => {
            if (currentY + 14 > 790) {
                addNewPage();
            }
            doc.text(line, margin, currentY);
            currentY += 14;
        });
    }

    // Render Page 1 Header
    drawFirstPageHeader();

    // 1. Title of the Property
    if (config.title) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor('#404F4F');
        
        const splitTitle = doc.splitTextToSize(property.title, contentWidth);
        splitTitle.forEach((line: string) => {
            if (currentY + 22 > 790) {
                addNewPage();
            }
            doc.text(line, margin, currentY);
            currentY += 22;
        });
        currentY += 5;
    }

    // 2. Address/Location
    if (config.location !== 'none') {
        const bairro = property.details?.endereco?.bairro || '';
        const cidade = property.details?.endereco?.cidade || '';
        const rua = property.details?.endereco?.rua || '';
        const numero = property.details?.endereco?.numero || '';

        let addressText = '';
        if (config.location === 'exact' && rua) {
            addressText = `${rua}, ${numero} - ${bairro}, ${cidade}`;
        } else if (bairro && cidade) {
            addressText = `${bairro} - ${cidade}`;
        } else {
            addressText = bairro || cidade || '';
        }

        if (addressText) {
            if (currentY + 16 > 790) {
                addNewPage();
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor('#6B7280');
            doc.text(addressText, margin, currentY);
            currentY += 20;
        }
    }

    // Add extra margin if we added title or address
    if (config.title || config.location !== 'none') {
        currentY += 10;
    }

    // 3. Valores
    const hasPrice = config.price;
    const hasCondo = config.showCondo && property.details?.valor_condominio;
    const hasIptu = config.showIptu && property.details?.valor_iptu;

    if (hasPrice || hasCondo || hasIptu) {
        printSectionHeader('Valores');
        
        if (hasPrice) {
            printBullet(`Valor do Imóvel: R$ ${new Intl.NumberFormat('pt-BR').format(property.price)}`);
        }
        if (hasCondo) {
            const condoNum = parseFloat(String(property.details?.valor_condominio));
            if (!isNaN(condoNum) && condoNum > 0) {
                printBullet(`Condomínio: R$ ${new Intl.NumberFormat('pt-BR').format(condoNum)}`);
            }
        }
        if (hasIptu) {
            const iptuNum = parseFloat(String(property.details?.valor_iptu));
            if (!isNaN(iptuNum) && iptuNum > 0) {
                printBullet(`IPTU: R$ ${new Intl.NumberFormat('pt-BR').format(iptuNum)}`);
            }
        }
        currentY += 10;
    }

    // 4. Informações
    const dorms = parseInt(String(property.details?.dormitorios || property.details?.quartos || '0'));
    const suites = parseInt(String(property.details?.suites || '0'));
    
    const showBedrooms = config.showBedrooms && dorms > 0;
    const showSuites = config.showSuites && suites > 0;
    const showArea = config.showArea && property.details?.area_privativa;
    const showSacada = config.showSacada && (property.details?.has_sacada_com_churrasqueira || property.details?.has_sacada_sem_churrasqueira);
    const showEscritorio = config.showEscritorio && property.details?.has_escritorio;
    const showDependencia = config.showDependencia && property.details?.has_dependencia_empregada;
    const showObservations = config.showObservations && property.details?.obs_dormitorios;
    const vegasVal = parseInt(String(property.details?.vagas || '0'));

    if (showBedrooms || showSuites || showArea || showSacada || showEscritorio || showDependencia || showObservations || vegasVal > 0) {
        printSectionHeader('Informações');

        // Dormitórios e Suítes
        if (showBedrooms || showSuites) {
            if (dorms > 0 && dorms === suites) {
                printBullet(`${suites} suíte${suites > 1 ? 's' : ''}`);
            } else if (dorms > 0 && suites > 0) {
                printBullet(`${dorms} dormitório${dorms > 1 ? 's' : ''} (${suites} suíte${suites > 1 ? 's' : ''})`);
            } else if (dorms > 0) {
                printBullet(`${dorms} dormitório${dorms > 1 ? 's' : ''}`);
            } else if (suites > 0) {
                printBullet(`${suites} suíte${suites > 1 ? 's' : ''}`);
            }
        }

        // Área privativa
        if (showArea) {
            printBullet(`Área privativa: ${property.details?.area_privativa} m²`);
        }

        // Vagas
        if (vegasVal > 0) {
            printBullet(`${vegasVal} vaga${vegasVal > 1 ? 's' : ''} de garagem`);
        }

        // Sacada
        if (showSacada) {
            if (property.details?.has_sacada_com_churrasqueira) {
                printBullet('Sacada com churrasqueira');
            } else {
                printBullet('Sacada');
            }
        }

        // Lavabo, Escritório, Dependência
        if (property.details?.has_lavabo) {
            printBullet('Lavabo');
        }
        if (showEscritorio) {
            printBullet('Escritório');
        }
        if (showDependencia) {
            printBullet('Dependência de empregada');
        }

        // Observações
        if (showObservations) {
            printBullet(`Observações: ${property.details?.obs_dormitorios}`);
        }

        currentY += 10;
    }

    // 5. Área comum | Lazer
    if (config.showAmenities) {
        const amenitiesMap = [
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
            { id: 'home_market', label: 'Home Market' },
        ];
        const activeAmenities = amenitiesMap
            .filter(a => property.details?.[a.id])
            .map(a => a.label);

        if (activeAmenities.length > 0) {
            printSectionHeader('Área comum | Lazer');
            activeAmenities.forEach(amenity => {
                printBullet(amenity);
            });
            currentY += 10;
        }
    }

    // 6. Descrição
    if (config.description === 'full' && property.description?.trim()) {
        printSectionHeader('Descrição');
        
        // Strip markdown if any, keeping it clean for the PDF
        const cleanDesc = property.description
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#/g, '')
            .trim();
            
        printDescription(cleanDesc);
        currentY += 10;
    }

    // 7. Responsável
    if (config.showResponsavel) {
        const broker = property.created_by_profile;
        if (broker) {
            printSectionHeader('Responsável');
            printBullet(`Corretor: ${broker.full_name}`);
            if (broker.whatsapp_number) {
                printBullet(`WhatsApp: ${broker.whatsapp_number}`);
            }
            currentY += 10;
        }
    }

    // 8. Proprietário | Construtora
    if (config.showConstrutora) {
        const propNome = property.details?.proprietario?.nome || (property as any).owner_name;
        const propTel = property.details?.proprietario?.telefone || (property as any).owner_phone;
        const propEmail = property.details?.proprietario?.email || (property as any).owner_email;
        const propResp = property.details?.proprietario?.responsavel;

        if (propNome) {
            printSectionHeader('Proprietário | Construtora');
            printBullet(`Nome: ${propNome}`);
            if (propResp) {
                printBullet(`Responsável: ${propResp}`);
            }
            if (propTel) {
                printBullet(`Telefone: ${propTel}`);
            }
            if (propEmail) {
                printBullet(`E-mail: ${propEmail}`);
            }
            currentY += 10;
        }
    }

    // 9. Selected Images (Pages 2+)
    if (config.selectedImages && config.selectedImages.length > 0) {
        for (let i = 0; i < config.selectedImages.length; i++) {
            const url = config.selectedImages[i];
            
            try {
                // Fetch and convert image to Base64
                const base64Data = await getBase64ImageFromUrl(url);
                
                // Determine format
                let format = 'JPEG';
                if (url.toLowerCase().endsWith('.png')) {
                    format = 'PNG';
                } else if (url.toLowerCase().endsWith('.webp')) {
                    format = 'WEBP';
                }

                // If it is the first image or an odd index (i.e. starts a new page)
                if (i % 2 === 0) {
                    addNewPage();
                }

                // Calculate vertical position
                // We fit 2 images per page:
                // Image 1 (index 0, 2, 4...): Y = 70
                // Image 2 (index 1, 3, 5...): Y = 430
                const imageY = (i % 2 === 0) ? 70 : 430;
                
                // Get original image dimensions to preserve aspect ratio
                const { width: imgW, height: imgH } = await getImageDimensions(base64Data);
                
                // Box constraints
                const maxBoxW = 480;
                const maxBoxH = 320;
                
                // Fit image in the box maintaining aspect ratio
                const fit = calculateAspectRatioFit(imgW, imgH, maxBoxW, maxBoxH);
                
                // Center the image horizontally inside the A4 width
                const imageX = (595 - fit.width) / 2;
                
                // Center vertically inside its allocated slot if it is shorter than maxBoxH
                const verticalOffset = (maxBoxH - fit.height) / 2;
                
                // Simular bordas arredondadas e sombra desenhando um card sutil
                doc.setDrawColor('#E5E7EB');
                doc.setFillColor('#F9FAFA');
                doc.setLineWidth(1);
                // Draw card container
                doc.roundedRect((595 - maxBoxW) / 2 - 5, imageY + verticalOffset - 5, maxBoxW + 10, fit.height + 10, 8, 8, 'FD');

                // Draw the actual image
                doc.addImage(
                    base64Data,
                    format,
                    imageX,
                    imageY + verticalOffset,
                    fit.width,
                    fit.height,
                    undefined,
                    'FAST'
                );

            } catch (e) {
                console.error(`Error embedding image index ${i}:`, e);
                // Draw a placeholder card indicating error loading image
                if (i % 2 === 0) {
                    addNewPage();
                }
                const imageY = (i % 2 === 0) ? 70 : 430;
                const maxBoxW = 480;
                const maxBoxH = 320;
                
                doc.setDrawColor('#E5E7EB');
                doc.setFillColor('#F9FAFA');
                doc.roundedRect((595 - maxBoxW) / 2, imageY, maxBoxW, maxBoxH, 8, 8, 'FD');
                
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(10);
                doc.setTextColor('#8E9A9A');
                doc.text('Foto indisponível para o PDF', 595 / 2, imageY + (maxBoxH / 2), { align: 'center' });
            }
        }
    }

    // 10. Add Footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        doc.setPage(pageNum);
        
        // Muted divider above footer
        doc.setDrawColor('#E5E7EB');
        doc.setLineWidth(0.5);
        doc.line(margin, 810, 595 - margin, 810);
        
        // Footer texts
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor('#8E9A9A');
        
        // Left footer
        doc.text('CRM LAX', margin, 822);
        
        // Right footer
        const pageText = `Página ${pageNum} de ${totalPages}`;
        const pageTextWidth = doc.getTextWidth(pageText);
        doc.text(pageText, 595 - margin - pageTextWidth, 822);
    }

    // Save document
    const cleanSlug = property.slug ? property.slug : 'imovel';
    doc.save(`ficha-${cleanSlug}.pdf`);
}
