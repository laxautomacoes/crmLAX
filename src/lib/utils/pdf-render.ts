/**
 * Renderiza páginas de um PDF como imagens JPEG em base64 usando pdf.js
 */
export async function renderPDFPages(file: File): Promise<string[]> {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2.0; // Alta resolução para OCR
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport } as any).promise;
        
        // Converter para base64 JPEG (sem o prefixo data:)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        pages.push(dataUrl.split(',')[1]);
    }

    return pages;
}
