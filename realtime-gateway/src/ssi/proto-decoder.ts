import protobuf from 'protobufjs';

const PROTO_SCHEMA = `
syntax = "proto3";
package ssi;

message StockData {
  string stockType = 1;
  string isin = 2;
  string exchange = 3;
  string tradingStatus = 4;
  int32 ceiling = 5;
  int32 floor = 6;
  int32 refPrice = 7;
  string issuerName = 8;
  int64 listedShares = 9;
  int32 exercisePrice = 10;
  string caStatus = 11;
  string lastTradingDate = 12;
  string maturityDate = 13;
  int32 openInterest = 14;
  string underlyingSymbol = 15;
  string exerciseRatio = 16;
  int32 matchedPrice = 17;
  int32 matchedVolume = 18;
  int64 matchedTime = 19;
  sint32 priceChange = 20;
  sint32 priceChangePercent = 21;
  int32 openPrice = 22;
  int32 highest = 23;
  int32 lowest = 24;
  int32 avgPrice = 25;
  int64 nmTotalTradedQty = 26;
  int64 nmTotalTradedValue = 27;
  int32 best1Bid = 28;
  int32 best1BidVol = 29;
  int32 best1Offer = 30;
  int32 best1OfferVol = 31;
  int32 best2Bid = 32;
  int32 best2BidVol = 33;
  int32 best2Offer = 34;
  int32 best2OfferVol = 35;
  int32 best3Bid = 36;
  int32 best3BidVol = 37;
  int32 best3Offer = 38;
  int32 best3OfferVol = 39;
  int64 totalBidQty = 68;
  int64 totalAskQty = 69;
  int64 buyForeignQtty = 70;
  int64 buyForeignValue = 71;
  int64 sellForeignQtty = 72;
  int64 sellForeignValue = 73;
}

message IndexRealtimeData {
  int64 totalQtty = 1;
  int64 totalValue = 2;
  int32 advances = 3;
  int32 declines = 4;
  int32 nochanges = 5;
  int32 ceiling = 6;
  int32 floor = 7;
  int64 allQty = 8;
  int64 allValue = 9;
  int64 timeTDW = 10;
  int32 indexValue = 11;
  sint32 change = 12;
  sint32 changePercent = 13;
  int64 totalQttyPrevTDW = 14;
  int32 chartOpen = 15;
  int32 chartHigh = 16;
  int32 chartLow = 17;
  int64 time = 18;
  int32 avgValue = 19;
}
`;

const root = protobuf.parse(PROTO_SCHEMA).root;
const StockDataType = root.lookupType('ssi.StockData');
const IndexRealtimeDataType = root.lookupType('ssi.IndexRealtimeData');

export interface DecodedStockData {
  stockType?: string;
  isin?: string;
  exchange?: string;
  tradingStatus?: string;
  ceiling?: number;
  floor?: number;
  refPrice?: number;
  matchedPrice?: number;
  matchedVolume?: number;
  matchedTime?: number;
  priceChange?: number;
  priceChangePercent?: number;
  openPrice?: number;
  highest?: number;
  lowest?: number;
  avgPrice?: number;
  nmTotalTradedQty?: number;
  nmTotalTradedValue?: number;
  best1Bid?: number;
  best1BidVol?: number;
  best1Offer?: number;
  best1OfferVol?: number;
  totalBidQty?: number;
  totalAskQty?: number;
  buyForeignQtty?: number;
  sellForeignQtty?: number;
  [key: string]: any;
}

export interface DecodedIndexData {
  totalQtty?: number;
  totalValue?: number;
  advances?: number;
  declines?: number;
  nochanges?: number;
  ceiling?: number;
  floor?: number;
  indexValue?: number;
  change?: number;
  changePercent?: number;
  chartOpen?: number;
  chartHigh?: number;
  chartLow?: number;
  time?: number;
  [key: string]: any;
}

export function decodeStockData(buffer: Uint8Array): DecodedStockData {
  const msg = StockDataType.decode(buffer);
  return StockDataType.toObject(msg, {
    longs: Number,
    enums: String,
    bytes: String,
    defaults: false,
  }) as DecodedStockData;
}

export function decodeIndexData(buffer: Uint8Array): DecodedIndexData {
  const msg = IndexRealtimeDataType.decode(buffer);
  return IndexRealtimeDataType.toObject(msg, {
    longs: Number,
    enums: String,
    bytes: String,
    defaults: false,
  }) as DecodedIndexData;
}
