/**
 * Python Worker Client (FastAPI on Render.com)
 * Kết nối an toàn với Python Worker, hỗ trợ timeout linh hoạt cho Render Cold Start
 */

const WORKER_URL = process.env.PYTHON_WORKER_URL?.replace(/\/+$/, '');
const WORKER_SECRET = process.env.WORKER_SECRET;

export interface WorkerHealthStatus {
  ok: boolean;
  status?: string;
  version?: string;
  isSleeping?: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Kiểm tra xem Worker URL đã được cấu hình chưa
 */
export function isWorkerConfigured(): boolean {
  return Boolean(WORKER_URL);
}

/**
 * Gọi HTTP tới Python Worker kèm header bảo mật và timeout
 */
export async function fetchWorker(
  endpoint: string,
  init?: RequestInit,
  timeoutMs: number = 60000 // 60s để phòng Render Free Cold Start
): Promise<Response> {
  if (!WORKER_URL) {
    throw new Error('PYTHON_WORKER_URL chưa được cấu hình trong biến môi trường');
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${WORKER_URL}${cleanEndpoint}`;

  const headers = new Headers(init?.headers);
  if (WORKER_SECRET) {
    headers.set('X-Worker-Secret', WORKER_SECRET);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Kiểm tra trạng thái máy chủ Render (/health)
 */
export async function checkWorkerHealth(): Promise<WorkerHealthStatus> {
  if (!WORKER_URL) {
    return { ok: false, error: 'Chưa cấu hình PYTHON_WORKER_URL' };
  }

  const start = Date.now();
  try {
    // 8s timeout cho health check thông thường
    const res = await fetchWorker('/health', { method: 'GET', cache: 'no-store' }, 8000);
    const latencyMs = Date.now() - start;

    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        status: data.status,
        version: data.version,
        latencyMs,
      };
    }
    return {
      ok: false,
      error: `Worker trả về mã lỗi ${res.status}: ${res.statusText}`,
      latencyMs,
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
    return {
      ok: false,
      isSleeping: isTimeout,
      error: isTimeout
        ? 'Máy chủ Render đang trong trạng thái ngủ (Cold Start). Vui lòng đợi trong giây lát...'
        : (err.message || 'Không thể kết nối tới Python Worker'),
    };
  }
}
