import fs from 'fs';
import path from 'path';
import { createClient } from './supabase/server';
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

function ensureStoreExists(): VipRequest[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILE_PATH)) {
    const sample: VipRequest[] = [
      {
        id: 'req-sample-1',
        userId: '3',
        userEmail: 'free@valuex.vn',
        userName: 'Free Member',
        phoneContact: '0908889999',
        note: 'Đã mở tài khoản VPS với ID người giới thiệu.',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(FILE_PATH, JSON.stringify(sample, null, 2), 'utf-8');
    return sample;
  }
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRequests(list: VipRequest[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempPath = path.join(DATA_DIR, `vip-requests.json.tmp.${Date.now()}`);
  fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
  fs.renameSync(tempPath, FILE_PATH);
}

export async function createVipRequest(
  userId: string,
  userEmail: string,
  phoneContact: string,
  note: string = '',
  userName: string = ''
): Promise<VipRequest> {
  const list = ensureStoreExists();

  // If user already has pending request, update it
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

  // Try saving to Supabase if configured
  try {
    const supabase = await createClient();
    await supabase.from('vip_requests').insert({
      user_id: userId,
      phone_contact: phoneContact,
      note,
      status: 'pending',
    });
  } catch (err) {
    // Ignore error if Supabase is offline
  }

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

  // Sync to Supabase if available
  try {
    const supabase = await createClient();
    await supabase
      .from('vip_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);
    await supabase
      .from('profiles')
      .update({ role: 'vip' })
      .eq('id', req.userId);
  } catch (err) {
    // Ignore Supabase error
  }

  return true;
}

export async function rejectVipRequest(requestId: string): Promise<boolean> {
  const list = ensureStoreExists();
  const req = list.find((r) => r.id === requestId);
  if (!req) return false;

  req.status = 'rejected';
  saveRequests(list);

  try {
    const supabase = await createClient();
    await supabase
      .from('vip_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);
  } catch (err) {
    // Ignore Supabase error
  }

  return true;
}
