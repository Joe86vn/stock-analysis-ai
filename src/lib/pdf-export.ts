import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ExportPdfOptions {
    filename?: string;
    quality?: number;
}

/**
 * Exports a DOM element to an A4 portrait PDF using a high-resolution image.
 */
export async function exportElementToPdf(
    elementId: string,
    options: ExportPdfOptions = {}
): Promise<boolean> {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Không tìm thấy phần tử DOM với ID: #${elementId}`);
        return false;
    }

    try {
        const imgData = await toPng(element, {
            quality: options.quality || 0.95,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            filter: (node) => {
                if (node instanceof HTMLElement && node.classList.contains('print:hidden')) {
                    return false;
                }
                return true;
            },
        });

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 8;
        const contentWidth = pageWidth - margin * 2;

        const img = new Image();
        img.src = imgData;
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Không thể tải ảnh báo cáo để tạo PDF'));
        });

        const imgWidth = contentWidth;
        const imgHeight = (img.height * contentWidth) / img.width;
        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight - margin * 2;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pageHeight - margin * 2;
        }

        pdf.save(options.filename || `ValueX_BaoCao_${Date.now()}.pdf`);
        return true;
    } catch (error) {
        console.error('Lỗi trong quá trình tạo file PDF:', error);
        throw error;
    }
}
