import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Save, Plus, Trash2, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

export default function ViolationCreate() {
  const [blocks, setBlocks] = useState([])
  const [violations, setViolations] = useState([])
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(null)
  const [form, setForm] = useState({
    block_id: '',
    reporter_name: '',
    reported_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    description: '',
    action_taken: '',
    image_urls: [''],
  })

  useEffect(() => {
    Promise.all([
      supabase.from('blocks').select('*').order('sort_order'),
      supabase.from('violations').select('*, blocks(name)').order('reported_at', { ascending: false }).limit(20),
    ]).then(([b, v]) => {
      setBlocks(b.data || [])
      setViolations(v.data || [])
      if (b.data?.length) setForm(f => ({ ...f, block_id: b.data[0].id }))
    })
  }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving('create')
    const { data: vData, error: vErr } = await supabase.from('violations').insert({
      block_id: form.block_id || null,
      reporter_name: form.reporter_name,
      reported_at: new Date(form.reported_at).toISOString(),
      description: form.description,
      action_taken: form.action_taken || null,
      status: 'open',
    }).select().single()

    if (vErr) { showToast('Lỗi: ' + vErr.message, 'error'); setSaving(null); return }

    // Insert images
    const urls = form.image_urls.filter(u => u.trim())
    if (urls.length > 0) {
      await supabase.from('violation_images').insert(
        urls.map(url => ({ violation_id: vData.id, image_url: url.trim() }))
      )
    }

    setSaving(null)
    showToast('Đã tạo báo cáo vi phạm!')
    setForm({
      block_id: blocks[0]?.id || '',
      reporter_name: form.reporter_name,
      reported_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      description: '',
      action_taken: '',
      image_urls: [''],
    })
    // Reload list
    const { data } = await supabase.from('violations').select('*, blocks(name)').order('reported_at', { ascending: false }).limit(20)
    setViolations(data || [])
  }

  const toggleStatus = async (v) => {
    setSaving(v.id)
    const newStatus = v.status === 'open' ? 'resolved' : 'open'
    await supabase.from('violations').update({
      status: newStatus,
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
    }).eq('id', v.id)
    const { data } = await supabase.from('violations').select('*, blocks(name)').order('reported_at', { ascending: false }).limit(20)
    setViolations(data || [])
    setSaving(null)
    showToast(newStatus === 'resolved' ? 'Đã đánh dấu xử lý!' : 'Đã mở lại vi phạm')
  }

  const addImageUrl = () => setForm(f => ({ ...f, image_urls: [...f.image_urls, ''] }))
  const removeImageUrl = (i) => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, idx) => idx !== i) }))
  const updateImageUrl = (i, val) => setForm(f => ({ ...f, image_urls: f.image_urls.map((u, idx) => idx === i ? val : u) }))

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-slide-up">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in
          ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tạo <span className="gradient-text">Báo cáo vi phạm</span></h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Ghi nhận vi phạm tiết kiệm năng lượng tại hiện trường</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Khu vực <span className="text-red-400">*</span></label>
            <select value={form.block_id} onChange={e => setForm(f => ({ ...f, block_id: e.target.value }))} className="input">
              <option value="">— Chọn khu vực —</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Người phát hiện <span className="text-red-400">*</span></label>
            <input type="text" value={form.reporter_name}
              onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))}
              placeholder="Tên người báo cáo..." required className="input" />
          </div>
        </div>

        <div>
          <label className="label">Thời điểm phát hiện</label>
          <input type="datetime-local" value={form.reported_at}
            onChange={e => setForm(f => ({ ...f, reported_at: e.target.value }))} className="input" />
        </div>

        <div>
          <label className="label">Mô tả vi phạm <span className="text-red-400">*</span></label>
          <textarea rows={3} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Mô tả chi tiết hành vi vi phạm tiết kiệm năng lượng..."
            required className="input resize-none" />
        </div>

        <div>
          <label className="label">Hành động khắc phục (nếu có)</label>
          <textarea rows={2} value={form.action_taken}
            onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))}
            placeholder="Đã xử lý như thế nào..."
            className="input resize-none" />
        </div>

        <div>
          <label className="label">Link ảnh hiện trường (URL)</label>
          <div className="space-y-2">
            {form.image_urls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <input type="url" value={url}
                  onChange={e => updateImageUrl(i, e.target.value)}
                  placeholder="https://..." className="input flex-1" />
                {form.image_urls.length > 1 && (
                  <button type="button" onClick={() => removeImageUrl(i)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {form.image_urls.length < 5 && (
              <button type="button" onClick={addImageUrl}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                <Plus size={14} /> Thêm ảnh
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">Dán URL ảnh từ Google Drive, OneDrive, Imgur...</p>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving === 'create'} className="btn-primary">
            <AlertTriangle size={16} />
            {saving === 'create' ? 'Đang lưu...' : 'Tạo báo cáo vi phạm'}
          </button>
        </div>
      </form>

      {/* Recent violations */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold">20 vi phạm gần nhất</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {violations.map(v => (
            <div key={v.id} className="flex items-center gap-3 px-5 py-3">
              <div className={`flex-shrink-0 ${v.status === 'open' ? 'text-red-500' : 'text-emerald-500'}`}>
                <AlertTriangle size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{v.description}</p>
                <p className="text-xs text-gray-400">{v.blocks?.name} · {format(new Date(v.reported_at), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              <button onClick={() => toggleStatus(v)} disabled={saving === v.id}
                className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors
                  ${v.status === 'open'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {saving === v.id ? '...' : v.status === 'open' ? '✓ Đánh dấu xử lý' : '↩ Mở lại'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
