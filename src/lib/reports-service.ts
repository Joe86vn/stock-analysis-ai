import fs from 'fs';
import path from 'path';
import { ReportItem } from '@/types/reports';

export const INITIAL_REPORTS: ReportItem[] = [
  {
    id: 'mock-1',
    title: 'Báo cáo Chiến lược Q3/2026: Đón đầu sóng hạ tầng và chu kỳ nới lỏng tiền tệ',
    slug: 'bao-cao-chien-luoc-q3-2026',
    excerpt: 'Phân tích xu hướng dòng tiền lớn trên thị trường, định hướng phân bổ tài sản vào các nhóm ngành hưởng lợi từ FDI và đầu tư công.',
    category: 'strategy',
    is_vip: true,
    created_at: '2026-08-15T08:30:00Z',
    cover_label: 'STRATEGY',
    author: 'Đội ngũ Phân tích Chiến lược ValueX',
    pdf_url: 'reports/bao-cao-chien-luoc-q3-2026.pdf',
    content: `<h3>I. Bối Cảnh Vĩ Mô & Dòng Tiền Lớn</h3>
    <p>Thị trường chứng khoán Việt Nam trong nửa cuối năm 2026 đang bước vào giai đoạn bản lề với sự hỗ trợ đồng pha từ cả chính sách tiền tệ lẫn tài khóa. Lãi suất điều hành duy trì ở mức thấp kỷ lục giúp kích thích dòng vốn tín dụng quay trở lại nền kinh tế thực, trong khi các dự án hạ tầng trọng điểm quốc gia bước vào giai đoạn tăng tốc giải ngân.</p>
    <p>Dòng tiền thông minh (Smart Money) có xu hướng rút khỏi các kênh đầu cơ ngắn hạn để tập trung vào các doanh nghiệp đầu ngành có năng lực thực thi dự án vượt trội, dòng tiền thuần dương và định giá còn nằm trong vùng chiết khấu hấp dẫn.</p>
    
    <h3>II. Định Hướng Chiến Lược Phân Bổ Tài Sản</h3>
    <p>Chúng tôi khuyến nghị nhà đầu tư phân bổ danh mục theo tỷ lệ 70% Cổ phiếu tăng trưởng có nền tảng cơ bản vững chắc và 30% Tiền mặt để nắm bắt các nhịp rung lắc của thị trường. Nhóm ngành ưu tiên đặc biệt trong nửa cuối năm 2026 bao gồm:</p>
    <ul>
      <li><strong>Bất động sản Khu công nghiệp (BĐS KCN):</strong> Hưởng lợi trực tiếp từ xu hướng dịch chuyển chuỗi cung ứng toàn cầu và dòng vốn FDI giải ngân kỷ lục.</li>
      <li><strong>Cảng biển & Logistics:</strong> Kỳ vọng sản lượng hàng hóa thông qua cụm cảng nước sâu Cái Mép - Thị Vải và Lạch Huyện tăng trưởng 2 chữ số.</li>
      <li><strong>Đầu tư công & Vật liệu xây dựng:</strong> Động lực tăng trưởng doanh thu và lợi nhuận từ tiến độ bàn giao các tuyến cao tốc Bắc - Nam và sân bay Long Thành.</li>
    </ul>

    <h3>III. Danh Mục Theo Dõi Tiêu Biểu & Khuyến Nghị</h3>
    <p>Trong báo cáo chi tiết đính kèm dưới dạng PDF, chúng tôi cung cấp phân tích sâu về 3 mã cổ phiếu tiềm năng nhất Q3/2026 có mức định giá chiết khấu sâu so với giá trị thực tế, cùng với vùng giá mua/bán và cắt lỗ cụ thể để nhà đầu tư hành động.</p>
    <p>Hệ thống quản trị rủi ro của ValueX yêu cầu tuân thủ kỷ luật nghiêm ngặt: giải ngân từng phần (chia làm 3 đợt) và kiểm soát tỷ lệ margin thận trọng trong giai đoạn thị trường phân hóa mạnh.</p>`,
  },
  {
    id: 'mock-2',
    title: 'Phân tích doanh nghiệp HPG: Bản lĩnh thép hàng đầu Việt Nam và động lực từ Dung Quất 2',
    slug: 'phan-tich-doanh-nghiep-hpg-dung-quat-2',
    excerpt: 'Đánh giá chi tiết dự án Dung Quất 2, cơ cấu tài chính vững mạnh và định giá cổ phiếu HPG trong chu kỳ phục hồi của ngành vật liệu.',
    category: 'enterprise',
    is_vip: false,
    created_at: '2026-08-18T14:15:00Z',
    cover_label: 'HPG ANALYTICS',
    author: 'Nguyễn Văn Hải - Chuyên viên Phân tích Ngành',
    pdf_url: null,
    content: `<h3>I. Động Lực Từ Đại Dự Án Dung Quất 2</h3>
    <p>Dự án Khu liên hợp sản xuất gang thép Hòa Phát Dung Quất 2 với tổng công suất thiết kế 5.6 triệu tấn thép cuộn cán nóng (HRC) chất lượng cao mỗi năm đang tiến gần đến ngày vận hành thương mại. Dự án này sẽ đưa tổng công suất thép thô của Hòa Phát lên hơn 14 triệu tấn/năm, khẳng định vị thế Top 30 doanh nghiệp thép lớn nhất thế giới.</p>
    <p>Dung Quất 2 giúp tối ưu hóa chi phí sản xuất trên quy mô lớn, gia tăng biên lợi nhuận gộp nhờ tự chủ nguồn nguyên liệu HRC chất lượng cao, phục vụ cho ngành sản xuất tôn mạ, ống thép và công nghiệp ô tô nội địa.</p>
    
    <h3>II. Sức Khỏe Tài Chính Vững Vàng</h3>
    <p>Bất chấp giai đoạn khó khăn chung của ngành thép toàn cầu, HPG đã cơ cấu lại các khoản nợ vay ngoại tệ, giảm thiểu rủi ro tỷ giá. Tỷ lệ Nợ/Vốn chủ sở hữu duy trì ở mức an toàn dưới 0.6x. Dòng tiền hoạt động kinh doanh thặng dư mạnh mẽ đảm bảo nguồn vốn đầu tư hoàn thiện Dung Quất 2 mà không tạo áp lực tài chính quá mức lên cổ đông.</p>
    
    <h3>III. Định Giá Và Khuyến Nghị Đầu Tư</h3>
    <p>Chúng tôi dự báo doanh thu của HPG sẽ tăng trưởng trên 20% khi Dung Quất 2 vận hành thương mại đạt 80% công suất. Với P/E mục tiêu là 12.5x và P/B là 1.6x, chúng tôi định giá hợp lý cho cổ phiếu HPG là 36,500đ/cp (cao hơn 25% so với thị giá hiện tại). Khuyến nghị: TÍCH LŨY quanh vùng giá hợp lý cho mục tiêu trung và dài hạn.</p>`,
  },
  {
    id: 'mock-3',
    title: 'Báo cáo Vĩ mô Tháng 8/2026: Kiểm soát lạm phát và đà bứt phá của xuất khẩu',
    slug: 'bao-cao-vi-mo-thang-8-2026',
    excerpt: 'Điểm tin số liệu vĩ mô mới nhất, biến động tỷ giá và ảnh hưởng từ chính sách tiền tệ của các ngân hàng trung ương lớn đến thị trường Việt Nam.',
    category: 'macro',
    is_vip: false,
    created_at: '2026-08-20T09:00:00Z',
    cover_label: 'MACRO VIEW',
    author: 'Trần Thu Trang - Chuyên gia Kinh tế Vĩ mô',
    pdf_url: null,
    content: `<h3>I. Tổng Quan Số Liệu Kinh Tế Tháng 8/2026</h3>
    <p>Chỉ số giá tiêu dùng (CPI) tháng 8/2026 tiếp tục duy trì đà tăng trưởng vừa phải ở mức 3.2% so với cùng kỳ năm trước, hoàn toàn nằm trong mục tiêu kiểm soát lạm phát 4.0 - 4.5% của Quốc hội. Giá lương thực thực phẩm và giá xăng dầu hạ nhiệt đóng góp lớn vào việc ổn định mặt bằng giá cả sinh hoạt.</p>
    <p>Cán cân thương mại hàng hóa ghi nhận mức xuất siêu ấn tượng hơn 18 tỷ USD từ đầu năm, tạo bộ đệm ngoại hối vững chắc cho Ngân hàng Nhà nước trong việc điều hành chính sách tiền tệ và giảm áp lực mất giá lên đồng VND.</p>
    
    <h3>II. Động Thái Các Ngân Hàng Trung Ương Lớn</h3>
    <p>Cục Dự trữ Liên bang Mỹ (FED) đã phát tín hiệu rõ ràng về việc bắt đầu chu kỳ hạ lãi suất đồng USD. Chênh lệch lãi suất VND - USD thu hẹp đáng kể sẽ mở ra dư địa thuận lợi cho Việt Nam duy trì mặt bằng lãi suất cho vay thấp kỷ lục để kích thích tăng trưởng kinh tế mà không quá lo ngại về hiện tượng chảy máu dòng vốn ngoại.</p>
    
    <h3>III. Tác Động Lên Thị Trường Chứng Khoán</h3>
    <p>Môi trường tiền tệ nới lỏng luôn là môi trường màu mỡ cho thị trường cổ phiếu. Khi chi phí cơ hội của dòng tiền gửi tiết kiệm suy giảm, dòng vốn của các nhà đầu tư cá nhân sẽ tiếp tục tìm đến kênh chứng khoán như một kênh sinh lời vượt trội để tích lũy tài sản dài hạn.</p>`,
  },
  {
    id: 'mock-4',
    title: 'Case Study: Bài học đầu tư tăng trưởng vượt bậc với cổ phiếu FPT giai đoạn 2024-2026',
    slug: 'case-study-dau-tu-fpt-tang-truong',
    excerpt: 'Phân tích chi tiết mô hình kinh doanh dịch vụ CNTT toàn cầu, làn sóng AI bán dẫn và các điểm mua/bán tối ưu hóa lợi nhuận của ValueX.',
    category: 'case_study',
    is_vip: true,
    created_at: '2026-08-10T10:00:00Z',
    cover_label: 'CASE STUDY',
    author: 'Đội ngũ Phân tích ValueX',
    pdf_url: 'reports/case-study-fpt-2026.pdf',
    content: `<h3>I. Tổng Quan Deal Đầu Tư FPT Của ValueX</h3>
    <p>FPT là một trong những deal đầu tư thành công nhất của đội ngũ ValueX với mức sinh lời trên 120% trong vòng 2 năm. Đây là case study điển hình về việc áp dụng phương pháp đầu tư tăng trưởng kết hợp phân tích chu kỳ ngành công nghệ thông tin toàn cầu và làn sóng AI bán dẫn.</p>
    
    <h3>II. Động Lực Tăng Trưởng Lõi Của FPT</h3>
    <p>Chúng tôi phát hiện ra FPT đạt điểm rơi lợi nhuận nhờ 3 yếu tố quyết định:</p>
    <ol>
      <li><strong>Mở rộng quy mô toàn cầu:</strong> Doanh thu từ thị trường Nhật Bản và Mỹ liên tục tăng trưởng trên 25%/năm nhờ nhu cầu chuyển đổi số cao.</li>
      <li><strong>Định vị trong chuỗi AI & Bán dẫn:</strong> Hợp tác với các đối tác hàng đầu thế giới (NVIDIA) xây dựng nhà máy AI Factory tạo ra động lực tăng trưởng doanh thu dài hạn mới.</li>
      <li><strong>Mảng giáo dục:</strong> Quy mô tuyển sinh tăng trưởng ổn định cung cấp nguồn nhân lực nội bộ dồi dào với chi phí tối ưu.</li>
    </ol>

    <h3>III. Bài Học Thực Chiến Về Điểm Mua Kỹ Thuật Và Quản Trị Vị Thế</h3>
    <p>Báo cáo đính kèm phân tích chi tiết cách ValueX gom cổ phiếu ở các vùng tích lũy nền giá phẳng vào đầu chu kỳ, cách nhồi vị thế khi cổ phiếu bứt phá khỏi điểm pivot, và các nguyên tắc chốt lời từng phần khi cổ phiếu quá mua. Đây là những bài học xương máu giúp nhà đầu tư xây dựng tư duy giao dịch chuyên nghiệp.</p>`,
  },
];

