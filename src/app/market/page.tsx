import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { MarketWatchDashboard } from '@/components/market/MarketWatchDashboard';

export const metadata: Metadata = {
  title: 'Market Watch | ValueX - Phân Tích Nhịp Đập Thị Trường',
  description: 'Theo dõi nhịp đập thị trường VN-Index, điểm sức khỏe CANSLIM, phiên phân phối, bùng nổ theo đà, độ rộng thị trường, định giá PE/PB và dòng tiền khối ngoại.',
};

export default function MarketWatchPage() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#070B13]">
      <Header />
      <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative">
        <MarketWatchDashboard />
      </main>
    </div>
  );
}
