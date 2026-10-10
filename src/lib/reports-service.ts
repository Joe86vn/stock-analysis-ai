import { createClient } from './supabase/server';
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
    cover_label: 'MACRO OUTLOOK',
    author: 'Trần Minh Tiến - Trưởng bộ phận Nghiên cứu Vĩ mô',
    pdf_url: null,
    content: `<h3>I. Lạm Phát Được Kiểm Soát Tốt Nhờ Bình Ổn Giá</h3>
    <p>Chỉ số giá tiêu dùng (CPI) duy trì ở mức ổn định nhờ giá năng lượng hạ nhiệt và chuỗi cung ứng thực phẩm nội địa hoạt động hiệu quả. Lạm phát bình quân duy trì ở mức 3.4%, hoàn thành xuất sắc mục tiêu dưới 4.5% của Quốc hội đề ra.</p>
    
    <h3>II. Điểm Sáng Từ Kim Ngạch Xuất Nhập Khẩu</h3>
    <p>Kim ngạch xuất khẩu hàng hóa duy trì đà bứt phá ấn tượng, đạt tăng trưởng 12% so với cùng kỳ năm trước. Nhóm ngành máy móc thiết bị, linh kiện điện tử và dệt may vẫn là động lực xuất khẩu chính sang các thị trường lớn như Hoa Kỳ, EU và Châu Á.</p>
    
    <h3>III. Tác Động Đến Thị Trường Chứng Khoán</h3>
    <p>Môi trường vĩ mô ổn định tạo bệ đỡ vững chắc cho các doanh nghiệp niêm yết lên kế hoạch kinh doanh ổn định trong nửa cuối năm. Chính sách tiền tệ linh hoạt giúp dòng vốn quay lại thị trường chứng khoán.</p>`,
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

export async function fetchReports(category: string = 'all'): Promise<ReportItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('posts')
      .select('id, title, slug, excerpt, content, category, is_vip, created_at, cover_label, author, pdf_url')
      .order('created_at', { ascending: false });

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as ReportItem[];
    }
  } catch (err) {
    // Supabase query failed or not configured, gracefully fallback to sample reports
  }

  if (category === 'all') {
    return INITIAL_REPORTS;
  }
  return INITIAL_REPORTS.filter((r) => r.category === category);
}

export async function fetchReportDetail(slug: string): Promise<ReportItem | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!error && data) {
      return data as ReportItem;
    }
  } catch (err) {
    // Supabase query failed or not configured, fallback to sample reports
  }

  const localPosts = getLocalPosts();
  return localPosts.find((r) => r.slug === slug) || INITIAL_REPORTS.find((r) => r.slug === slug) || null;
}

import fs from 'fs';
import path from 'path';

const POSTS_FILE_PATH = path.join(process.cwd(), 'data', 'posts.json');

function getLocalPosts(): ReportItem[] {
  try {
    if (!fs.existsSync(POSTS_FILE_PATH)) {
      const dir = path.dirname(POSTS_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(POSTS_FILE_PATH, JSON.stringify(INITIAL_REPORTS, null, 2), 'utf-8');
      return INITIAL_REPORTS;
    }
    const raw = fs.readFileSync(POSTS_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_REPORTS;
  } catch {
    return INITIAL_REPORTS;
  }
}

function saveLocalPosts(posts: ReportItem[]) {
  try {
    const dir = path.dirname(POSTS_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tempPath = `${POSTS_FILE_PATH}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(posts, null, 2), 'utf-8');
    fs.renameSync(tempPath, POSTS_FILE_PATH);
  } catch (err) {
    console.error('Failed to save local posts:', err);
  }
}

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

  // Sync to Supabase if available
  try {
    const supabase = await createClient();
    if (data.id) {
      await supabase.from('posts').update({
        title: updatedItem.title,
        slug: updatedItem.slug,
        excerpt: updatedItem.excerpt,
        content: updatedItem.content,
        category: updatedItem.category,
        is_vip: updatedItem.is_vip,
        pdf_url: updatedItem.pdf_url,
      }).eq('id', updatedItem.id);
    } else {
      await supabase.from('posts').insert({
        title: updatedItem.title,
        slug: updatedItem.slug,
        excerpt: updatedItem.excerpt,
        content: updatedItem.content,
        category: updatedItem.category,
        is_vip: updatedItem.is_vip,
        pdf_url: updatedItem.pdf_url,
      });
    }
  } catch {}

  return updatedItem;
}

export async function deleteReportById(id: string): Promise<boolean> {
  const posts = getLocalPosts();
  const filtered = posts.filter((p) => p.id !== id);
  saveLocalPosts(filtered);

  try {
    const supabase = await createClient();
    await supabase.from('posts').delete().eq('id', id);
  } catch {}

  return true;
}
