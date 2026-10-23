import fs from 'fs';
import path from 'path';
import { updateUserRole } from './users-store';

export interface VipRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  phoneContact: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'vip-requests.json');

const INITIAL_VIP_REQUESTS: VipRequest[] = [
  {
    id: 'req-sample-1',
    userId: 'usr_free_001',
    userEmail: 'demo@valuex.vn',
    userName: 'Thành Viên Trải Nghiệm',
    phoneContact: '0908889999',
    note: 'Đã mở tài khoản VPS với ID người giới thiệu.',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

declare global {
  // eslint-disable-next-line no-var
  var __VIP_REQUESTS_STORE__: VipRequest[] | undefined;
}

function ensureStoreExists(): VipRequest[] {
  if (globalThis.__VIP_REQUESTS_STORE__ && Array.isArray(globalThis.__VIP_REQUESTS_STORE__)) {
    return globalThis.__VIP_REQUESTS_STORE__;
  }

  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        globalThis.__VIP_REQUESTS_STORE__ = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[vip-requests-store] Cannot read from file:', err);
  }

  // Fallback to initial sample
  globalThis.__VIP_REQUESTS_STORE__ = [...INITIAL_VIP_REQUESTS];

  // Attempt to write to disk if environment allows
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(INITIAL_VIP_REQUESTS, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem on Vercel/serverless — safe to ignore
  }

  return globalThis.__VIP_REQUESTS_STORE__;
}

function saveRequests(list: VipRequest[]) {
  globalThis.__VIP_REQUESTS_STORE__ = list;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempPath = path.join(DATA_DIR, `vip-requests.json.tmp.${Date.now()}`);
    fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
    fs.renameSync(tempPath, FILE_PATH);
  } catch {
    console.warn('[vip-requests-store] File save skipped (read-only filesystem or IO error)');
  }
}

export async function createVipRequest(
  userId: string,
  userEmail: string,
  phoneContact: string,
  note: string = '',
  userName: string = ''
): Promise<VipRequest> {
  const list = ensureStoreExists();

  const existingIndex = list.findIndex((r) => r.userId === userId && r.status === 'pending');
  const newReq: VipRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userEmail,
    userName,
    phoneContact,
    note,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    list[existingIndex] = newReq;
  } else {
    list.unshift(newReq);
  }

  saveRequests(list);
  return newReq;
}

export function getUserVipRequest(userId: string): VipRequest | null {
  const list = ensureStoreExists();
  return list.find((r) => r.userId === userId) || null;
}

export function getAllVipRequests(): VipRequest[] {
  return ensureStoreExists();
}

export async function approveVipRequest(requestId: string): Promise<boolean> {
  const list = ensureStoreExists();
  const req = list.find((r) => r.id === requestId);
  if (!req) return false;

  req.status = 'approved';
  saveRequests(list);

  // Upgrade user role in users-store to member_vip
  updateUserRole(req.userId, 'member_vip');
  return true;
}

export async function rejectVipRequest(requestId: string): Promise<boolean> {
  const list = ensureStoreExists();
  const req = list.find((r) => r.id === requestId);
  if (!req) return false;

  req.status = 'rejected';
  saveRequests(list);
  return true;
}
