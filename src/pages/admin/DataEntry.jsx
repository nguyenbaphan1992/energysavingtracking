import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { Save, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react'

function AdminShell({ children, title, sub }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
      </div>
      {children}
    </div>
  )
}

export default function DataEntry() {
  const [groups, setGroups] = useState([])
  const [blocks, setBlocks] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [entries, setEntries] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [existingData, setExistingData] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('groups').select('*').order('name'),
      supabase.from('blocks').select('*').order('sort_order'),
    ]).then(([g, b]) => {
      setGroups(g.data || [])
      setBlocks(b.data || [])
      if (g.data?.length) setSelectedGroup(g.data[0].id)
    })
  }, [])

  const currentGroup = groups.find(g => g.id === selectedGroup)
  const currentBlocks = blocks.filter(b => b.group_id === selectedGroup)
  const weekEnd = format(endOfWeek(new Date(weekStart), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  // Load existing data for week
  useEffect(() => {
    if (!weekStart || !currentBlocks.length) return
    const ids = currentBlocks.map(b => b.id)
    supabase.from('weekly_data')
      .select('*')
      .in('block_id', ids)
      .eq('week_start', weekStart)
      .then(({ data }) => {
        setExistingData(data || [])
        const init = {}
        currentBlocks.forEach(b => {
          const ex = data?.find(d => d.block_id === b.id)
          init[b.id] = {
            electricity: ex ? String(ex.electricity) : '',
            sah_or_pcs: ex ? String(ex.sah_or_pcs) : '',
            working_days: ex ? String(ex.working_days ?? 6) : '6',
          }
        })
        setEntries(init)
      })
  }, [weekStart, selectedGroup])

  const handleChange = (blockId, field, value) => {
    setEntries(e => ({ ...e, [blockId]: { ...e[blockId], [field]: value } }))
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    setSaving(true)
    const upserts = currentBlocks
      .filter(b => entries[b.id]?.electricity && entries[b.id]?.sah_or_pcs)
      .map(b => ({
        block_id: b.id,
        week_start: weekStart,
        week_end: weekEnd,
        electricity: parseFloat(entries[b.id].electricity),
        sah_or_pcs: parseFloat(entries[b.id].sah_or_pcs),
        working_days: parseInt(entries[b.id].working_days) || 6,
      }))

    const { error } = await supabase.from('weekly_data').upsert(upserts, {
      onConflict: 'block_id,week_start',
    })
    setSaving(false)
    if (error) showToast('Lỗi khi lưu: ' + error.message, 'error')
    else showToast(`Đã lưu ${upserts.length} khu vực thành công!`)
  }

  return (
    <AdminShell title="Nhập dữ liệu tuần" sub="Nhập số điện, SAH/Pcs và số ngày làm việc thực tế cho từng khu vực">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in
          ${toast.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-emerald-500 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Controls */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="label">Nhóm nhà máy</label>
          <div className="relative">
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="input appearance-none pr-8">
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="label">Tuần bắt đầu (Thứ 2)</label>
          <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} className="input" />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 pb-2">
          → Tuần: {weekStart} — {weekEnd}
        </div>
      </div>

      {/* Chú thích ngày làm việc */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
        <span className="text-base leading-none mt-0.5">⚠️</span>
        <div>
          <span className="font-semibold">Số ngày làm việc:</span> mặc định <strong>6 ngày</strong> (Thứ 2 – Thứ  7).
          Nếu khu vực làm việc <strong>7 ngày</strong> trong tuần này (kể cả Chủ nhật), hãy chọn <strong>7</strong>.
          Số ngày này dùng để tính TB ngày chính xác và <em>không ảnh hưởng dữ liệu tháng</em>.
        </div>
      </div>

      {/* Entry table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold">Nhập số liệu — Nhóm <span className="gradient-text">{currentGroup?.name}</span></h3>
          <span className="text-xs text-gray-400">{currentBlocks.length} khu vực</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Khu vực</th>
                <th className="px-4 py-3 text-left">Đơn vị</th>
                <th className="px-4 py-3 text-left">Điện tiêu thụ (kWh)</th>
                <th className="px-4 py-3 text-left w-40">SAH / Pcs</th>
                <th className="px-4 py-3 text-center w-28">Ngày làm việc</th>
                <th className="px-4 py-3 text-right">TB ngày (tự tính)</th>
                <th className="px-4 py-3 text-right">Điện/đơn vị (tự tính)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {currentBlocks.map(block => {
                const e = entries[block.id] || { electricity: '', sah_or_pcs: '', working_days: '6' }
                const elec = parseFloat(e.electricity) || 0
                const unit = parseFloat(e.sah_or_pcs) || 0
                const days = parseInt(e.working_days) || 6
                const tbNgay = days > 0 && elec > 0 ? (elec / days).toFixed(1) : '—'
                const ratio = unit > 0 && elec > 0 ? (elec / unit).toFixed(5) : '—'
                const hasExisting = existingData.some(d => d.block_id === block.id)
                const is7Days = days === 7
                return (
                  <tr key={block.id} className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 ${hasExisting ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {block.name}
                      {hasExisting && <span className="ml-2 text-xs text-blue-500 font-normal">(đã có)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium
                        ${block.metric_type === 'SAH'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}`}>
                        {block.metric_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" value={e.electricity}
                        onChange={ev => handleChange(block.id, 'electricity', ev.target.value)}
                        placeholder="Nhập kWh..."
                        className="input py-1.5 text-sm w-36" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" value={e.sah_or_pcs}
                        onChange={ev => handleChange(block.id, 'sah_or_pcs', ev.target.value)}
                        placeholder={`Nhập ${block.metric_type}...`}
                        className="input py-1.5 text-sm w-36" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {[6, 7].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleChange(block.id, 'working_days', String(d))}
                            className={`w-10 py-1.5 rounded-lg text-xs font-bold transition-all border
                              ${days === d
                                ? d === 7
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'gradient-bg text-white border-transparent'
                                : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                              }`}>
                            {d}
                          </button>
                        ))}
                      </div>
                      {is7Days && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">Cả tuần</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                      {tbNgay}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-secondary-600 dark:text-secondary-400">
                      {ratio}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Cột <strong>TB ngày</strong> và <strong>Điện/đơn vị</strong> tự tính — kiểm tra trước khi lưu.
          </p>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save size={16} />
            {saving ? 'Đang lưu...' : 'Lưu dữ liệu tuần này'}
          </button>
        </div>
      </div>
    </AdminShell>
  )
}
