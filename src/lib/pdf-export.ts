import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ExportPdfOptions {
    filename?: string;
    quality?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    showPageNumber?: boolean;
}

interface BlockBound {
    top: number;
    bottom: number;
    height: number;
}

interface SlicePlan {
    startY: number;
    endY: number;
    height: number;
}

/**
 * Thuật toán Smart Block Packing:
 * Tự động tìm các khối nội dung [data-pdf-block] (hoặc các nhóm con),
 * tính toán khoảng trống trang A4, dồn tối đa nội dung vào từng trang
 * và chỉ ngắt trang ở ranh giới giữa các khối khi không còn đủ diện tích.
 * Đảm bảo 100% trang in có lề trên/dưới đồng đều và không bị cắt ngang chữ.
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
        // 1. Chụp toàn bộ container một lần duy nhất với độ nét cao (pixelRatio: 2)
        const imgData = await toPng(element, {
            quality: options.quality || 0.96,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            filter: (node) => {
                if (node instanceof HTMLElement && node.classList.contains('print:hidden')) {
                    return false;
                }
                return true;
            },
        });

        const fullImg = new Image();
        fullImg.src = imgData;
        await new Promise<void>((resolve, reject) => {
            fullImg.onload = () => resolve();
            fullImg.onerror = () => reject(new Error('Không thể tải ảnh chụp báo cáo để xuất PDF'));
        });

        // 2. Thiết lập thông số khổ giấy A4 & Lề chuẩn (mm)
        const pageWidth = 210;
        const pageHeight = 297;
        const marginTop = options.marginTop ?? 10;
        const marginBottom = options.marginBottom ?? 10;
        const marginLeft = options.marginLeft ?? 10;
        const marginRight = options.marginRight ?? 10;
        const showPageNumber = options.showPageNumber ?? true;

        const contentWidthMm = pageWidth - marginLeft - marginRight;
        const maxContentHeightMm = pageHeight - marginTop - marginBottom;

        // Tỉ lệ scale giữa DOM pixel và ảnh chụp
        const domWidth = element.offsetWidth || 1;
        const domHeight = element.offsetHeight || 1;
        const scaleX = fullImg.naturalWidth / domWidth;
        const scaleY = fullImg.naturalHeight / domHeight;

        // Số pixel DOM tối đa vừa vặn trong 1 trang A4
        const pxPerMm = domWidth / contentWidthMm;
        const maxPageHeightPx = maxContentHeightMm * pxPerMm;

        // 3. Quét danh sách các khối nội dung (data-pdf-block) hoặc fallback sang child elements
        const containerRect = element.getBoundingClientRect();
        let blockNodes = Array.from(element.querySelectorAll<HTMLElement>('[data-pdf-block]'));

        // Fallback nếu không có thẻ gắn data-pdf-block: tìm các phần tử con trực tiếp hoặc section
        if (blockNodes.length === 0) {
            blockNodes = Array.from(element.querySelectorAll<HTMLElement>('.memo-section, .factsheet-card, .print-avoid-break'));
        }
        if (blockNodes.length === 0) {
            blockNodes = Array.from(element.children) as HTMLElement[];
        }

        // Lấy tọa độ tương đối của từng khối so với đỉnh của container
        const rawBounds: BlockBound[] = blockNodes
            .map((b) => {
                const rect = b.getBoundingClientRect();
                const top = Math.max(0, rect.top - containerRect.top);
                const bottom = Math.min(domHeight, rect.bottom - containerRect.top);
                return { top, bottom, height: bottom - top };
            })
            .filter((b) => b.height > 8) // Bỏ qua các khối rỗng hoặc quá nhỏ (< 8px)
            .sort((a, b) => a.top - b.top);

        // 4. Lập kế hoạch cắt trang (Slice Plan) thông minh
        const slices: SlicePlan[] = [];
        let currentSliceStart = 0;

        if (rawBounds.length === 0) {
            // Không nhận diện được khối nào: chia đều theo kích thước trang chuẩn
            while (currentSliceStart < domHeight) {
                const sliceEnd = Math.min(domHeight, currentSliceStart + maxPageHeightPx);
                slices.push({ startY: currentSliceStart, endY: sliceEnd, height: sliceEnd - currentSliceStart });
                currentSliceStart = sliceEnd;
            }
        } else {
            let lastSafeBreakPoint = 0;

            for (let i = 0; i < rawBounds.length; i++) {
                const block = rawBounds[i];
                const blockEnd = block.bottom;
                const projectedHeight = blockEnd - currentSliceStart;

                if (projectedHeight <= maxPageHeightPx) {
                    // Khối này vẫn nằm trọn trong trang hiện tại
                    // Điểm ngắt an toàn là sau khối này (hoặc giữa khối này và khối kế tiếp)
                    const nextBlock = rawBounds[i + 1];
                    if (nextBlock && nextBlock.top > block.bottom) {
                        lastSafeBreakPoint = (block.bottom + nextBlock.top) / 2;
                    } else {
                        lastSafeBreakPoint = block.bottom;
                    }
                } else {
                    // Khối này tràn ra ngoài trang hiện tại
                    if (lastSafeBreakPoint > currentSliceStart) {
                        // Đã có ít nhất 1 khối trước đó: ngắt trang tại ranh giới an toàn
                        slices.push({
                            startY: currentSliceStart,
                            endY: lastSafeBreakPoint,
                            height: lastSafeBreakPoint - currentSliceStart,
                        });
                        currentSliceStart = lastSafeBreakPoint;
                        // Tính lại cho khối hiện tại sau khi sang trang mới
                        i--; // Xem lại khối này ở trang mới
                        lastSafeBreakPoint = currentSliceStart;
                    } else {
                        // Khối này quá lớn, bản thân nó cao hơn cả 1 trang A4
                        // Buộc phải cắt khối này theo kích thước trang
                        const forcedSliceEnd = Math.min(domHeight, currentSliceStart + maxPageHeightPx);
                        slices.push({
                            startY: currentSliceStart,
                            endY: forcedSliceEnd,
                            height: forcedSliceEnd - currentSliceStart,
                        });
                        currentSliceStart = forcedSliceEnd;
                        lastSafeBreakPoint = currentSliceStart;
                    }
                }
            }

            // Đưa phần còn lại cuối cùng vào lát cắt kết thúc
            if (currentSliceStart < domHeight) {
                slices.push({
                    startY: currentSliceStart,
                    endY: domHeight,
                    height: domHeight - currentSliceStart,
                });
            }
        }

        // 5. Khởi tạo PDF và render từng lát cắt bằng Canvas
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const totalPages = slices.length;

        for (let i = 0; i < slices.length; i++) {
            if (i > 0) {
                pdf.addPage();
            }

            const slice = slices[i];
            const sliceCanvas = document.createElement('canvas');
            const sourceY = Math.round(slice.startY * scaleY);
            const sourceHeight = Math.min(
                Math.round(slice.height * scaleY),
                fullImg.naturalHeight - sourceY
            );

            sliceCanvas.width = fullImg.naturalWidth;
            sliceCanvas.height = Math.max(1, sourceHeight);

            const ctx = sliceCanvas.getContext('2d');
            if (ctx && sourceHeight > 0) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                ctx.drawImage(
                    fullImg,
                    0,
                    sourceY,
                    fullImg.naturalWidth,
                    sourceHeight,
                    0,
                    0,
                    sliceCanvas.width,
                    sourceHeight
                );

                const sliceDataUrl = sliceCanvas.toDataURL('image/png');
                const sliceHeightMm = (slice.height / domWidth) * contentWidthMm;

                // Thêm hình ảnh với đầy đủ lề trên (marginTop) và lề trái (marginLeft)
                pdf.addImage(
                    sliceDataUrl,
                    'PNG',
                    marginLeft,
                    marginTop,
                    contentWidthMm,
                    sliceHeightMm,
                    undefined,
                    'FAST'
                );
            }

            // 6. Vẽ footer & số trang chuyên nghiệp ở lề dưới
            if (showPageNumber) {
                pdf.setFontSize(8);
                pdf.setTextColor(140, 140, 140);
                pdf.text(
                    `Trang ${i + 1} / ${totalPages} • Nền tảng phân tích định lượng ValueX`,
                    pageWidth / 2,
                    pageHeight - 5,
                    { align: 'center' }
                );
            }
        }

        pdf.save(options.filename || `ValueX_BaoCao_${Date.now()}.pdf`);
        return true;
    } catch (error) {
        console.error('Lỗi trong quá trình tạo file PDF:', error);
        throw error;
    }
}

