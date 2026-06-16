import { differenceInDays } from 'date-fns'

/**
 * Tính % giảm điện tuyệt đối (so sánh điện TB ngày)
 * baseline: avg_electricity / 30 ngày
 * current: electricity / số ngày trong tuần
 */
export function calcPctAbsolute(electricity, weekStart, weekEnd, baselineAvgElec) {
  if (!electricity || !baselineAvgElec || baselineAvgElec === 0) return 0
  const days = differenceInDays(new Date(weekEnd), new Date(weekStart)) + 1
  const currentDailyElec = electricity / days
  const baselineDailyElec = baselineAvgElec / 30
  return ((baselineDailyElec - currentDailyElec) / baselineDailyElec) * 100
}

/**
 * Tính % giảm điện/SAH hoặc điện/Pcs
 * (baseline_elec_per_unit - current_elec_per_unit) / baseline_elec_per_unit * 100
 */
export function calcPctPerUnit(elecPerUnit, baselineAvgElecPerUnit) {
  if (!elecPerUnit || !baselineAvgElecPerUnit || baselineAvgElecPerUnit === 0) return 0
  return ((baselineAvgElecPerUnit - elecPerUnit) / baselineAvgElecPerUnit) * 100
}

/**
 * Tính điểm cho toàn nhóm (Sweater hoặc Lifestyle)
 * Điểm = (% giảm của block / max % giảm trong nhóm) × 50
 * Điểm tối thiểu = 0 (không thưởng khi tăng điện)
 */
export function calculateGroupScores(blockResults) {
  // Lọc các block có dữ liệu
  const valid = blockResults.filter(r => r.hasData)

  // Tìm max % giảm (chỉ tính các block có % > 0)
  const maxAbsolute = Math.max(0, ...valid.map(r => r.pctAbsolute))
  const maxPerUnit = Math.max(0, ...valid.map(r => r.pctPerUnit))

  return blockResults.map(r => {
    if (!r.hasData) {
      return { ...r, ptsAbsolute: 0, ptsPerUnit: 0, ptsTotal: 0, maxAbsolute, maxPerUnit }
    }
    const ptsAbsolute = maxAbsolute > 0
      ? Math.max(0, (r.pctAbsolute / maxAbsolute) * 50)
      : 0
    const ptsPerUnit = maxPerUnit > 0
      ? Math.max(0, (r.pctPerUnit / maxPerUnit) * 50)
      : 0
    return {
      ...r,
      ptsAbsolute,
      ptsPerUnit,
      ptsTotal: ptsAbsolute + ptsPerUnit,
      maxAbsolute,
      maxPerUnit,
    }
  }).sort((a, b) => b.ptsTotal - a.ptsTotal)
}

export function getRankBadgeClass(rank) {
  if (rank === 1) return 'badge-rank-1'
  if (rank === 2) return 'badge-rank-2'
  if (rank === 3) return 'badge-rank-3'
  return 'badge-rank-other'
}

export function getRankLabel(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export function formatNumber(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return val.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return '—'
  const sign = val > 0 ? '+' : ''
  return `${sign}${val.toFixed(1)}%`
}

export function getPctColor(val) {
  if (!val || val === 0) return 'text-gray-500 dark:text-gray-400'
  if (val > 0) return 'text-emerald-600 dark:text-emerald-400'
  return 'text-red-500 dark:text-red-400'
}
