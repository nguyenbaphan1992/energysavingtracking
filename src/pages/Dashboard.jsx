import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { calcPctAbsolute, calcPctPerUnit, calculateGroupScores } from '../utils/scoring'
import RankingTable from '../components/RankingTable'
import TrendChart from '../components/TrendChart'
import FindingSlideshow from '../components/FindingSlideshow'
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Zap, TrendingDown, Award, AlertTriangle } from 'lucide-react'

const GROUPS = ['Sweater', 'Lifestyle']

function StatCard({ icon, label, value, sub, color = 'emerald' }) {
  const colorMap = {
    emerald: 'from-emerald-500 to-teal-600',
    cyan: 'from-cyan-500 to-blue-600',
    amber: 'from-amber-400 to-orange-500',
    rose: 'from-rose-500 to-red-600',
  }
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center flex-shrink-0 shadow-md`}>
        <span className="text-white">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-gray-900 dark:text-white truncate">{value}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        {sub && <div className="text-xs text-gray-400 dark:text-gray-500">{sub}</div>}
      </div>
    </div>
  )
}

// Get available weeks from weekly_data
function getWeekLabel(date) {
  const ws = startOfWeek(date, { weekStartsOn: 1 })
  const we = endOfWeek(date, { weekStartsOn: 1 })
  return `${format(ws, 'dd/MM')} – ${format(we, 'dd/MM/yyyy', { locale: vi })}`
}

export default function Dashboard() {
  const [activeGroup, setActiveGroup] = useState('Sweater')
  const [groups, setGroups] = useState([])
  const [blocks, setBlocks] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [baselines, setBaselines] = useState([])
  const [availableWeeks, setAvailableWeeks] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [loading, setLoading] = useState(true)
  const [violationCount, setViolationCount] = useState(0)

  useEffect(() => {
    Promise.all([
      supabase.from('groups').select('*').order('name'),
      supabase.from('blocks').select('*').order('sort_order'),
      supabase.from('weekly_data').select('*').order('week_start', { ascending: false }),
      supabase.from('baselines').select('*').order('valid_from', { ascending: false }),
      supabase.from('violations').select('id', { count: 'exact' }).eq('status', 'open'),
    ]).then(([g, b, wd, bl, v]) => {
      setGroups(g.data || [])
      setBlocks(b.data || [])
      setWeeklyData(wd.data || [])
      setBaselines(bl.data || [])
      setViolationCount(v.count || 0)

      // Build available weeks
      const weekSet = new Set((wd.data || []).map(d => d.week_start))
      const weeks = [...weekSet].sort((a, b) => b.localeCompare(a))
      setAvailableWeeks(weeks)
      if (weeks.length > 0) setSelectedWeek(weeks[0])
      setLoading(false)
    })
  }, [])

  const currentGroup = useMemo(() => groups.find(g => g.name === activeGroup), [groups, activeGroup])
  const currentBlocks = useMemo(() =>
    blocks.filter(b => b.group_id === currentGroup?.id),
    [blocks, currentGroup]
  )

  // Get active baseline for a block at a given week
  const getBaseline = (blockId, weekStart) => {
    return baselines
      .filter(bl => bl.block_id === blockId && bl.valid_from <= weekStart)
      .sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0]
  }

  // Compute results for selected week
  const weekResults = useMemo(() => {
    if (!selectedWeek || !currentBlocks.length) return []
    return currentBlocks.map(block => {
      const wd = weeklyData.find(d => d.block_id === block.id && d.week_start === selectedWeek)
      const bl = getBaseline(block.id, selectedWeek)
      if (!wd || !bl) return { block, hasData: false, pctAbsolute: 0, pctPerUnit: 0, electricity: 0, elec_per_unit: 0 }
      const pctAbsolute = calcPctAbsolute(wd.electricity, wd.week_start, wd.week_end, bl.avg_electricity)
      const pctPerUnit = calcPctPerUnit(wd.elec_per_unit, bl.avg_elec_per_unit)
      return { block, hasData: true, electricity: wd.electricity, elec_per_unit: wd.elec_per_unit, pctAbsolute, pctPerUnit }
    })
  }, [selectedWeek, currentBlocks, weeklyData, baselines])

  const scoredResults = useMemo(() => calculateGroupScores(weekResults), [weekResults])

  // Trend data: last 8 weeks
  const trendData = useMemo(() => {
    const weeks = availableWeeks.slice(0, 8).reverse()
    return weeks.map(ws => {
      const blockData = {}
      currentBlocks.forEach(block => {
        const wd = weeklyData.find(d => d.block_id === block.id && d.week_start === ws)
        const bl = getBaseline(block.id, ws)
        if (!wd || !bl) { blockData[block.id] = null; return }
        const pctAbsolute = calcPctAbsolute(wd.electricity, wd.week_start, wd.week_end, bl.avg_electricity)
        const pctPerUnit = calcPctPerUnit(wd.elec_per_unit, bl.avg_elec_per_unit)
        const results = calculateGroupScores(currentBlocks.map(b => {
          const bwd = weeklyData.find(d => d.block_id === b.id && d.week_start === ws)
          const bbl = getBaseline(b.id, ws)
          if (!bwd || !bbl) return { block: b, hasData: false, pctAbsolute: 0, pctPerUnit: 0 }
          return {
            block: b, hasData: true,
            pctAbsolute: calcPctAbsolute(bwd.electricity, bwd.week_start, bwd.week_end, bbl.avg_electricity),
            pctPerUnit: calcPctPerUnit(bwd.elec_per_unit, bbl.avg_elec_per_unit),
          }
        }))
        const r = results.find(r => r.block.id === block.id)
        blockData[block.id] = { ptsTotal: r?.ptsTotal ?? 0 }
      })
      return { week_start: ws, blockData }
    })
  }, [availableWeeks, currentBlocks, weeklyData, baselines])

  // Summary stats
  const totalElec = scoredResults.filter(r => r.hasData).reduce((s, r) => s + r.electricity, 0)
  const avgPctPerUnit = scoredResults.filter(r => r.hasData && r.pctPerUnit > 0).reduce((s, r, _, a) => s + r.pctPerUnit / a.length, 0)
  const leader = scoredResults[0]
  const weekIdx = availableWeeks.indexOf(selectedWeek)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 gradient-bg rounded-full animate-spin mx-auto mb-3" style={{ animationDuration: '1s', borderTopColor: 'transparent' }} />
        <p className="text-gray-400">Đang tải dữ liệu...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard <span className="gradient-text">Tiết Kiệm Năng Lượng</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Chương trình thi đua tiết kiệm điện 2026 — Nhà máy Tinh Lợi
          </p>
        </div>

        {/* Group Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 self-start">
          {GROUPS.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`px-5 py-2 text-sm font-semibold transition-all
                ${activeGroup === g
                  ? 'gradient-bg text-white shadow-inner'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Week selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setSelectedWeek(availableWeeks[weekIdx + 1])}
          disabled={weekIdx >= availableWeeks.length - 1}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex gap-2 flex-wrap">
          {availableWeeks.slice(0, 8).map(w => (
            <button key={w} onClick={() => setSelectedWeek(w)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                ${selectedWeek === w
                  ? 'gradient-bg text-white border-transparent shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
              {format(new Date(w), 'dd/MM', { locale: vi })}
            </button>
          ))}
        </div>
        <button onClick={() => setSelectedWeek(availableWeeks[weekIdx - 1])}
          disabled={weekIdx <= 0}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors">
          <ChevronRight size={16} />
        </button>
        {selectedWeek && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
            Tuần: {getWeekLabel(new Date(selectedWeek))}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Zap size={20} />} label="Tổng điện tiêu thụ" value={`${(totalElec/1000).toFixed(0)}K kWh`} sub="tuần này" color="cyan" />
        <StatCard icon={<TrendingDown size={20} />} label="TB giảm/đơn vị" value={`${avgPctPerUnit.toFixed(1)}%`} sub="so với baseline" color="emerald" />
        <StatCard icon={<Award size={20} />} label="Dẫn đầu nhóm" value={leader?.hasData ? leader.block.name : '—'} sub={leader?.hasData ? `${leader.ptsTotal.toFixed(1)} điểm` : 'Chưa có dữ liệu'} color="amber" />
        <StatCard icon={<AlertTriangle size={20} />} label="Vi phạm chưa xử lý" value={violationCount} sub="hiện trường" color="rose" />
      </div>

      {/* Slideshow */}
      <FindingSlideshow />

      {/* Ranking Table */}
      <RankingTable results={scoredResults} groupName={activeGroup} />

      {/* Trend chart */}
      {trendData.length > 0 && (
        <TrendChart data={trendData} blocks={currentBlocks} />
      )}
    </div>
  )
}
