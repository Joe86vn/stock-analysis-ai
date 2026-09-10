import { NextRequest, NextResponse } from 'next/server';
import { COMMON_HEADERS, fetchVietcapSectorRs, fetchVietcapStatisticsFinancial } from '@/lib/vietcap-field-mapping';

function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const cleanTicker = ticker.trim().toUpperCase();
    const { searchParams } = new URL(request.url);
    let icbCodeLv4 = searchParams.get('icbCodeLv4') || searchParams.get('icbCode4');
    let icbCodeLv2 = searchParams.get('icbCodeLv2') || searchParams.get('icbCode');

    // 1. Nếu chưa có icbCode truyền vào, tự lấy từ company details
    if (!icbCodeLv4 || !icbCodeLv2) {
      try {
        const detailsRes = await fetch(
          `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/details?ticker=${cleanTicker}`,
          { headers: COMMON_HEADERS, next: { revalidate: 86400 } }
        );
        if (detailsRes.ok) {
          const json = await detailsRes.json();
          if (!icbCodeLv4) icbCodeLv4 = json.data?.icbCodeLv4 || null;
          if (!icbCodeLv2) icbCodeLv2 = json.data?.icbCodeLv2 || null;
        }
      } catch (err) {
        console.warn(`[Peers API] Could not auto-fetch icbCode for ${cleanTicker}:`, err);
      }
    }

    if (!icbCodeLv4 && !icbCodeLv2) {
      return NextResponse.json({
        ticker: cleanTicker,
        icbCode: null,
        peers: [],
        medians: null,
        warning: 'Chưa xác định được mã ngành ICB của cổ phiếu',
      });
    }

    // 2. Ưu tiên cấp 4 để tìm đối thủ cạnh tranh trực tiếp nhất, fallback cấp 2 nếu danh sách quá ít
    let sectorStocks: any[] = [];
    let usedIcb = icbCodeLv4 || icbCodeLv2;
    let usedLevel = 2;

    if (icbCodeLv4) {
      sectorStocks = await fetchVietcapSectorRs(icbCodeLv4, 4);
      usedLevel = 4;
      usedIcb = icbCodeLv4;
    }

    if ((!sectorStocks || sectorStocks.length <= 1) && icbCodeLv2) {
      const lv2Stocks = await fetchVietcapSectorRs(icbCodeLv2, 2);
      if (lv2Stocks && lv2Stocks.length > 0) {
        sectorStocks = lv2Stocks;
        usedLevel = 2;
        usedIcb = icbCodeLv2;
      }
    }

    const candidateTickers = (sectorStocks || [])
      .map((s: any) => s.ticker)
      .filter((t: string) => t && t !== cleanTicker);

    if (candidateTickers.length === 0) {
      return NextResponse.json({
        ticker: cleanTicker,
        icbCode: usedIcb,
        icbCodeLv2,
        icbCodeLv4,
        icbLevel: usedLevel,
        peers: [],
        medians: null,
        warning: 'Không tìm thấy cổ phiếu đối thủ nào cùng nhóm ngành',
      });
    }

    // 3. Lấy dữ liệu thống kê của tối đa 10 đối thủ tiềm năng để lọc Top 3 vốn hóa lớn nhất
    const candidatePromises = candidateTickers.slice(0, 10).map(async (peerTicker) => {
      try {
        const rawStats = await fetchVietcapStatisticsFinancial(peerTicker);
        const validQuarters = (rawStats || [])
          .filter((q) => q.quarter >= 1 && q.quarter <= 4)
          .sort((a, b) => {
            const yA = Number(a.year) || 0;
            const yB = Number(b.year) || 0;
            if (yA !== yB) return yA - yB;
            return a.quarter - b.quarter;
          });

        const latest = validQuarters.slice(-1)[0];
        if (!latest) return null;

        return {
          ticker: peerTicker,
          marketCap: latest.marketCap || 0,
          pe: typeof latest.pe === 'number' && latest.pe > 0 ? Number(latest.pe.toFixed(2)) : null,
          pb: typeof latest.pb === 'number' && latest.pb > 0 ? Number(latest.pb.toFixed(2)) : null,
          evEbitda: typeof latest.evToEbitda === 'number' && latest.evToEbitda > 0 ? Number(latest.evToEbitda.toFixed(2)) : null,
        };
      } catch {
        return null;
      }
    });

    const candidateResults = await Promise.all(candidatePromises);
    const validPeersWithStats = candidateResults
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => b.marketCap - a.marketCap);

    // 4. Lấy Top 3 vốn hóa lớn nhất
    const top3Peers = validPeersWithStats.slice(0, 3);

    // 5. Tính trung vị ngành & trần P/E của peer
    const peList = top3Peers.map((p) => p.pe).filter((v): v is number => typeof v === 'number');
    const pbList = top3Peers.map((p) => p.pb).filter((v): v is number => typeof v === 'number');
    const evList = top3Peers.map((p) => p.evEbitda).filter((v): v is number => typeof v === 'number');

    const medians = {
      pe: peList.length > 0 ? Number(calculateMedian(peList).toFixed(2)) : null,
      pb: pbList.length > 0 ? Number(calculateMedian(pbList).toFixed(2)) : null,
      evEbitda: evList.length > 0 ? Number(calculateMedian(evList).toFixed(2)) : null,
      maxPe: peList.length > 0 ? Number(Math.max(...peList).toFixed(2)) : null,
    };

    return NextResponse.json({
      ticker: cleanTicker,
      icbCode: usedIcb,
      icbCodeLv2,
      icbCodeLv4,
      icbLevel: usedLevel,
      peers: top3Peers,
      medians,
    });
  } catch (error: any) {
    console.error(`[Peers API] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi lấy dữ liệu đối thủ cùng ngành' },
      { status: 500 }
    );
  }
}
