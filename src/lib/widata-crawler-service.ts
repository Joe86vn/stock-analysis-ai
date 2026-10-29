import crypto from 'crypto';
import { EarningsRecord, EarningsPeriod, ExchangeType } from '@/types/earnings';
import { getEarningsStore, mergeWiDataRecords } from './earnings-store';

const WIDATA_SECRET_KEY = 'ZmRvaWFmaGRpc2ZoaWRzZHNoa2RoaW9zZGZoc2E=';
const SIGN_TOKEN = 'ObBeWhVmYs3tP2Nz$C$FJ@P4AQfTjlPX';

/**
 * Hàm dẫn xuất Key và IV theo chuẩn OpenSSL EVP_BytesToKey (tương thích CryptoJS)
 */
function evpBytesToKey(password: Buffer, salt: Buffer, keyLen = 32, ivLen = 16) {
  let d = Buffer.alloc(0);
  let d_i = Buffer.alloc(0);
  while (d.length < keyLen + ivLen) {
    const hash = crypto.createHash('md5');
    hash.update(d_i);
    hash.update(password);
    hash.update(salt);
    d_i = hash.digest();
    d = Buffer.concat([d, d_i]);
  }
  return {
    key: d.subarray(0, keyLen),
    iv: d.subarray(keyLen, keyLen + ivLen),
  };
}

/**
 * Giải mã chuỗi AES ciphertext trả về từ WiData / WiChart backend
 */
