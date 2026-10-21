import fs from 'fs';
import path from 'path';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

/**
 * Lấy cấu hình OpenAI / CLIProxyAPI từ biến môi trường
 */
export function getOpenAIProxyConfig(): {
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
} {
  const isServer = typeof window === 'undefined';
  let baseUrl = process.env.OPENAI_BASE_URL || '';
  let apiKey = process.env.OPENAI_API_KEY || '';
  let model = process.env.OPENAI_MODEL || 'gemini-3.8-flash-high';
  let enabled = process.env.USE_OPENAI_PROXY === 'true' || Boolean(baseUrl);

  // Fallback đọc từ .env.local nếu chưa load vào process.env
  if (isServer && (!baseUrl || !apiKey)) {
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const matchBase = content.match(/OPENAI_BASE_URL=["']?([^"'\r\n]+)["']?/);
        const matchKey = content.match(/OPENAI_API_KEY=["']?([^"'\r\n]+)["']?/);
        const matchModel = content.match(/OPENAI_MODEL=["']?([^"'\r\n]+)["']?/);
        const matchEnabled = content.match(/USE_OPENAI_PROXY=["']?([^"'\r\n]+)["']?/);

        if (matchBase && !baseUrl) baseUrl = matchBase[1];
        if (matchKey && !apiKey) apiKey = matchKey[1];
        if (matchModel && !process.env.OPENAI_MODEL) model = matchModel[1];
        if (matchEnabled) enabled = matchEnabled[1] === 'true';
      }
    } catch {
      // Ignore reading error
    }
  }

  // Mặc định fallback nếu rỗng nhưng USE_OPENAI_PROXY bật
  if (!baseUrl && enabled) {
    // Nếu chạy trên VPS Ubuntu thì dùng localhost 8317, nếu máy khác thì dùng domain valuex.duckdns.org
    const isVpsLocal = process.platform === 'linux' && fs.existsSync('/home/ubuntu/cliproxyapi');
    baseUrl = isVpsLocal ? 'http://127.0.0.1:8317/v1' : 'https://valuex.duckdns.org/v1';
  }

  if (!apiKey && enabled) {
    apiKey = 'sk-X2nXJQ3MXXRXxLjsrUnCHdpBH9gQrq5xukkpHk6mwD3XYrjs';
  }

  return {
    baseUrl: baseUrl.trim().replace(/\/+$/, ''),
    apiKey: apiKey.trim(),
    model: model.trim(),
    enabled,
  };
}

export function isUsingOpenAIProxy(): boolean {
  const config = getOpenAIProxyConfig();
  return config.enabled && Boolean(config.baseUrl);
}

/**
 * Xử lý chuỗi JSON từ LLM loại bỏ markdown wrapper
 */
export function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Gọi OpenAI Chat Completion (tương thích CLIProxyAPI trên Oracle VPS)
 */
export async function callOpenAIChatCompletion(options: ChatCompletionOptions): Promise<string> {
  const config = getOpenAIProxyConfig();
  if (!config.baseUrl) {
    throw new Error('OPENAI_BASE_URL is not configured for CLIProxyAPI');
  }

  const endpoint = `${config.baseUrl}/chat/completions`;
  const modelToUse = options.model || config.model || 'gemini-3.8-flash-high';
  const timeoutMs = options.timeoutMs || 60000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const payload: any = {
    model: modelToUse,
    messages: options.messages,
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.2,
  };

  if (options.maxTokens) {
    payload.max_tokens = options.maxTokens;
  }

  if (options.jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  try {
    console.log(`[LLM Provider] Calling CLIProxyAPI (${modelToUse}) at ${endpoint}...`);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`CLIProxyAPI error HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('CLIProxyAPI returned empty or invalid response format');
    }

    return content;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`CLIProxyAPI request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
