import io
import pdfplumber
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="", tags=["PDF Parser"])

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB

@router.post("/parse-pdf")
async def parse_pdf(
    file: UploadFile = File(...),
    ticker: Optional[str] = Form(None)
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Tệp tải lên phải có định dạng .pdf")

    contents = await file.read()
    file_size = len(contents)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Dung lượng tệp ({file_size / (1024*1024):.1f}MB) vượt quá giới hạn tối đa 50MB."
        )

    try:
        extracted_text_chunks = []
        tables_data: List[Dict[str, Any]] = []

        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            page_count = len(pdf.pages)

            for page_idx, page in enumerate(pdf.pages):
                # 1. Trích xuất văn bản
                page_text = page.extract_text()
                if page_text:
                    extracted_text_chunks.append(f"--- TRANG {page_idx + 1} ---\n{page_text}")

                # 2. Trích xuất bảng biểu
                try:
                    tables = page.extract_tables()
                    for tbl in tables:
                        if tbl and len(tbl) > 1:
                            # Lọc bỏ các dòng hoàn toàn rỗng
                            cleaned_rows = [
                                [str(cell).strip() if cell is not None else "" for cell in row]
                                for row in tbl
                                if any(cell for cell in row)
                            ]
                            if len(cleaned_rows) >= 2:
                                tables_data.append({
                                    "page": page_idx + 1,
                                    "headers": cleaned_rows[0],
                                    "rows": cleaned_rows[1:30]  # Giới hạn 30 dòng mỗi bảng để tránh quá tải
                                })
                except Exception:
                    pass

        full_text = "\n\n".join(extracted_text_chunks)
        is_scanned = len(full_text.strip()) < 100  # Nếu cả tài liệu có dưới 100 ký tự text thì khả năng cao là file scan dạng ảnh

        return {
            "pageCount": page_count,
            "isScanned": is_scanned,
            "text": full_text[:100000],  # Giới hạn 100k ký tự đầu để an toàn truyền mạng
            "tables": tables_data[:15],   # Tối đa 15 bảng tài chính tiêu biểu
            "metadata": {
                "fileName": file.filename,
                "fileSizeMb": round(file_size / (1024 * 1024), 2),
                "ticker": ticker.upper().strip() if ticker else None
            }
        }

    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Không thể đọc file PDF: {str(e)}")