export function decryptWiDataPayload(ciphertextBase64: string, secretKey = WIDATA_SECRET_KEY): string {
  const cipherBuffer = Buffer.from(ciphertextBase64, 'base64');
  if (cipherBuffer.subarray(0, 8).toString('utf8') !== 'Salted__') {
    throw new Error('Invalid OpenSSL ciphertext header (missing Salted__)');
  }
  const salt = cipherBuffer.subarray(8, 16);
  const data = cipherBuffer.subarray(16);
  const password = Buffer.from(secretKey, 'utf8');
  const { key, iv } = evpBytesToKey(password, salt, 32, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Tạo Header có chữ ký bảo mật MD5 chống bot theo thuật toán của WiData
 */
export function generateWiDataRequestHeaders(params: Record<string, any> = {}): Record<string, string> {
  const authParams: Record<string, any> = {
    stime: Date.now(),
    nonce: Math.floor((Math.random() + Math.floor(9 * Math.random() + 1)) * 1e19).toString(),
    'sign-token': SIGN_TOKEN,
    v: 'v1',
  };

  const merged = { ...params, ...authParams };
  Object.keys(merged).forEach((k) => {
    if (merged[k] === undefined || merged[k] === null) {
      delete merged[k];
    }
  });

  const sortedKeys = Object.keys(merged).filter((k) => k !== 'sign').sort();
  let rawStr = '';
  sortedKeys.forEach((k) => {
    const v = merged[k];
    rawStr += k + (v instanceof Date ? v.toISOString() : v);
  });

  const sign = crypto.createHash('md5').update(rawStr).digest('hex');

  return {
    stime: String(authParams.stime),
    nonce: String(authParams.nonce),
    'sign-token': String(authParams['sign-token']),
    v: String(authParams.v),
    sign,
    Origin: 'https://widata.vn',
    Referer: 'https://widata.vn/ket-qua-kinh-doanh',
    Accept: 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
}

/**
 * 1. Lấy thông tin Quý và Năm mới nhất đã có BCTC công bố từ WiData
 */
export async function getLatestWiDataQuarter(): Promise<{ quy: number; nam: number; idquy: number }> {
  const headers = generateWiDataRequestHeaders({});
  const res = await fetch('https://wichart.vn/wichartapi/wichart/newfs/get-time', {
    headers,
    next: { revalidate: 300 }, // Cache 5 phút
  });

  if (!res.ok) {
    throw new Error(`WiData get-time failed with status ${res.status}`);
  }

  const json = await res.json();
  const data = json?.data;
  if (!data?.quy || !data?.nam) {
    throw new Error('Dữ liệu get-time không hợp lệ từ WiData');
  }

  return {
    quy: Number(data.quy),
    nam: Number(data.nam),
    idquy: Number(data.idquy || 0),
  };
}

export interface WiDataFsItem {
  mack: string;
  san: string;
  nganhcap4_vi?: string;
  doanhthu: number;
  doanhthu_lkdn: number;
  doanhthu_htkh?: number | null;
  doanhthu_ttckn?: number | null;
  doanhthu_ttckq?: number | null;
  loinhuan: number;
  loinhuan_lkdn: number;
  loinhuan_htkh?: number | null;
  loinhuan_ttckn?: number | null;
  loinhuan_ttckq?: number | null;
  pe?: number | null;
  vonhoa?: number | null;
  smg?: number | null;
  close?: number | null;
  trungbinh_vol_15ngay?: number | null;
  kiemtoan?: string | null;
  ngayup?: string;
  full_count?: string;
}

/**
 * 2. Lấy danh sách kết quả kinh doanh từ WiData và giải mã
 */
export async function fetchWiDataQuarterlyEarnings(options?: {
  quy?: number;
  nam?: number;
  page?: number;
  limit?: number;
}): Promise<{ quy: number; nam: number; total: number; items: WiDataFsItem[] }> {
  let { quy, nam } = options || {};
  if (!quy || !nam) {
    const timeInfo = await getLatestWiDataQuarter();
    quy = timeInfo.quy;
    nam = timeInfo.nam;
  }

  const page = options?.page || 1;
  const limit = options?.limit || 1000; // Mặc định lấy tối đa để bao phủ toàn bộ doanh nghiệp trong 1 request

  const query = { page, limit, quy, nam };
  const headers = generateWiDataRequestHeaders(query);
  const qs = new URLSearchParams(query as any).toString();
  const url = `https://wichart.vn/wichartapi/wichart/newfs?${qs}`;

  const res = await fetch(url, {
    headers,
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`WiData newfs API trả về mã lỗi: ${res.status}`);
  }

  const body = await res.json();
  if (!body.enc) {
    throw new Error('Phản hồi từ WiData không có trường enc mã hóa');
  }

  const decryptedJsonStr = decryptWiDataPayload(body.enc);
  const parsed = JSON.parse(decryptedJsonStr);
  const items: WiDataFsItem[] = Array.isArray(parsed?.result) ? parsed.result : [];
  const total = items.length > 0 && items[0].full_count ? parseInt(items[0].full_count, 10) : items.length;

  return {
    quy,
    nam,
    total,
    items,
  };
}

/**
 * Định dạng ngày ISO thành DD/MM/YYYY
 */
function formatPublishDate(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return new Date().toLocaleDateString('vi-VN');
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoOrDateStr;
  }
}

/**
 * Chuẩn hóa tên sàn
 */
function normalizeExchange(san?: string): ExchangeType {
  const clean = (san || '').trim().toUpperCase();
  if (clean === 'HOSE' || clean === 'HSX') return 'HOSE';
  if (clean === 'HNX') return 'HNX';
  if (clean === 'UPCOM') return 'UPCOM';
  return 'OTHER';
}

/**
 * Chuyển đổi 1 bản ghi WiData thành EarningsRecord theo đúng chuẩn ValueX
 */
export function convertWiDataItemToEarningsRecord(
  item: WiDataFsItem,
  quy: number,
  nam: number
): EarningsRecord {
  const ticker = item.mack.trim().toUpperCase();
  const period: EarningsPeriod = `Q${quy}` as EarningsPeriod;
  const id = `${ticker}_${nam}_${period}_CONSOLIDATED`;

  // Doanh thu (WiData đơn vị Tỷ VNĐ -> quy đổi về VNĐ)
  const revCurrent = Math.round((Number(item.doanhthu) || 0) * 1_000_000_000);
  const revYoYPercent =
    typeof item.doanhthu_ttckn === 'number'
      ? Number(item.doanhthu_ttckn.toFixed(2))
      : typeof item.doanhthu_ttckq === 'number'
      ? Number(item.doanhthu_ttckq.toFixed(2))
      : null;
  const revPrevious =
    revYoYPercent !== null && revYoYPercent !== -100
      ? Math.round(revCurrent / (1 + revYoYPercent / 100))
      : 0;

  // Lợi nhuận sau thuế (WiData đơn vị Tỷ VNĐ -> quy đổi về VNĐ)
  const patCurrent = Math.round((Number(item.loinhuan) || 0) * 1_000_000_000);
  // ttckn: Tăng trưởng cùng kỳ năm (YoY - svck), ttckq: Tăng trưởng quý liền trước (QoQ)
  const patYoYPercent =
    typeof item.loinhuan_ttckn === 'number'
      ? Number(item.loinhuan_ttckn.toFixed(2))
      : null;
  const patQoQPercent =
    typeof item.loinhuan_ttckq === 'number' ? Number(item.loinhuan_ttckq.toFixed(2)) : null;
  const patPrevious =
    patYoYPercent !== null && patYoYPercent !== -100
      ? Math.round(patCurrent / (1 + patYoYPercent / 100))
      : 0;

  // Tính thanh khoản GTGD 20 phiên từ KLGD TB 15 ngày và giá đóng cửa nếu có
  const adtvBillion =
    item.trungbinh_vol_15ngay && item.close
      ? Number(((item.trungbinh_vol_15ngay * 1000 * item.close) / 1_000_000_000).toFixed(4))
      : null;

  return {
    id,
    ticker,
    companyName: item.nganhcap4_vi ? `${ticker} (${item.nganhcap4_vi})` : `Công ty Cổ phần ${ticker}`,
    exchange: normalizeExchange(item.san),
    year: nam,
    period,
    reportType: 'CONSOLIDATED',

    // Doanh thu
    revenueCurrent: revCurrent,
    revenuePrevious: revPrevious,
    revenueYoYPercent: revYoYPercent,

    // Biên lãi gộp (WiData không có bóc tách giá vốn riêng nên để null)
    grossProfitCurrent: 0,
    grossProfitPrevious: 0,
    grossMarginCurrent: null,
    grossMarginPrevious: null,
    grossMarginDelta: null,

    // Lợi nhuận sau thuế
    patCurrent,
    patPrevious,
    patYoYPercent,
    patQoQPercent,

    publishedAt: formatPublishDate(item.ngayup),
    sourceUrl: 'https://widata.vn/ket-qua-kinh-doanh',
    sourceType: 'WIDATA',
    hasPdf: false,
    extractedAt: new Date().toISOString(),

    // Chỉ số bổ trợ
    rsRating: typeof item.smg === 'number' ? Math.round(item.smg) : null,
    adtv20Billion: adtvBillion,
    currentPrice: item.close || null,
  };
}

/**
 * 3. Đồng bộ dữ liệu KQKD từ nguồn WiData vào Store:
 * - Nếu mã nào bên SSC đã có (sourceType === 'SSC' hoặc hasPdf === true), GIỮ NGUYÊN nguồn SSC.
 * - Nếu mã nào bên SSC chưa có, bổ sung từ WiData làm nguồn backup.
 */
export async function syncWiDataEarnings(): Promise<{
  success: boolean;
  activePeriod: string;
  totalWiData: number;
  addedCount: number;
  updatedCount: number;
  skippedExistingSscCount: number;
  message: string;
}> {
  console.log('[WiData Sync] Bắt đầu đồng bộ dữ liệu kết quả kinh doanh từ WiData...');
  const { quy, nam, total, items } = await fetchWiDataQuarterlyEarnings({ limit: 1000 });
  const activePeriod = `Q${quy}/${nam}`;

  if (!items || items.length === 0) {
    return {
      success: false,
      activePeriod,
      totalWiData: 0,
      addedCount: 0,
      updatedCount: 0,
      skippedExistingSscCount: 0,
      message: 'Không tìm thấy dữ liệu BCTC từ WiData.',
    };
  }

  // Chuyển đổi toàn bộ items sang EarningsRecord
  const records = items.map((it) => convertWiDataItemToEarningsRecord(it, quy, nam));

  // Trộn vào store với nguyên tắc ưu tiên nguồn SSC
  const mergeResult = mergeWiDataRecords(records);

  console.log(
    `[WiData Sync] Hoàn tất: Bổ sung mới ${mergeResult.added} mã, cập nhật ${mergeResult.updated} mã WiData cũ, giữ nguyên ${mergeResult.skippedExistingSsc} mã nguồn SSC.`
  );

  return {
    success: true,
    activePeriod,
    totalWiData: items.length,
    addedCount: mergeResult.added,
    updatedCount: mergeResult.updated,
    skippedExistingSscCount: mergeResult.skippedExistingSsc,
    message: `Đã đồng bộ ${items.length} doanh nghiệp từ WiData: Thêm mới ${mergeResult.added} mã, giữ nguyên ${mergeResult.skippedExistingSsc} mã đã có từ SSC.`,
  };
}

