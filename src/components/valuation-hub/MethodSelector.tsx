import React from 'react';
import {
  ValuationMethodConfig,
  ValuationRole,
  PeerData,
} from '@/types/analysis';
import {
  ValueXSector,
  SECTOR_PRESETS,
} from '@/lib/valuation-engine';
import { Sliders, RefreshCw, AlertTriangle, Users } from 'lucide-react';

interface MethodSelectorProps {
  sectorType: ValueXSector;
  onSectorChange: (newSector: ValueXSector) => void;
  methods: ValuationMethodConfig[];
  onUpdateMethods: (updated: ValuationMethodConfig[]) => void;
  historicalStats: {
    peMean?: number;
    peMedian?: number;
    peStd?: number;
    peMinus1Sigma?: number;
    pePlus1Sigma?: number;
    pbMean?: number;
    pbMedian?: number;
    pbStd?: number;
    pbMinus1Sigma?: number;
    pbPlus1Sigma?: number;
    validQuarters: number;
  };
  peerStats: PeerData[];
  peerMedians?: {
    pe?: number;
    pb?: number;
    evEbitda?: number;
    maxPe?: number;
  };
  isLoadingStats?: boolean;
}

export const MethodSelector: React.FC<MethodSelectorProps> = ({
  sectorType,
  onSectorChange,
  methods,
  onUpdateMethods,
  historicalStats,
  peerStats,
  peerMedians,
  isLoadingStats = false,
}) => {
  const currentPreset = SECTOR_PRESETS[sectorType] || SECTOR_PRESETS['CÔNG NGHIỆP_SẢN XUẤT'];

  // Tính tổng trọng số hiện tại của các phương pháp đang bật
  const activeMethods = methods.filter((m) => m.role !== 'DISABLED');
  const totalWeight = activeMethods.reduce((sum, m) => sum + (Number(m.weight) || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.5;

  // Toggle bật/tắt 1 phương pháp
  const handleToggleMethod = (methodKey: string) => {
    const updated = methods.map((m) => {
      if (m.method === methodKey) {
        if (m.role === 'DISABLED') {
          // Bật lên với vai trò mặc định
          const activeCount = methods.filter((item) => item.role !== 'DISABLED').length;
          const newRole: ValuationRole = activeCount === 0 ? 'MAIN_1' : activeCount === 1 ? 'MAIN_2' : 'CROSS_CHECK';
          return { ...m, role: newRole, weight: 20 };
        } else {
          // Tắt đi
          return { ...m, role: 'DISABLED' as ValuationRole, weight: 0 };
        }
      }
      return m;
    });
    onUpdateMethods(updated);
  };

  // Thay đổi trọng số
  const handleWeightChange = (methodKey: string, newWeight: number) => {
    const val = Math.max(0, Math.min(100, newWeight));
    const updated = methods.map((m) => (m.method === methodKey ? { ...m, weight: val } : m));
    onUpdateMethods(updated);
  };

  // Thay đổi vai trò (Chính 1, Chính 2, Kiểm tra chéo)
  const handleRoleChange = (methodKey: string, newRole: ValuationRole) => {
    const updated = methods.map((m) => (m.method === methodKey ? { ...m, role: newRole } : m));
    onUpdateMethods(updated);
  };

  // Chuẩn hóa trọng số về tròn 100%
  const handleNormalizeWeights = () => {
    if (activeMethods.length === 0) return;
    const currentSum = activeMethods.reduce((sum, m) => sum + m.weight, 0);
    if (currentSum === 0) {
      const equalShare = Math.round(100 / activeMethods.length);
      const updated = methods.map((m) =>
        m.role !== 'DISABLED' ? { ...m, weight: equalShare } : m
      );
      onUpdateMethods(updated);
      return;
    }

    let remainder = 100;
    const updated = methods.map((m, index) => {
      if (m.role === 'DISABLED') return m;
      const isLast = index === methods.length - 1;
      const proportional = Math.round((m.weight / currentSum) * 100);
      const assigned = isLast ? remainder : proportional;
      remainder -= assigned;
      return { ...m, weight: assigned };
    });
    onUpdateMethods(updated);
  };

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-xs dark:shadow-none transition-colors">
      {/* 1. Header & Sector Selector */}
      <div className="space-y-1.5 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-heading">
              Phương Pháp &amp; Nhóm Ngành
            </span>
          </div>
        </div>

        <div className="mt-2">
          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
            Nhóm ngành phân loại (ValueX):
          </label>
          <select
            value={sectorType}
            onChange={(e) => onSectorChange(e.target.value as ValueXSector)}
            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-medium"
          >
            {Object.entries(SECTOR_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            {currentPreset.description}
          </div>
        </div>
      </div>

      {/* 2. Methods Toggle & Weight List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600 dark:text-slate-400">Danh sách phương pháp</span>
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-semibold ${
                isWeightValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              Tổng: {totalWeight}%
            </span>
            {!isWeightValid && (
              <button
                type="button"
                onClick={handleNormalizeWeights}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium border border-slate-200 dark:border-slate-700"
                title="Tự động chia tỉ lệ để tổng bằng 100%"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Chuẩn hóa 100%
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          {methods.map((m) => {
            const isEnabled = m.role !== 'DISABLED';
            return (
              <div
                key={m.method}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                  isEnabled
                    ? 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-700/60'
                    : 'bg-slate-100/40 dark:bg-slate-950/30 border-slate-200/50 dark:border-slate-800/40 opacity-60'
                }`}
              >
                {/* Method Toggle & Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggleMethod(m.method)}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className={`font-medium ${isEnabled ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                    {m.name}
                  </span>
                </div>

                {/* Role selector & Weight input */}
                {isEnabled ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.method, e.target.value as ValuationRole)}
                      className="bg-white dark:bg-slate-900 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/60 rounded px-1.5 py-0.5 focus:outline-none"
                    >
                      <option value="MAIN_1">Chính 1</option>
                      <option value="MAIN_2">Chính 2</option>
                      <option value="CROSS_CHECK">Kiểm tra chéo</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        value={m.weight}
                        onChange={(e) => handleWeightChange(m.method, Number(e.target.value) || 0)}
                        className="w-12 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-right font-mono font-medium border border-slate-300 dark:border-slate-700/60 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">%</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">Đã tắt</span>
                )}
              </div>
            );
          })}
        </div>

        {!isWeightValid && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400/90 flex items-center gap-1.5 pt-1">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>Tổng trọng số chưa bằng 100% — kết quả tổng hợp sẽ tự động chuẩn hóa.</span>
          </div>
        )}
      </div>

      {/* 3. Statistical Reference Table */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-800 dark:text-slate-200 font-bold">
          <span>Tham Chiếu Lịch Sử &amp; Ngành</span>
          {isLoadingStats && <span className="text-[11px] text-slate-400 font-normal">Đang tải...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/60 text-[11px]">
                <th className="pb-1.5 font-medium">Chỉ số</th>
                <th className="pb-1.5 font-medium text-right">Trung vị (μ)</th>
                <th className="pb-1.5 font-medium text-right">Vùng ±1σ</th>
                <th className="pb-1.5 font-medium text-right">Top 3 Peers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300 font-mono">
              {/* P/E Row */}
              <tr>
                <td className="py-1.5 text-slate-800 dark:text-slate-300 font-sans font-medium">P/E</td>
                <td className="py-1.5 text-right font-semibold">
                  {historicalStats.peMedian ? `${historicalStats.peMedian}x` : '—'}
                </td>
                <td className="py-1.5 text-right text-slate-500 dark:text-slate-400 text-[11px]">
                  {historicalStats.peMinus1Sigma && historicalStats.pePlus1Sigma
                    ? `${historicalStats.peMinus1Sigma}x – ${historicalStats.pePlus1Sigma}x`
                    : '—'}
                </td>
                <td className="py-1.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                  {peerMedians?.pe ? `${peerMedians.pe}x` : '—'}
                </td>
              </tr>

              {/* P/B Row */}
              <tr>
                <td className="py-1.5 text-slate-800 dark:text-slate-300 font-sans font-medium">P/B</td>
                <td className="py-1.5 text-right font-semibold">
                  {historicalStats.pbMedian ? `${historicalStats.pbMedian}x` : '—'}
                </td>
                <td className="py-1.5 text-right text-slate-500 dark:text-slate-400 text-[11px]">
                  {historicalStats.pbMinus1Sigma && historicalStats.pbPlus1Sigma
                    ? `${historicalStats.pbMinus1Sigma}x – ${historicalStats.pbPlus1Sigma}x`
                    : '—'}
                </td>
                <td className="py-1.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                  {peerMedians?.pb ? `${peerMedians.pb}x` : '—'}
                </td>
              </tr>

              {/* EV/EBITDA Row */}
              <tr>
                <td className="py-1.5 text-slate-800 dark:text-slate-300 font-sans font-medium">EV/EBITDA</td>
                <td className="py-1.5 text-right font-semibold">
                  {peerMedians?.evEbitda ? `${peerMedians.evEbitda}x` : '8.5x'}
                </td>
                <td className="py-1.5 text-right text-slate-500 dark:text-slate-400 text-[11px]">
                  6.5x – 10.5x
                </td>
                <td className="py-1.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                  {peerMedians?.evEbitda ? `${peerMedians.evEbitda}x` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Source info and quality check */}
        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between pt-1">
          <span>Nguồn: Vietcap IQ ({historicalStats.validQuarters || 0} quý lịch sử)</span>
          {historicalStats.validQuarters < 8 && historicalStats.validQuarters > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Ít hơn 8 quý — độ lệch chuẩn kém tin cậy
            </span>
          )}
        </div>
      </div>

      {/* 4. Top 3 Peers List */}
      {peerStats.length > 0 && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold">
            <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Top 3 Đối Thủ Cùng Ngành (Theo Vốn Hóa)</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {peerStats.map((p) => (
              <div
                key={p.ticker}
                className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-2 text-center"
              >
                <div className="font-bold text-slate-900 dark:text-slate-200 text-xs">{p.ticker}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  P/E: <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{p.pe ? `${p.pe}x` : '—'}</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  P/B: <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{p.pb ? `${p.pb}x` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
