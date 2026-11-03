/**
 * MAS-MCP Client (Mirae Asset Securities Model Context Protocol)
 * 
 * Quản lý kết nối Streamable HTTP tới MCP server của MASVN (https://mcp.masvn.com/mcp)
 * - Tự động quản lý MCP Session ID và handshake `initialize`
 * - Lấy token từ biến môi trường MASVN_TOKEN hoặc tự động nạp từ ~/.gemini/config/mcp_config.json
 * - Trích xuất JSON chuẩn xác (loại bỏ display rules text do server tự append)
 * - Tự động retry khi phiên làm việc hết hạn
 */

import fs from 'fs';
import path from 'path';

export interface MasPriceBar {
  trading_date?: string; // DD/MM/YYYY hoặc YYYY-MM-DD
  date?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  total_volume?: number;
  value?: number;
  total_value?: number;
  change?: number;
  change_percent?: number;
  foreign_buy_volume?: number;
  foreign_sell_volume?: number;
  foreign_buy_value?: number;
  foreign_sell_value?: number;
  [key: string]: any;
}

export interface MasFinancialPeriod {
  period: string; // e.g. "2024" hoặc "Q3/2024"
  year?: number;
  quarter?: number;
  data: Record<string, any>;
}

class MasMcpClient {
  private endpoint = 'https://mcp.masvn.com/mcp';
  private sessionId: string | null = null;
  private sessionCreatedAt = 0;
  private readonly sessionTtlMs = 15 * 60 * 1000; // 15 phút
  private tokenCache: string | null = null;

