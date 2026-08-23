- Sử dụng phương pháp crawl dữ liệu từ nguồn cafef.vn, vietstock.vn và simplize.vn
- báo cáo tài chính sẽ lấy nguồn vietstock, tôi tìm được link tải có dạng https://static2.vietstock.vn/data/HOSE/2026/BCTC/VN/QUY%202/HDC_Baocaotaichinh_Q2_2026_Hopnhat.pdf, https://static2.vietstock.vn/data/HOSE/2025/BCTC/VN/QUY%204/HDC_Baocaotaichinh_Q4_2025_Hopnhat.pdf, chỉ việc thay thế mã HDC bằng mã khác và quý tương ứng.
- Báo cáo thường niên sẽ lấy nguồn cafef, tôi tìm được link tải có dạng https://cafefnew.mediacdn.vn/Images/Uploaded/DuLieuDownload/BCTC/HDC_25CN_BCTN.pdf, https://cafefnew.mediacdn.vn/Images/Uploaded/DuLieuDownload/BCTC/HDC_24CN_BCTN.pdf. Tương tự chỉ việc thay mã và năm báo cáo.
- Báo cáo phân tích lấy từ nguồn simplize, tôi sử dụng developer tools và lấy được url sau:https://api2.simplize.vn/api/company/analysis-report/list?ticker=HDC&isWl=false&page=0&size=10, đây là phần JSON trong Tab Network -> lọc Fetch/XHR: {
    "status": 200,
    "message": "Success",
    "total": 10,
    "data": [
        {
            "id": 6092063,
            "ticker": "HDC",
            "tickerName": "HDC",
            "reportType": 1,
            "source": "VCBS",
            "issueDate": "20/05/2026",
            "issueDateTimeAgo": "3 tháng",
            "title": "Phục hồi doanh số bán hàng",
            "attachedLink": "https://cdn.simplize.vn/simplizevn/report/HDC/Phuc_hoi_doanh_so_ban_hang.pdf",
            "fileName": "Phuc_hoi_doanh_so_ban_hang.pdf",
            "targetPrice": 20700.0,
            "recommend": "MUA"
        },
        {
            "id": 2330411,
            "ticker": "HDC",
            "tickerName": "HDC",
            "reportType": 1,
            "source": "MAS",
            "issueDate": "05/02/2026",
            "issueDateTimeAgo": "6 tháng",
            "title": "CTCP Phát triển Nhà Bà Rịa - Vũng Tàu (HDC VN/Mua/GMT: 26,850) - Đóng góp tích cực từ hoạt động thoái vốn",
            "attachedLink": "https://cdn.simplize.vn/simplizevn/report/HDC/ctcp_phat_trien_nha_ba_ria_vung_tau_hdc_vn_mua_gmt_26_850_dong_gop_tich_cuc_tu_hoat_dong_thoai_von.pdf",
            "fileName": "ctcp_phat_trien_nha_ba_ria_vung_tau_hdc_vn_mua_gmt_26_850_dong_gop_tich_cuc_tu_hoat_dong_thoai_von.pdf",
            "targetPrice": 23300.0,
            "recommend": "MUA"
        },
        {
            "id": 1703036,
            "ticker": "HDC",
            "tickerName": "HDC",
            "reportType": 1,
            "source": "VIETCAP",
            "issueDate": "19/01/2026",
            "issueDateTimeAgo": "7 tháng",
            "title": "The Light City Giai đoạn 1, Eco Home 1 dự kiến sẽ thúc đẩy sự phục hồi của doanh số bán BĐS trong năm 2026 ",
            "attachedLink": "https://cdn.simplize.vn/simplizevn/report/HDC/The_Light_City_Giai_oan_1_Eco_Home_1_du_kien_se_thuc_ay_su_phuc_hoi_cua_doanh_so_ban_BS_trong_nam_2026_.pdf",
            "fileName": "The_Light_City_Giai_oan_1_Eco_Home_1_du_kien_se_thuc_ay_su_phuc_hoi_cua_doanh_so_ban_BS_trong_nam_2026_.pdf",
            "targetPrice": 21300.0,
            "recommend": "KHẢ QUAN"
        },
        {
            "id": 48203,
            "ticker": "HDC",
            "tickerName": "HDC",
            "reportType": 1,
            "source": "VCBS",
            "issueDate": "15/04/2025",
            "issueDateTimeAgo": "1 năm",
            "title": "Khởi động lại hoạt động bán hàng",
            "attachedLink": "https://cdn.simplize.vn/simplizevn/report/HDC/Khoi_ong_lai_hoat_ong_ban_hang.pdf",
            "fileName": "Khoi_ong_lai_hoat_ong_ban_hang.pdf",
            "targetPrice": 24800.0,
            "recommend": "MUA"
        },
        {
            "id": 16532,
            "ticker": "HDC",
            "tickerName": "HDC",
            "reportType": 1,
            "source": "Vietcap",
            "issueDate": "27/03/2025",
            "issueDateTimeAgo": "1 năm",
            "title": "Chuyển nhượng dự án quy mô nhỏ dự kiến thúc đẩy tăng trưởng lợi nhuận năm 2025",
            "attachedLink": "https://cdn.simplize.vn/simplizevn/report/HDC/Chuyen_nhuong_du_an_quy_mo_nho_du_kien_thuc_ay_tang_truong_loi_nhuan_nam_2025.pdf",
            "fileName": "Chuyen_nhuong_du_an_quy_mo_nho_du_kien_thuc_ay_tang_truong_loi_nhuan_nam_2025.pdf",
            "targetPrice": 23600.0,
            "recommend": "MUA"
        },
        {
            "id": 9172,
            "ticker": "HDC",
            "tickerName": "HDC",
            "reportType": 1,
            "source": "Vietcap",
            "issueDate": "09/09/2024",
            "issueDateTimeAgo": "1 năm",
            "title": "Sở hữu quỹ đất lớn để nắm bắt triển vọng phục hồi tại Vũng Tàu",
            "attachedLink": "https://cdn.simplize.vn/simplizevn/report/HDC/So_huu_quy_at_lon_e_nam_bat_trien_vong_phuc_hoi_tai_Vung_Tau.pdf",
            "fileName": "So_huu_quy_at_lon_e_nam_bat_trien_vong_phuc_hoi_tai_Vung_Tau.pdf",
            "targetPrice": 22800.0,
            "recommend": "MUA"
        },
        {
            "id": 9135,
            "ticker": "HDC",
            "tickerName": "HDC",
            "reportType": 1,
            "source": "DSC",
            "issueDate": "29/08/2024",
            "issueDateTimeAgo": "1 năm",
            "title": "Chờ The Light City mở bán trở lại",
            "attachedLink": "https://cdn.simplize.vn/simplizevn/report/HDC/Cho_The_Light_City_mo_ban_tro_lai.pdf",
            "fileName": "Cho_The_Light_City_mo_ban_tro_lai.pdf",
            "targetPrice": 20200.0,
            "recommend": "TRUNG LẬP"
        },
        {
            "id": 6419,
            "ticker": "HDC",
            "tickerName": "HDC",
            "reportType": 1,
            "source": "Vietcap",
            "issueDate": "15/04/2024",
            "issueDateTimeAgo": "2 năm",
            "title": "Mục tiêu lợi nhuận tăng gấp ba từ mức cơ sở thấp của 2023",
            "attachedLink": "https://cdn.simplize.vn/simplizevn/report/HDC/Muc_tieu_loi_nhuan_tang_gap_ba_tu_muc_co_so_thap_cua_2023.pdf",
            "fileName": "Muc_tieu_loi_nhuan_tang_gap_ba_tu_muc_co_so_thap_cua_2023.pdf",
            "recommend": "KHÁC"
        },
        {
            "id": 317,
            "ticker": "HDC",
            "tickerName": "HDC",
            "reportType": 1,
            "source": "DSC",
            "issueDate": "12/10/2022",
            "issueDateTimeAgo": "3 năm",
            "title": "Báo cáo cập nhật Q2-2022",
            "attachedLink": "https://cdn.simplize.vn/simplizevn/report/HDC/Bao_cao_cap_nhat_Q2-2022.pdf",
            "fileName": "Bao_cao_cap_nhat_Q2-2022.pdf",
            "targetPrice": 24200.0,
            "recommend": "KHÁC"
        },
        {
            "id": 3165,
            "ticker": "HDC",
            "tickerName": "HDC",
            "reportType": 1,
            "source": "SSI",
            "issueDate": "18/04/2022",
            "issueDateTimeAgo": "4 năm",
            "title": "Tiếp tục thực hiện chiến lược M&A đồng thời mở rộng sang thị trường mới",
            "attachedLink": "https://cdn.simplize.vn/simplizevn/report/HDC/Tiep_tuc_thuc_hien_chien_luoc_MA_ong_thoi_mo_rong_sang_thi_truong_moi.pdf",
            "fileName": "Tiep_tuc_thuc_hien_chien_luoc_MA_ong_thoi_mo_rong_sang_thi_truong_moi.pdf",
            "recommend": "KHÁC"
        }
    ]
}
- Nghị quyết đại hội cổ đông thường niên được lấy từ vietstock. Tôi tìm được link sau: https://static2.vietstock.vn/data/HOSE/2025/NGHI%20QUYET%20DHCD/VN/HDC_Nghiquyet_DHDCD%20thuong%20nien_2025.pdf, https://static2.vietstock.vn/data/HOSE/2026/NGHI%20QUYET%20DHCD/VN/HDC_Nghiquyet_DHDCD%20thuong%20nien_2026.pdf