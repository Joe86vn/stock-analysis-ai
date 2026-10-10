export type ReportCategory = 'macro' | 'strategy' | 'enterprise' | 'case_study' | 'portfolio';

export interface ReportItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: ReportCategory;
  is_vip: boolean;
  created_at: string;
  cover_label?: string;
  author?: string;
  pdf_url?: string | null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  all: 'Tất cả báo cáo',
  macro: 'Báo cáo Vĩ mô',
  strategy: 'Báo cáo Chiến lược',
  enterprise: 'Phân tích Doanh nghiệp',
  case_study: 'Case Study thực chiến',
  portfolio: 'Hiệu suất danh mục',
};
