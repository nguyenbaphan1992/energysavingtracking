import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Save, Info, CheckCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function BaselineSettings() {
  const [groups, setGroups] = useState([])
  const [blocks, setBlocks] = useState([])
  const [baselines, setBaselines] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [validFrom, setValidFrom] = useState(format(new Date(), 'yyyy-MM-01'))
  const [entries, setEntries] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('groups').select('*').order('name'),
      supabase.from('blocks').select('*').order('sort_order'),
      supabase.from('baselines').select('*').order('valid_from', { ascending: false }),
    ]).then(([g, b, bl]) => {
      setGroups(g.data || [])
      setBlocks(b.data || [])
      setBaselines(bl.data || [])
      if (g.data?.length) setSelectedGroup(g.data[0].id)
    })
  }, [])

  const currentBlocks = blocks.filter(b => b.group_id === selectedGroup)

  // Get latest baseline for block
  const getLatestBaseline = (blockId) =>
    baselines.filter(bl => bl.block_id === blockId).sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0]

  // Init entries from latest baselines
  useEffect(() => {
    const init = {}
    currentBlocks.forEach(b => {
      const latest = getLatestBaseline(b.id)
      init[b.id] = {
        avg_electricity: latest ? String(latest.avg_electricity) : '',
        avg_sah_pcs: latest ? String(latest.avg_sah_pcs) : '',
        note: latest ? (latest.note || '') : '',
      }
    })
    setEntries(init)
  }, [selectedGroup, baselines])

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
      .filter(b => entries[b.id]?.avg_electricity && entries[b.id]?.avg_sah_pcs)
      .map(b => {
        const elec = parseFloat(entries[b.id].avg_electricity)
        const unit = parseFloat(entries[b.id].avg_sah_pcs)
        return {
          block_id: b.id,
          valid_from: validFrom,
          avg_electricity: elec,
          avg_sah_pcs: unit,
          avg_elec_per_unit: unit > 0 ? elec / unit : 0,
          note: entries[b.id].note || `Baseline TB 2 tháng, áp dụng từ ${validFrom}`,
        }
      })

    const { error } = await supabase.from('baselines').upsert(upserts, {
      onConflict: 'block_id,valid_from',
    })
    if (!error) {
      const { data } = await supabase.from('baselines').select('*').order('valid_from', { ascending: false })
      setBaselines(data || [])
    }
    setSaving(false)
    if (error) showToast('Lỗi: ' + error.message, 'error')
    else showToast('Đã cập nhật baseline thành công!')
  }

  const currentGroupName = groups.find(g => g.id === selectedGroup)?.name

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-slide-up">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in
          ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cài đặt <span className="gradient-text">Baseline</span></h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật baseline (trung bình 2 tháng trước) cho tháng mới</p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>Cách tính baseline:</strong> Lấy trung bình Điện và SAH/Pcs của 2 tháng liền trước.
          Ví dụ: Baseline tháng 6 = TB tháng 4 + tháng 5. Điện/đơn vị sẽ được tự tính.
        </div>
      </div>

      {/* Controls */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="label">Nhóm nhà máy</label>
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="input">
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="label">Áp dụng từ tháng</label>
          <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="input" />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold">Baseline — Nhóm <span className="gradient-text">{currentGroupName}</span></h3>
          <p className="text-xs text-gray-400 mt-0.5">Giá trị pre-fill từ baseline mới nhất. Chỉnh sửa và lưu để cập nhật.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Khu vực</th>
                <th className="px-4 py-3 text-left">Đơn vị</th>
                <th className="px-4 py-3 text-left">TB Điện/tháng (kWh)</th>
                <th className="px-4 py-3 text-left">TB SAH/Pcs/tháng</th>
                <th className="px-4 py-3 text-right">Điện/đơn vị (tự tính)</th>
                <th className="px-4 py-3 text-left">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {currentBlocks.map(block => {
                const e = entries[block.id] || {}
                const elec = parseFloat(e.avg_electricity) || 0
                const unit = parseFloat(e.avg_sah_pcs) || 0
                const ratio = unit > 0 ? (elec / unit).toFixed(5) : '—'
                const latest = getLatestBaseline(block.id)
                return (
                  <tr key={block.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{block.name}
                      {latest && <div className="text-xs text-gray-400 font-normal">Baseline hiện tại: {format(new Date(latest.valid_from), 'MM/yyyy')}</div>}
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
                      <input type="number" min="0" value={e.avg_electricity || ''}
                        onChange={ev => handleChange(block.id, 'avg_electricity', ev.target.value)}
                        className="input py-1.5 text-sm w-36" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" value={e.avg_sah_pcs || ''}
                        onChange={ev => handleChange(block.id, 'avg_sah_pcs', ev.target.value)}
                        className="input py-1.5 text-sm w-36" />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-secondary-600 dark:text-secondary-400">{ratio}</td>
                    <td className="px-4 py-3">
                      <input type="text" value={e.note || ''}
                        onChange={ev => handleChange(block.id, 'note', ev.target.value)}
                        placeholder="Ghi chú..."
                        className="input py-1.5 text-sm w-36" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save size={16} />
            {saving ? 'Đang lưu...' : 'Cập nhật baseline'}
          </button>
        </div>
      </div>
    </div>
  )
}
