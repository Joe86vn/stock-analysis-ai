/**
 * Module chuyển tiếp & tương thích ngược (Backward Compatibility Layer):
 * Dữ liệu số hóa tài chính đã được nâng cấp chính thức chuyển sang Vietcap IQ API (vietcap-field-mapping.ts).
 */

export * from './vietcap-field-mapping';

import {
  fetchFullVietcapData,
  ParsedVietcapQuarter,
  getVietcapFieldLabel,
  ALL_VIETCAP_FIELDS_MAP,
  VIETCAP_INCOME_STATEMENT_MAP,
  VIETCAP_BALANCE_SHEET_MAP,
  VIETCAP_CASH_FLOW_MAP,
  VIETCAP_STATISTIC_MAP,
} from './vietcap-field-mapping';

// Tương thích ngược kiểu dữ liệu
export type ParsedSimplizeQuarter = ParsedVietcapQuarter;
export type SimplizeFieldMeta = import('./vietcap-field-mapping').VietcapFieldMeta;

// Tương thích ngược hàm gọi dữ liệu
export const fetchFullSimplizeData = fetchFullVietcapData;
export const getSimplizeFieldLabel = getVietcapFieldLabel;
export const ALL_SIMPLIZE_FIELDS_MAP = ALL_VIETCAP_FIELDS_MAP;
export const SIMPLIZE_INCOME_STATEMENT_MAP = VIETCAP_INCOME_STATEMENT_MAP;
export const SIMPLIZE_BALANCE_SHEET_MAP = VIETCAP_BALANCE_SHEET_MAP;
export const SIMPLIZE_CASH_FLOW_MAP = VIETCAP_CASH_FLOW_MAP;
export const SIMPLIZE_RATIO_MAP = VIETCAP_STATISTIC_MAP;
