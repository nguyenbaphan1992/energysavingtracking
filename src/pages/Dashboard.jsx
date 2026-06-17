import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  calcPctAbsolute, calcPctPerUnit, calculateGroupScores,
  formatNumber, formatPct, getPctColor, getRankBadgeClass, getRankLabel,
} from '../utils/scoring'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import {
  Zap, TrendingDown, Award, AlertTriangle, ChevronLeft, ChevronRight,
  Sun, Moon, LogOut, LogIn, Settings, LayoutDashboard,
  ClipboardList, ImageOff, PanelLeftClose, PanelLeftOpen,
  PlusCircle, Database, Monitor, TrendingUp,
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const GROUPS = ['Sweater', 'Lifestyle']

function getWeekLabel(date) {
  const ws = startOfWeek(date, { weekStartsOn: 1 })
  const we = endOfWeek(date, { weekStartsOn: 1 })
  return `${format(ws, 'dd/MM')} – ${format(we, 'dd/MM', { locale: vi })}`
}

// ─────────────────────────────────────────────────────────
// VIOLATION SLIDESHOW (ô 7)
// ─────────────────────────────────────────────────────────
function ViolationSlideshow({ slides }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (slides.length <= 1 || paused) return
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), 3000)
    return () => clearInterval(t)
  }, [slides.length, paused])

  useEffect(() => { setIdx(0) }, [slides.length])

  const slide = slides[idx]

  return (
    <div className="card p-0 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-primary-500" />
          Hình ảnh vi phạm
        </h3>
        {slides.length > 0 && (
          <span className="text-xs text-gray-400">{idx + 1}/{slides.length}</span>
        )}
      </div>

      {/* Fixed 4:3 image container */}
      <div
        className="relative bg-gray-100 dark:bg-gray-800 flex-shrink-0"
        style={{ paddingTop: '75%' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
            <ImageOff size={32} className="mb-2" />
            <p className="text-xs">Chưa có hình ảnh vi phạm</p>
          </div>
        ) : (
          <>
            <img
              key={slide.imageUrl}
              src={slide.imageUrl}
              alt={slide.description || 'Vi phạm'}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              onError={e => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23374151" width="400" height="300"/><text x="50%" y="50%" fill="%236b7280" text-anchor="middle" dy=".3em" font-size="14">Không tải được ảnh</text></svg>' }}
            />
            {/* Dark overlay + info at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pt-8 pb-3">
              {slide.blockName && (
                <div className="text-white text-xs font-semibold mb-0.5">📍 {slide.blockName}</div>
              )}
              {slide.description && (
                <div className="text-white/90 text-xs line-clamp-2 mb-0.5">{slide.description}</div>
              )}
              {slide.reportedAt && (
                <div className="text-white/60 text-xs">
                  🕐 {format(new Date(slide.reportedAt), 'HH:mm — dd/MM/yyyy', { locale: vi })}
                </div>
              )}
            </div>
            {/* Prev / Next buttons */}
            {slides.length > 1 && (
              <>
                <button
                  onClick={() => setIdx(i => (i - 1 + slides.length) % slides.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setIdx(i => (i + 1) % slides.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && slides.length <= 15 && (
        <div className="flex justify-center gap-1.5 py-2.5 flex-shrink-0">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? 'w-5 bg-primary-500' : 'w-1.5 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ELECTRICITY BAR CHART (ô 6)
// ─────────────────────────────────────────────────────────
function ElecBarChart({ results }) {
  const [mode, setMode] = useState('absolute')

  const data = results
    .filter(r => r.hasData)
    .map(r => {
      const val = mode === 'absolute' ? r.pctAbsolute : r.pctPerUnit
      return {
        name: r.block.name.length > 12 ? r.block.name.slice(0, 11) + '…' : r.block.name,
        fullName: r.block.name,
        value: parseFloat(val.toFixed(1)),
      }
    })

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-xs">
        <div className="font-semibold text-gray-900 dark:text-white mb-0.5">{d.fullName}</div>
        <div className={d.value >= 0 ? 'text-emerald-600' : 'text-red-500 font-medium'}>
          {d.value >= 0 ? '↓ Giảm ' : '↑ Tăng '}{Math.abs(d.value).toFixed(1)}%
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          Mức giảm theo khu vực
        </h3>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
          <button
            onClick={() => setMode('absolute')}
            className={`px-2.5 py-1 font-medium transition-all ${
              mode === 'absolute'
                ? 'gradient-bg text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
            Điện/ngày
          </button>
          <button
            onClick={() => setMode('perUnit')}
            className={`px-2.5 py-1 font-medium transition-all ${
              mode === 'perUnit'
                ? 'gradient-bg text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
            /SAH · /Pcs
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-gray-400">
          Chưa có dữ liệu tuần này
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -18, bottom: 35 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.2)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: '#6b7280' }}
              angle={-40}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1.5} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={32}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.value >= 0 ? '#16a34a' : '#ef4444'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <p className="text-xs text-gray-400 text-center -mt-1">
        {mode === 'absolute' ? '% giảm điện/ngày so baseline (↑ = tốt)' : '% giảm điện/SAH hoặc /Pcs (↑ = tốt)'}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, highlight = false, badgeText, badgeColor = 'green' }) {
  if (highlight) {
    return (
      <div className="rounded-2xl gradient-bg p-5 shadow-lg text-white relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -right-1 -bottom-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              {icon}
            </div>
            {badgeText && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                {badgeText}
              </span>
            )}
          </div>
          <div className="text-xs text-white/70 font-medium uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-bold mt-1 truncate">{value}</div>
          {sub && <div className="text-xs text-white/60 mt-0.5">{sub}</div>}
        </div>
      </div>
    )
  }
  return (
    <div className="card flex items-start gap-3 relative overflow-hidden">
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-tight">{label}</div>
          {badgeText && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
              badgeColor === 'green'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            }`}>
              {badgeText}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// COMPACT RANKING TABLE (ô 5)
// ─────────────────────────────────────────────────────────
function CompactRankingTable({ results, groupName, showScore = true }) {
  if (!results || results.length === 0) {
    return (
      <div className="card text-center py-6 text-gray-400 text-sm">
        Chưa có dữ liệu cho nhóm {groupName}
      </div>
    )
  }

  return (
    <div className="card p-0 overflow-hidden flex-1">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          Bảng xếp hạng —{' '}
          <span className="gradient-text">{groupName}</span>
        </h3>
        <span className="text-xs text-gray-400">{results.length} khu vực</span>
      </div>

      {/* Desktop */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <th className="px-3 py-2.5 text-left w-10">Hạng</th>
              <th className="px-3 py-2.5 text-left">Khu vực</th>
              <th className="px-3 py-2.5 text-right">Điện/SAH·Pcs (kWh)</th>
              <th className="px-3 py-2.5 text-right">TB ngày (kWh)</th>
              <th className="px-3 py-2.5 text-right">% Tuyệt đối</th>
              <th className="px-3 py-2.5 text-right">% /Đơn vị</th>
              {showScore && <th className="px-3 py-2.5 text-right font-bold">Tổng điểm</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {results.map((r, i) => {
              const rank = i + 1
              const tbNgay = r.hasData && r.tbNgay ? r.tbNgay : null
              return (
                <tr
                  key={r.block.id}
                  className={`transition-colors ${
                    rank === 1
                      ? 'bg-yellow-50/60 dark:bg-yellow-900/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                  }`}>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${getRankBadgeClass(rank)}`}>
                      {getRankLabel(rank)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100 text-xs">
                    {r.block.name}
                    <span className="ml-1 text-gray-400 font-normal">({r.block.metric_type})</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700 dark:text-gray-300 text-xs font-mono">
                    {r.hasData && r.elec_per_unit ? formatNumber(r.elec_per_unit, 3) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700 dark:text-gray-300 text-xs font-mono">
                    {tbNgay ? formatNumber(tbNgay, 1) : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium text-xs ${getPctColor(r.pctAbsolute)}`}>
                    {r.hasData ? formatPct(r.pctAbsolute) : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium text-xs ${getPctColor(r.pctPerUnit)}`}>
                    {r.hasData ? formatPct(r.pctPerUnit) : '—'}
                  </td>
                  {showScore && (
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-bold text-sm ${rank === 1 ? 'gradient-text' : 'text-gray-900 dark:text-gray-100'}`}>
                        {formatNumber(r.ptsTotal)}
                      </span>
                    </td>
                  )}
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
          const tbNgay = r.hasData && r.tbNgay ? r.tbNgay : null
          return (
            <div key={r.block.id} className={`p-3 ${rank === 1 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${getRankBadgeClass(rank)}`}>
                    {getRankLabel(rank)}
                  </span>
                  <div>
                    <div className="font-medium text-sm">{r.block.name}</div>
                    <div className="text-xs text-gray-400">{r.block.metric_type}</div>
                  </div>
                </div>
                {showScore && (
                  <div className="text-right">
                    <div className={`text-xl font-bold ${rank === 1 ? 'gradient-text' : ''}`}>
                      {formatNumber(r.ptsTotal)}
                    </div>
                    <div className="text-xs text-gray-400">điểm</div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5 text-center">
                  <div className="text-gray-400 mb-0.5">Tuyệt đối</div>
                  <div className={`font-semibold ${getPctColor(r.pctAbsolute)}`}>{r.hasData ? formatPct(r.pctAbsolute) : '—'}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5 text-center">
                  <div className="text-gray-400 mb-0.5">/Đơn vị</div>
                  <div className={`font-semibold ${getPctColor(r.pctPerUnit)}`}>{r.hasData ? formatPct(r.pctPerUnit) : '—'}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5 text-center">
                  <div className="text-gray-400 mb-0.5">TB ngày</div>
                  <div className="font-semibold">{tbNgay ? formatNumber(tbNgay, 0) : '—'}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SIDEBAR (ô 8)
// ─────────────────────────────────────────────────────────
function Sidebar({
  open, setOpen,
  activeGroup, setActiveGroup,
  viewMode, setViewMode,
  selectedMonth, availableMonths, monthIdx, setSelectedMonth,
  selectedWeek, availableWeeks, weekIdx, setSelectedWeek,
}) {
  const { dark, toggle } = useTheme()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { to: '/violations', label: 'Vi phạm', icon: <AlertTriangle size={16} /> },
  ]
  const adminLinks = user ? [
    { to: '/admin/data-entry', label: 'Nhập liệu', icon: <Database size={16} /> },
    { to: '/admin/baseline', label: 'Baseline', icon: <TrendingUp size={16} /> },
    { to: '/admin/slideshow', label: 'Slideshow', icon: <Monitor size={16} /> },
    { to: '/admin/violation/create', label: 'Tạo vi phạm', icon: <PlusCircle size={16} /> },
  ] : []

  return (
    <aside
      className={`
        hidden lg:flex flex-col flex-shrink-0
        sticky top-0 h-[calc(100vh-56px-34px)]
        bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
        border-r border-gray-200/60 dark:border-gray-800/60
        transition-all duration-300 overflow-hidden
        ${open ? 'w-56' : 'w-14'}
      `}
    >
      {/* Toggle button */}
      <div className={`flex items-center h-12 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 ${open ? 'px-3 justify-between' : 'justify-center'}`}>
        {open && (
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Tinh Lợi" className="h-7 w-auto object-contain flex-shrink-0" />
            <span className="text-xs font-bold gradient-text leading-tight">TINH LỢI<br/><span className="font-normal text-gray-400">Năng lượng</span></span>
          </div>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
          {open ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4">

        {/* Group selector */}
        <div className={`${open ? 'px-3' : 'px-2'}`}>
          {open && <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nhóm</div>}
          <div className={`flex ${open ? 'flex-row gap-1' : 'flex-col gap-1 items-center'}`}>
            {GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                title={g}
                className={`
                  transition-all rounded-lg font-medium text-xs
                  ${open ? 'flex-1 py-1.5 px-2' : 'w-9 h-9 flex items-center justify-center'}
                  ${activeGroup === g
                    ? 'gradient-bg text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
                `}>
                {open ? g : g.charAt(0)}
              </button>
            ))}
          </div>
        </div>

        {/* View mode toggle: Tháng / Tuần */}
        <div className={`${open ? 'px-3' : 'px-2'}`}>
          {open && <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chế độ xem</div>}
          <div className={`flex ${open ? 'flex-row gap-1' : 'flex-col gap-1 items-center'}`}>
            {['month', 'week'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={mode === 'month' ? 'Tháng' : 'Tuần'}
                className={`
                  transition-all rounded-lg font-medium text-xs
                  ${open ? 'flex-1 py-1.5 px-2' : 'w-9 h-9 flex items-center justify-center'}
                  ${viewMode === mode
                    ? 'gradient-bg text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
                `}>
                {open ? (mode === 'month' ? 'Tháng' : 'Tuần') : (mode === 'month' ? 'T' : 'W')}
              </button>
            ))}
          </div>
        </div>

        {/* Month selector */}
        {viewMode === 'month' && (
        <div className={`${open ? 'px-3' : 'px-2'}`}>
          {open && <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tháng</div>}
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => setSelectedMonth(availableMonths[monthIdx + 1])}
              disabled={monthIdx >= availableMonths.length - 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors flex-shrink-0">
              <ChevronLeft size={13} />
            </button>
            {open && selectedMonth && (
              <div className="text-xs text-center font-semibold text-gray-700 dark:text-gray-300 min-w-0 px-1">
                T{parseInt(selectedMonth.split('-')[1])}/{selectedMonth.split('-')[0].slice(2)}
              </div>
            )}
            <button
              onClick={() => setSelectedMonth(availableMonths[monthIdx - 1])}
              disabled={monthIdx <= 0}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors flex-shrink-0">
              <ChevronRight size={13} />
            </button>
          </div>
          {/* Month pills */}
          {open && availableMonths.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {availableMonths.slice(0, 6).map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    selectedMonth === m
                      ? 'gradient-bg text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}>
                  Tháng {parseInt(m.split('-')[1])}/{m.split('-')[0]}
                </button>
              ))}
            </div>
          )}
        </div>
        )} {/* end month selector */}

        {/* Week selector */}
        {viewMode === 'week' && (
        <div className={`${open ? 'px-3' : 'px-2'}`}>
          {open && <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tuần</div>}
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => setSelectedWeek(availableWeeks[weekIdx + 1])}
              disabled={weekIdx >= availableWeeks.length - 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors flex-shrink-0">
              <ChevronLeft size={13} />
            </button>
            {open && selectedWeek && (
              <div className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 leading-tight min-w-0 px-1">
                {format(new Date(selectedWeek), 'dd/MM', { locale: vi })}
                <div className="text-gray-400 font-normal">
                  — {format(new Date(new Date(selectedWeek).getTime() + 6 * 86400000), 'dd/MM', { locale: vi })}
                </div>
              </div>
            )}
            <button
              onClick={() => setSelectedWeek(availableWeeks[weekIdx - 1])}
              disabled={weekIdx <= 0}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors flex-shrink-0">
              <ChevronRight size={13} />
            </button>
          </div>
          {open && availableWeeks.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {availableWeeks.slice(0, 8).map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    selectedWeek === w
                      ? 'gradient-bg text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}>
                  {format(new Date(w), 'dd/MM', { locale: vi })} – {format(new Date(new Date(w).getTime() + 6 * 86400000), 'dd/MM', { locale: vi })}
                </button>
              ))}
            </div>
          )}
        </div>
        )} {/* end week selector */}

        {/* Nav links */}
        <div className={`${open ? 'px-3' : 'px-2'}`}>
          {open && <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</div>}
          <div className="flex flex-col gap-0.5">
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                title={!open ? l.label : undefined}
                className={`flex items-center gap-2.5 rounded-lg transition-colors font-medium text-xs
                  ${open ? 'px-2.5 py-2' : 'w-9 h-9 justify-center'}
                  ${location.pathname === l.to
                    ? 'gradient-bg text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <span className="flex-shrink-0">{l.icon}</span>
                {open && l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Admin links */}
        {user && adminLinks.length > 0 && (
          <div className={`${open ? 'px-3' : 'px-2'}`}>
            {open && <div className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Admin</div>}
            <div className="flex flex-col gap-0.5">
              {adminLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  title={!open ? l.label : undefined}
                  className={`flex items-center gap-2.5 rounded-lg transition-colors font-medium text-xs
                    ${open ? 'px-2.5 py-2' : 'w-9 h-9 justify-center'}
                    text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20`}>
                  <span className="flex-shrink-0">{l.icon}</span>
                  {open && l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`border-t border-gray-100 dark:border-gray-800 py-2 flex-shrink-0 ${open ? 'px-3 flex items-center justify-between' : 'px-2 flex flex-col items-center gap-1'}`}>
        <button
          onClick={toggle}
          title={dark ? 'Chế độ sáng' : 'Chế độ tối'}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        {user ? (
          <button
            onClick={handleSignOut}
            title="Đăng xuất"
            className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${open ? '' : 'justify-center'}`}>
            <LogOut size={14} />
            {open && 'Đăng xuất'}
          </button>
        ) : (
          <Link
            to="/login"
            title="Đăng nhập Admin"
            className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${open ? '' : 'justify-center'}`}>
            <LogIn size={14} />
            {open && 'Admin'}
          </Link>
        )}
      </div>
    </aside>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeGroup, setActiveGroup] = useState('Sweater')
  const [groups, setGroups] = useState([])
  const [blocks, setBlocks] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [baselines, setBaselines] = useState([])
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [availableWeeks, setAvailableWeeks] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week'
  const [loading, setLoading] = useState(true)
  const [violationCount, setViolationCount] = useState(0)
  const [violationSlides, setViolationSlides] = useState([])
  const [blocksMap, setBlocksMap] = useState({})

  useEffect(() => {
    Promise.all([
      supabase.from('groups').select('*').order('name'),
      supabase.from('blocks').select('*').order('sort_order'),
      supabase.from('weekly_data').select('*').order('week_start', { ascending: false }),
      supabase.from('baselines').select('*').order('valid_from', { ascending: false }),
      supabase.from('violations').select('id', { count: 'exact' }).eq('status', 'open'),
      supabase
        .from('violation_images')
        .select('*, violations(block_id, description, reported_at)')
        .order('id', { ascending: false })
        .limit(40),
    ]).then(([g, b, wd, bl, v, imgs]) => {
      setGroups(g.data || [])
      setBlocks(b.data || [])
      setWeeklyData(wd.data || [])
      setBaselines(bl.data || [])
      setViolationCount(v.count || 0)

      // Build blocks map
      const bmap = {}
      ;(b.data || []).forEach(block => { bmap[block.id] = block })
      setBlocksMap(bmap)

      // Build violation slides
      const slides = (imgs.data || [])
        .filter(img => img.image_url && img.violations)
        .map(img => ({
          imageUrl: img.image_url,
          blockName: bmap[img.violations.block_id]?.name || null,
          description: img.violations.description,
          reportedAt: img.violations.reported_at,
        }))
      setViolationSlides(slides)

      // Available months (YYYY-MM) derived from week_start
      const monthSet = new Set((wd.data || []).map(d => d.week_start.substring(0, 7)))
      const months = [...monthSet].sort((a, b) => b.localeCompare(a))
      setAvailableMonths(months)
      if (months.length > 0) setSelectedMonth(months[0])

      // Available weeks
      const weekSet = new Set((wd.data || []).map(d => d.week_start))
      const weeks = [...weekSet].sort((a, b) => b.localeCompare(a))
      setAvailableWeeks(weeks)
      if (weeks.length > 0) setSelectedWeek(weeks[0])
      setLoading(false)
    })
  }, [])

  const getBaseline = (blockId, weekStart) =>
    baselines
      .filter(bl => bl.block_id === blockId && bl.valid_from <= weekStart)
      .sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0]

  const currentGroup = useMemo(() => groups.find(g => g.name === activeGroup), [groups, activeGroup])
  const currentBlocks = useMemo(() => blocks.filter(b => b.group_id === currentGroup?.id), [blocks, currentGroup])

  // Tổng hợp tất cả tuần trong tháng → tính TB ngày tháng
  const monthResults = useMemo(() => {
    if (!selectedMonth || !currentBlocks.length) return []
    return currentBlocks.map(block => {
      const monthWeeks = weeklyData.filter(d =>
        d.block_id === block.id &&
        d.week_start.substring(0, 7) === selectedMonth
      )
      if (!monthWeeks.length) return { block, hasData: false, pctAbsolute: 0, pctPerUnit: 0, electricity: 0, elec_per_unit: 0, tbNgay: 0, days: 0 }

      // Lấy baseline theo tuần sớm nhất trong tháng
      const sorted = [...monthWeeks].sort((a, b) => a.week_start.localeCompare(b.week_start))
      const bl = getBaseline(block.id, sorted[0].week_start)
      if (!bl) return { block, hasData: false, pctAbsolute: 0, pctPerUnit: 0, electricity: 0, elec_per_unit: 0, tbNgay: 0, days: 0 }

      // Gom tổng
      const totalElec = monthWeeks.reduce((s, w) => s + (w.electricity || 0), 0)
      const totalDays = monthWeeks.reduce((s, w) => s + (w.working_days || 6), 0)
      const totalSahOrPcs = monthWeeks.reduce((s, w) => s + (w.sah_or_pcs || 0), 0)

      // TB ngày tháng = tổng kWh / tổng ngày làm việc
      const tbNgay = totalDays > 0 ? totalElec / totalDays : 0
      // Điện/đơn vị tháng = tổng kWh / tổng SAH·Pcs
      const elecPerUnit = totalSahOrPcs > 0 ? totalElec / totalSahOrPcs : 0

      // So với baseline
      const baselineDailyElec = bl.avg_electricity / 30
      const pctAbsolute = baselineDailyElec > 0
        ? ((baselineDailyElec - tbNgay) / baselineDailyElec) * 100
        : 0
      const pctPerUnit = bl.avg_elec_per_unit > 0
        ? ((bl.avg_elec_per_unit - elecPerUnit) / bl.avg_elec_per_unit) * 100
        : 0

      return {
        block, hasData: true,
        electricity: totalElec,
        tbNgay,
        elec_per_unit: elecPerUnit,
        days: totalDays,
        weekCount: monthWeeks.length,
        pctAbsolute, pctPerUnit,
      }
    })
  }, [selectedMonth, currentBlocks, weeklyData, baselines])

  // Dữ liệu theo tuần (dùng khi viewMode === 'week')
  const weekResults = useMemo(() => {
    if (!selectedWeek || !currentBlocks.length) return []
    return currentBlocks.map(block => {
      const wd = weeklyData.find(d => d.block_id === block.id && d.week_start === selectedWeek)
      const bl = getBaseline(block.id, selectedWeek)
      if (!wd || !bl) return { block, hasData: false, pctAbsolute: 0, pctPerUnit: 0, electricity: 0, elec_per_unit: 0, tbNgay: 0, days: 6 }
      const days = wd.working_days || 6
      const tbNgay = days > 0 ? wd.electricity / days : 0
      const pctAbsolute = bl.avg_electricity > 0
        ? ((bl.avg_electricity / 30) - tbNgay) / (bl.avg_electricity / 30) * 100
        : 0
      const pctPerUnit = calcPctPerUnit(wd.elec_per_unit, bl.avg_elec_per_unit)
      return { block, hasData: true, electricity: wd.electricity, elec_per_unit: wd.elec_per_unit, tbNgay, pctAbsolute, pctPerUnit, days }
    })
  }, [selectedWeek, currentBlocks, weeklyData, baselines])

  const activeResults = viewMode === 'month' ? monthResults : weekResults
  const scoredResults = useMemo(() => calculateGroupScores(activeResults), [activeResults])

  const totalElec = scoredResults.filter(r => r.hasData).reduce((s, r) => s + r.electricity, 0)
  const avgPctPerUnit = (() => {
    const valid = scoredResults.filter(r => r.hasData && r.pctPerUnit !== 0)
    if (!valid.length) return 0
    return valid.reduce((s, r) => s + r.pctPerUnit, 0) / valid.length
  })()
  const leader = scoredResults[0]
  const monthIdx = availableMonths.indexOf(selectedMonth)
  const weekIdx = availableWeeks.indexOf(selectedWeek)

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 gradient-bg rounded-full animate-spin mx-auto mb-3" style={{ borderTopColor: 'transparent' }} />
        <p className="text-sm text-gray-400">Đang tải dữ liệu...</p>
      </div>
    </div>
  )

  const MARQUEE_TEXT = [
    '🏆 Cuộc thi "TIẾT KIỆM ĐIỆN"',
    '⚡ Lan tỏa văn hóa tiết kiệm',
    '🌟 Cùng nhau tiết kiệm — Cùng nhau thắng lợi',
    '🥇 Giải Nhất: 3.000.000 VNĐ',
    '🥈 Giải Nhì: 2.000.000 VNĐ',
    '🥉 Giải Ba: 1.000.000 VNĐ',
    '💡 Tắt điện khi không sử dụng',
    '🌱 Mỗi kWh tiết kiệm — Một bước đến chiến thắng',
  ].join('   ·   ')

  return (
    <div className="relative min-h-[calc(100vh-56px)]">

      {/* ── Banner nền ── */}
      <div
        className="fixed pointer-events-none"
        style={{ inset: 0, top: '56px', zIndex: 0 }}
      >
        {/* Ảnh banner mờ */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/banner.jpg')",
            filter: 'blur(3px)',
            transform: 'scale(1.06)',
            opacity: 0.28,
          }}
        />
        {/* Lớp phủ giữ màu nền */}
        <div className="absolute inset-0 bg-gray-50/82 dark:bg-gray-950/85" />
      </div>

      {/* ── Marquee ticker ── */}
      <div
        className="relative overflow-hidden flex items-center"
        style={{
          zIndex: 20,
          height: '34px',
          background: 'linear-gradient(90deg, #d42b2b 0%, #8b1f6b 35%, #1b3a8c 70%, #d42b2b 100%)',
        }}
      >
        {/* 2 bản sao để vòng lặp mượt */}
        <div className="flex items-center animate-marquee">
          <span className="whitespace-nowrap text-xs sm:text-sm font-semibold text-white tracking-wide pr-20">
            {MARQUEE_TEXT}
          </span>
          <span className="whitespace-nowrap text-xs sm:text-sm font-semibold text-white tracking-wide pr-20" aria-hidden>
            {MARQUEE_TEXT}
          </span>
        </div>
      </div>

      {/* ── Sidebar + Main (trên nền) ── */}
      <div className="relative flex" style={{ zIndex: 10, minHeight: 'calc(100vh - 56px - 34px)' }}>

      {/* ── Sidebar ── */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        activeGroup={activeGroup}
        setActiveGroup={setActiveGroup}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedMonth={selectedMonth}
        availableMonths={availableMonths}
        monthIdx={monthIdx}
        setSelectedMonth={setSelectedMonth}
        selectedWeek={selectedWeek}
        availableWeeks={availableWeeks}
        weekIdx={weekIdx}
        setSelectedWeek={setSelectedWeek}
      />

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 p-4 lg:p-5">

        {/* ── Mobile controls ── */}
        <div className="lg:hidden mb-4 space-y-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Dashboard <span className="gradient-text">TKNL</span>
            </h1>
            {selectedMonth && (
              <p className="text-xs text-gray-500 mt-0.5">
                Tháng {parseInt(selectedMonth.split('-')[1])}/{selectedMonth.split('-')[0]}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {GROUPS.map(g => (
                <button key={g} onClick={() => setActiveGroup(g)}
                  className={`px-4 py-1.5 text-sm font-semibold transition-all ${
                    activeGroup === g ? 'gradient-bg text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'
                  }`}>
                  {g}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setSelectedMonth(availableMonths[monthIdx + 1])} disabled={monthIdx >= availableMonths.length - 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setSelectedMonth(availableMonths[monthIdx - 1])} disabled={monthIdx <= 0}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Desktop page header ── */}
        <div className="hidden lg:flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Dashboard — Nhóm <span className="gradient-text">{activeGroup}</span>
            </h1>
            {selectedMonth && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Tháng {parseInt(selectedMonth.split('-')[1])}/{selectedMonth.split('-')[0]} · Nhà máy Tinh Lợi
              </p>
            )}
          </div>
          {selectedMonth && (
            <span className="text-xs px-3 py-1 rounded-full gradient-bg text-white font-medium shadow-sm">
              Tháng {parseInt(selectedMonth.split('-')[1])}/{selectedMonth.split('-')[0]}
            </span>
          )}
        </div>

        {/* ── Main grid ── */}
        <div className="flex gap-4 flex-col lg:flex-row">

          {/* Left column: stat cards + ranking */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* 2×2 Stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* ô 1 - Tổng điện (highlighted) */}
              <StatCard
                highlight
                icon={<Zap size={18} className="text-white" />}
                label="Tổng điện tiêu thụ"
                value={totalElec > 0 ? `${(totalElec / 1000).toFixed(0)}K kWh` : '— kWh'}
                sub="tuần này"
                badgeText={scoredResults.filter(r => r.hasData).length > 0 ? `${scoredResults.filter(r => r.hasData).length} KV` : undefined}
              />
              {/* ô 2 - TB giảm/đơn vị */}
              <StatCard
                icon={<TrendingDown size={18} className={avgPctPerUnit >= 0 ? 'text-emerald-500' : 'text-red-500'} />}
                label="TB giảm/đơn vị"
                value={`${avgPctPerUnit >= 0 ? '+' : ''}${avgPctPerUnit.toFixed(1)}%`}
                sub="so với baseline"
                badgeText={avgPctPerUnit >= 0 ? '↓ Tốt' : '↑ Tăng'}
                badgeColor={avgPctPerUnit >= 0 ? 'green' : 'red'}
              />
              {/* ô 4 - Vi phạm */}
              <StatCard
                icon={<AlertTriangle size={18} className={violationCount > 0 ? 'text-red-500' : 'text-emerald-500'} />}
                label="Vi phạm chưa xử lý"
                value={violationCount}
                sub="hiện trường"
                badgeText={violationCount === 0 ? 'Tốt' : 'Cần xử lý'}
                badgeColor={violationCount === 0 ? 'green' : 'red'}
              />
              {/* ô 3 - Dẫn đầu */}
              <StatCard
                icon={<Award size={18} className="text-amber-500" />}
                label="Dẫn đầu nhóm"
                value={leader?.hasData ? leader.block.name : '—'}
                sub={leader?.hasData ? `${leader.ptsTotal.toFixed(1)} điểm` : 'Chưa có dữ liệu'}
                badgeText={leader?.hasData ? '🥇' : undefined}
              />
            </div>

            {/* ô 5 - Ranking table */}
            <CompactRankingTable results={scoredResults} groupName={activeGroup} showScore={viewMode === 'month'} />
          </div>

          {/* Right column: slideshow + bar chart */}
          <div className="lg:w-80 xl:w-96 flex flex-col gap-4 flex-shrink-0">
            {/* ô 7 - Violation slideshow */}
            <ViolationSlideshow slides={violationSlides} />

            {/* ô 6 - Bar chart */}
            <ElecBarChart results={scoredResults} />
          </div>
        </div>
      </div>
      </div> {/* end .relative.flex sidebar+main */}
    </div>
  )
}