const POSTS_FILE_PATH = path.join(process.cwd(), 'data', 'posts.json');

declare global {
  // eslint-disable-next-line no-var
  var __POSTS_STORE__: ReportItem[] | undefined;
}

function getLocalPosts(): ReportItem[] {
  if (globalThis.__POSTS_STORE__ && Array.isArray(globalThis.__POSTS_STORE__)) {
    return globalThis.__POSTS_STORE__;
  }

  try {
    if (fs.existsSync(POSTS_FILE_PATH)) {
      const raw = fs.readFileSync(POSTS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalThis.__POSTS_STORE__ = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[reports-service] Cannot read local posts file:', err);
  }

  globalThis.__POSTS_STORE__ = [...INITIAL_REPORTS];

  // Best effort write
  try {
    const dir = path.dirname(POSTS_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(POSTS_FILE_PATH, JSON.stringify(INITIAL_REPORTS, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem on Vercel/serverless — safe to ignore
  }

  return globalThis.__POSTS_STORE__;
}

function saveLocalPosts(posts: ReportItem[]) {
  globalThis.__POSTS_STORE__ = posts;
  try {
    const dir = path.dirname(POSTS_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tempPath = `${POSTS_FILE_PATH}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(posts, null, 2), 'utf-8');
    fs.renameSync(tempPath, POSTS_FILE_PATH);
  } catch (err) {
    console.warn('[reports-service] File save skipped (read-only filesystem or IO error):', err);
  }
}

/**
 * Lấy danh sách báo cáo - Tốc độ tức thì (<1ms) từ local cache / file store
 */
export async function fetchReports(category: string = 'all'): Promise<ReportItem[]> {
  const posts = getLocalPosts();
  if (category === 'all') {
    return posts;
  }
  return posts.filter((r) => r.category === category);
}

/**
 * Lấy chi tiết báo cáo theo slug - Tốc độ tức thì (<1ms)
 */
export async function fetchReportDetail(slug: string): Promise<ReportItem | null> {
  const localPosts = getLocalPosts();
  return localPosts.find((r) => r.slug === slug) || INITIAL_REPORTS.find((r) => r.slug === slug) || null;
}

/**
 * Lưu hoặc cập nhật báo cáo CMS
 */
export async function saveReport(data: Partial<ReportItem>): Promise<ReportItem> {
  const posts = getLocalPosts();
  let updatedItem: ReportItem;

  if (data.id) {
    const idx = posts.findIndex((p) => p.id === data.id);
    if (idx >= 0) {
      updatedItem = { ...posts[idx], ...data } as ReportItem;
      posts[idx] = updatedItem;
    } else {
      updatedItem = {
        id: data.id,
        title: data.title || '',
        slug: data.slug || '',
        excerpt: data.excerpt || '',
        content: data.content || '',
        category: data.category || 'strategy',
        is_vip: !!data.is_vip,
        created_at: data.created_at || new Date().toISOString(),
        author: data.author || 'ValueX Team',
        pdf_url: data.pdf_url || null,
        cover_label: data.cover_label || 'VALUEX REPORT',
      };
      posts.unshift(updatedItem);
    }
  } else {
    updatedItem = {
      id: `post_${Date.now()}`,
      title: data.title || '',
      slug: data.slug || '',
      excerpt: data.excerpt || '',
      content: data.content || '',
      category: data.category || 'strategy',
      is_vip: !!data.is_vip,
      created_at: new Date().toISOString(),
      author: data.author || 'ValueX Team',
      pdf_url: data.pdf_url || null,
      cover_label: data.cover_label || 'VALUEX REPORT',
    };
    posts.unshift(updatedItem);
  }

  saveLocalPosts(posts);
  return updatedItem;
}

/**
 * Xóa báo cáo theo id
 */
export async function deleteReportById(id: string): Promise<boolean> {
  const posts = getLocalPosts();
  const filtered = posts.filter((p) => p.id !== id);
  saveLocalPosts(filtered);
  return true;
}