  /**
   * Lấy Bearer Token hợp lệ
   */
  public getToken(): string | null {
    if (this.tokenCache) return this.tokenCache;

    // 1. Ưu tiên biến môi trường
    if (process.env.MASVN_TOKEN) {
      let t = process.env.MASVN_TOKEN.trim();
      if (!t.startsWith('Bearer ')) t = `Bearer ${t}`;
      this.tokenCache = t;
      return t;
    }

    // 2. Đọc từ .env.local hoặc .env trong workspace
    try {
      const candidates = ['.env.local', '.env'];
      for (const file of candidates) {
        const fullPath = path.resolve(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const match = content.match(/MASVN_TOKEN=["']?([^"'\r\n]+)["']?/);
          if (match && match[1]) {
            let t = match[1].trim();
            if (!t.startsWith('Bearer ')) t = `Bearer ${t}`;
            this.tokenCache = t;
            return t;
          }
        }
      }
    } catch {
      // Bỏ qua
    }

    // 3. Dự phòng: Đọc từ ~/.gemini/config/mcp_config.json
    try {
      const homeDir = process.env.USERPROFILE || process.env.HOME;
      if (homeDir) {
        const configPath = path.join(homeDir, '.gemini', 'config', 'mcp_config.json');
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, 'utf8');
          const cfg = JSON.parse(raw);
          const auth = cfg.mcpServers?.masvn?.headers?.Authorization;
          if (auth) {
            this.tokenCache = auth.startsWith('Bearer ') ? auth : `Bearer ${auth}`;
            return this.tokenCache;
          }
        }
      }
    } catch {
      // Bỏ qua lỗi đọc file
    }

    return null;
  }

  /**
   * Thiết lập token thủ công (nếu cần đổi lúc runtime)
   */
  public setToken(token: string) {
    this.tokenCache = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    this.sessionId = null; // Reset session
  }

  /**
   * Khởi tạo hoặc tái lập MCP Session
   */
  private async ensureSession(): Promise<string> {
    const now = Date.now();
    if (this.sessionId && now - this.sessionCreatedAt < this.sessionTtlMs) {
      return this.sessionId;
    }

    const token = this.getToken();
    if (!token) {
      throw new Error('MASVN Bearer Token not configured. Vui lòng chạy `npm run masvn:login` hoặc cấu hình MASVN_TOKEN.');
    }

    const initRes = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': token,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'valuex-client', version: '1.0.0' },
        },
      }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`MAS-MCP initialize failed (${initRes.status}): ${errText}`);
    }

    const newSessionId = initRes.headers.get('mcp-session-id');
    if (!newSessionId) {
      throw new Error('MAS-MCP did not return mcp-session-id header.');
    }

    // Gửi notification initialized theo đặc tả MCP
    await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': token,
        'mcp-session-id': newSessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
    }).catch(() => {
      // Ignored
    });

    this.sessionId = newSessionId;
    this.sessionCreatedAt = now;
    return newSessionId;
  }

  /**
   * Trích xuất JSON sạch từ nội dung trả về của MAS-MCP
   * (Xử lý trường hợp MASVN tự động append quy tắc định dạng hiển thị vào đuôi text)
   */
  public extractJsonFromText(rawText: string): any {
    if (!rawText) return null;
    const trimmed = rawText.trim();

    // 1. Thử parse trực tiếp
    try {
      return JSON.parse(trimmed);
    } catch {
      // Tiếp tục bóc tách
    }

    // 2. Tìm khối JSON { ... } hoặc [ ... ]
    let firstBrace = trimmed.indexOf('{');
    let firstBracket = trimmed.indexOf('[');

    let startIdx = -1;
    let isObject = false;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      isObject = true;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      isObject = false;
    }

    if (startIdx === -1) {
      return { raw: rawText };
    }

    // Đếm ngoặc mở đóng tương ứng
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    const openChar = isObject ? '{' : '[';
    const closeChar = isObject ? '}' : ']';

    for (let i = startIdx; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === openChar) {
          depth++;
        } else if (char === closeChar) {
          depth--;
          if (depth === 0) {
            const jsonSubstring = trimmed.substring(startIdx, i + 1);
            try {
              return JSON.parse(jsonSubstring);
            } catch {
              break;
            }
          }
        }
      }
    }

    throw new Error('Could not parse clean JSON from MAS-MCP response: ' + rawText.substring(0, 100));
  }

  /**
   * Gọi một công cụ bất kỳ của MAS-MCP
   */
  public async callTool<T = any>(toolName: string, args: Record<string, any> = {}): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new Error('MASVN Bearer Token not configured.');
    }

    let sessionId = await this.ensureSession();

    const execute = async (sId: string) => {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': token,
          'mcp-session-id': sId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.floor(Math.random() * 1000000),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        }),
      });
      return res;
    };

    let res = await execute(sessionId);

    // Nếu session bị 400 hoặc 401, thử renew session và gọi lại 1 lần
    if (res.status === 400 || res.status === 401) {
      this.sessionId = null;
      sessionId = await this.ensureSession();
      res = await execute(sessionId);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MAS-MCP tool call '${toolName}' failed (${res.status}): ${errText}`);
    }

    const rawText = await res.text();
    let payload: any;

    try {
      if (rawText.includes('data:')) {
        // Parse SSE stream format
        const lines = rawText.split('\n');
        const dataLines = lines.filter(l => l.startsWith('data:'));
        if (dataLines.length > 0) {
          // Gộp các data line hoặc lấy data line chứa jsonrpc
          const jsonRpcLine = dataLines.find(l => l.includes('"jsonrpc"')) || dataLines[0];
          const jsonStr = jsonRpcLine.replace(/^data:\s*/, '').trim();
          payload = JSON.parse(jsonStr);
        } else {
          payload = this.extractJsonFromText(rawText);
        }
      } else {
        payload = JSON.parse(rawText);
      }
    } catch {
      payload = this.extractJsonFromText(rawText);
    }

    if (payload.error) {
      throw new Error(`MAS-MCP error: ${payload.error.message || JSON.stringify(payload.error)}`);
    }

    const contentItem = payload.result?.content?.[0];
    if (contentItem && contentItem.type === 'text') {
      const extracted = this.extractJsonFromText(contentItem.text);
      if (typeof extracted === 'object' && extracted !== null && !extracted.raw) {
        return {
          ...extracted,
          ...(payload.result.data ? { data: payload.result.data } : {}),
        } as T;
      }
      return {
        content: contentItem.text,
        ...(payload.result.data ? { data: payload.result.data } : {}),
      } as T;
    }

    return payload.result as T;
  }

  // =========================================================================
  // TYPED API WRAPPERS FOR CORE MAS-MCP TOOLS
  // =========================================================================

  /**
   * Lấy lịch sử giá EOD theo ngày bắt đầu và kết thúc (DD/MM/YYYY)
   * Tối đa ~750 phiên / request
   */
  public async getPriceHistory(
    symbol: string,
    startDate: string, // DD/MM/YYYY
    endDate: string    // DD/MM/YYYY
  ): Promise<any> {
    return this.callTool('get_price_history', {
      stock_symbol: [symbol.toUpperCase()],
      start_date: startDate,
      end_date: endDate,
    });
  }

  /**
   * Lấy Báo cáo Kết quả Hoạt động Kinh doanh
   * periods: mảng năm ['2023', '2024'] hoặc quý ['Q1/2024', 'Q2/2024']
   */
  public async getIncomeStatement(symbol: string, periods: string[]): Promise<any> {
    return this.callTool('get_income_statement', {
      symbol: [symbol.toUpperCase()],
      period: periods,
    });
  }

  /**
   * Lấy Bảng Cân đối Kế toán
   */
  public async getBalanceSheet(symbol: string, periods: string[]): Promise<any> {
    return this.callTool('get_balance_sheet', {
      symbol: [symbol.toUpperCase()],
      period: periods,
    });
  }

  /**
   * Lấy Báo cáo Lưu chuyển Tiền tệ
   */
  public async getCashFlow(symbol: string, periods: string[]): Promise<any> {
    return this.callTool('get_cash_flow', {
      symbol: [symbol.toUpperCase()],
      period: periods,
    });
  }

  /**
   * Lấy Chỉ số Tài chính (Financial Indicators)
   */
  public async getFinancialIndicators(symbol: string, periods: string[]): Promise<any> {
    return this.callTool('get_financial_indicators', {
      symbol: [symbol.toUpperCase()],
      period: periods,
    });
  }

  /**
   * Lấy Giá cổ phiếu tức thời snapshot
   */
  public async getStockPrice(symbol: string): Promise<any> {
    return this.callTool('get_stock_price', {
      symbol: [symbol.toUpperCase()],
    });
  }

  /**
   * Lấy Thông tin chung Doanh nghiệp
   */
  public async getCompanyInfo(symbol: string): Promise<any> {
    return this.callTool('get_company_info', {
      symbol: [symbol.toUpperCase()],
    });
  }

  /**
   * Lấy Dữ liệu Dòng tiền Tự doanh
   */
  public async getProprietaryFlow(options: {
    start_date?: string;
    end_date?: string;
    stock_symbols?: string[];
  } = {}): Promise<any> {
    return this.callTool('get_proprietary_flow', options);
  }

  /**
   * Lấy Chỉ số Tài chính chuyên biệt Ngân hàng (CAMEL, NIM, CASA...)
   */
  public async getBankingFinancialIndicator(symbol: string, periods: string[]): Promise<any> {
    return this.callTool('get_banking_financial_indicator', {
      symbol: [symbol.toUpperCase()],
      period: periods,
    });
  }

  /**
   * Lấy Top nợ xấu các ngân hàng
   */
  public async getBankTopBadDebt(): Promise<any> {
    return this.callTool('get_bank_top_bad_debt', {});
  }
}

// Singleton instance
export const masMcpClient = new MasMcpClient();
