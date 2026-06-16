import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { formatNumber, formatPct, getPctColor, getRankLabel, getRankBadgeClass } from '../utils/scoring'

function TrendIcon({ val }) {
  if (!val || Math.abs(val) < 0.05) return <Minus size={14} className="text-gray-400" />
  if (val > 0) return <TrendingDown size={14} className="text-emerald-500" />
  return <TrendingUp size={14} className="text-red-500" />
}

export default function RankingTable({ results, groupName }) {
  if (!results || results.length === 0) {
    return (
      <div className="card text-center py-10 text-gray-400 dark:text-gray-600">
        <p>Chưa có dữ liệu tuần này cho nhóm {groupName}.</p>
      </div>
    )
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Bảng xếp hạng — Nhóm <span className="gradient-text">{groupName}</span>
        </h3>
        <span className="text-xs text-gray-400">{results.length} khu vực</span>
      </div>

      {/* Desktop table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Hạng</th>
              <th className="px-4 py-3 text-left">Khu vực</th>
              <th className="px-4 py-3 text-right">Điện (kWh)</th>
              <th className="px-4 py-3 text-right">% Giảm tuyệt đối</th>
              <th className="px-4 py-3 text-right">% Giảm/đơn vị</th>
              <th className="px-4 py-3 text-right">Điểm tuyệt đối</th>
              <th className="px-4 py-3 text-right">Điểm/đơn vị</th>
              <th className="px-4 py-3 text-right font-bold">Tổng điểm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {results.map((r, i) => {
              const rank = i + 1
              return (
                <tr key={r.block.id}
                  className={`transition-colors ${rank === 1 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankBadgeClass(rank)}`}>
                      {getRankLabel(rank)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {r.block.name}
                    <span className="ml-2 text-xs text-gray-400">({r.block.metric_type})</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {r.hasData ? formatNumber(r.electricity, 0) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium flex items-center justify-end gap-1 ${getPctColor(r.pctAbsolute)}`}>
                    <TrendIcon val={r.pctAbsolute} />
                    {r.hasData ? formatPct(r.pctAbsolute) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${getPctColor(r.pctPerUnit)}`}>
                    {r.hasData ? formatPct(r.pctPerUnit) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-cyan-600 dark:text-cyan-400">
                    {formatNumber(r.ptsAbsolute)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                    {formatNumber(r.ptsPerUnit)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-base ${rank === 1 ? 'gradient-text' : 'text-gray-900 dark:text-gray-100'}`}>
                      {formatNumber(r.ptsTotal)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
        {results.map((r, i) => {
          const rank = i + 1
          return (
            <div key={r.block.id} className={`p-4 ${rank === 1 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankBadgeClass(rank)}`}>
                    {getRankLabel(rank)}
                  </span>
                  <div>
                    <div className="font-medium text-sm">{r.block.name}</div>
                    <div className="text-xs text-gray-400">{r.block.metric_type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${rank === 1 ? 'gradient-text' : ''}`}>
                    {formatNumber(r.ptsTotal)}
                  </div>
                  <div className="text-xs text-gray-400">điểm</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                  <div className="text-gray-400 mb-0.5">Giảm tuyệt đối</div>
                  <div className={`font-semibold ${getPctColor(r.pctAbsolute)}`}>{r.hasData ? formatPct(r.pctAbsolute) : '—'}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                  <div className="text-gray-400 mb-0.5">Giảm/đơn vị</div>
                  <div className={`font-semibold ${getPctColor(r.pctPerUnit)}`}>{r.hasData ? formatPct(r.pctPerUnit) : '—'}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                  <div className="text-gray-400 mb-0.5">Điện (kWh)</div>
                  <div className="font-semibold">{r.hasData ? formatNumber(r.electricity, 0) : '—'}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
