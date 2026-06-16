import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Save, Plus, Trash2, CheckCircle, AlertCircle, AlertTriangle,
  Upload, Link2, X, RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const BUCKET = 'violation-images'

// Upload file lên Supabase Storage, trả về public URL
async function uploadFileToStorage(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, { cacheControl: '3600', upsert: false })
  if (error) throw new Error('Upload thất bại: ' + error.message)
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return publicUrl
}

export default function ViolationCreate() {
  const fileInputRef = useRef(null)

  const [groups, setGroups] = useState([])
  const [blocks, setBlocks] = useState([])
  const [violations, setViolations] = useState([])
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)

  // Form state
  const [formGroup, setFormGroup] = useState('')   // group filter cho form
  const [form, setForm] = useState({
    block_id: '',
    reporter_name: '',
    reported_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    description: '',
    action_taken: '',
    image_urls: [''],          // URL nhập tay
    uploaded_urls: [],         // URL sau khi upload file
  })

  // List filter
  const [listGroup, setListGroup] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null) // violation id cần xác nhận xóa

  // ── Load data ──────────────────────────────────────────
  const loadViolations = async () => {
    const { data } = await supabase
      .from('violations')
      .select('*, blocks(name, group_id)')
      .order('reported_at', { ascending: false })
      .limit(50)
    setViolations(data || [])
  }

  useEffect(() => {
    Promise.all([
      supabase.from('groups').select('*').order('name'),
      supabase.from('blocks').select('*').order('sort_order'),
    ]).then(([g, b]) => {
      setGroups(g.data || [])
      setBlocks(b.data || [])
      const firstId = b.data?.[0]?.id || ''
      setForm(f => ({ ...f, block_id: firstId }))
    })
    loadViolations()
  }, [])

  // Blocks hiển thị trong form (lọc theo nhóm chọn)
  const formBlocks = formGroup
    ? blocks.filter(b => b.group_id === formGroup)
    : blocks

  // Violations hiển thị trong list (lọc theo nhóm)
  const listViolations = listGroup
    ? violations.filter(v => v.blocks?.group_id === listGroup)
    : violations

  // ── Toast ───────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Upload file trực tiếp ───────────────────────────────
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadingFiles(true)
    try {
      const urls = await Promise.all(files.map(uploadFileToStorage))
      setForm(f => ({ ...f, uploaded_urls: [...f.uploaded_urls, ...urls] }))
      showToast(`Đã upload ${urls.length} ảnh`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeUploadedUrl = (i) =>
    setForm(f => ({ ...f, uploaded_urls: f.uploaded_urls.filter((_, idx) => idx !== i) }))

  // ── URL nhập tay ────────────────────────────────────────
  const addImageUrl = () =>
    setForm(f => ({ ...f, image_urls: [...f.image_urls, ''] }))
  const removeImageUrl = (i) =>
    setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, idx) => idx !== i) }))
  const updateImageUrl = (i, val) =>
    setForm(f => ({ ...f, image_urls: f.image_urls.map((u, idx) => idx === i ? val : u) }))

  // ── Tạo vi phạm ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.block_id) { showToast('Vui lòng chọn khu vực', 'error'); return }
    setSaving('create')

    const { data: vData, error: vErr } = await supabase.from('violations').insert({
      block_id: form.block_id,
      reporter_name: form.reporter_name,
      reported_at: new Date(form.reported_at).toISOString(),
      description: form.description,
      action_taken: form.action_taken || null,
      status: 'open',
    }).select().single()

    if (vErr) { showToast('Lỗi: ' + vErr.message, 'error'); setSaving(null); return }

    // Tổng hợp tất cả URL (nhập tay + upload)
    const allUrls = [
      ...form.image_urls.filter(u => u.trim()),
      ...form.uploaded_urls,
    ]
    if (allUrls.length > 0) {
      await supabase.from('violation_images').insert(
        allUrls.map(url => ({ violation_id: vData.id, image_url: url }))
      )
    }

    setSaving(null)
    showToast('Đã tạo báo cáo vi phạm!')
    setForm(f => ({
      ...f,
      reported_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      description: '',
      action_taken: '',
      image_urls: [''],
      uploaded_urls: [],
    }))
    loadViolations()
  }

  // ── Toggle trạng thái ───────────────────────────────────
  const toggleStatus = async (v) => {
    setSaving(v.id + '_toggle')
    const newStatus = v.status === 'open' ? 'resolved' : 'open'
    await supabase.from('violations').update({
      status: newStatus,
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
    }).eq('id', v.id)
    await loadViolations()
    setSaving(null)
    showToast(newStatus === 'resolved' ? 'Đã đánh dấu xử lý!' : 'Đã mở lại vi phạm')
  }

  // ── Xóa vi phạm ────────────────────────────────────────
  const handleDelete = async (v) => {
    setSaving(v.id + '_del')
    setConfirmDelete(null)
    // 1. Lấy danh sách ảnh để xóa khỏi storage
    const { data: imgs } = await supabase
      .from('violation_images')
      .select('image_url')
      .eq('violation_id', v.id)

    // 2. Xóa ảnh trong storage (các ảnh upload trực tiếp)
    if (imgs?.length) {
      const storagePaths = imgs
        .map(img => {
          try {
            const url = new URL(img.image_url)
            const parts = url.pathname.split(`/${BUCKET}/`)
            return parts[1] || null
          } catch { return null }
        })
        .filter(Boolean)
      if (storagePaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(storagePaths)
      }
    }

    // 3. Xóa violation_images
    await supabase.from('violation_images').delete().eq('violation_id', v.id)
    // 4. Xóa violation
    await supabase.from('violations').delete().eq('id', v.id)

    setSaving(null)
    showToast('Đã xóa vi phạm')
    await loadViolations()
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-slide-up">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in
          ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-secondary-600 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">Xác nhận xóa</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Xóa vi phạm này sẽ xóa luôn tất cả ảnh đính kèm. Không thể khôi phục!
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="btn-secondary px-4 py-2 text-sm">
                Hủy
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                Xóa vi phạm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tạo <span className="gradient-text">Báo cáo vi phạm</span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Ghi nhận vi phạm tiết kiệm năng lượng tại hiện trường</p>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="card space-y-4">

        {/* Nhóm + Khu vực */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Nhóm</label>
            <select
              value={formGroup}
              onChange={e => {
                setFormGroup(e.target.value)
                // Reset block_id về block đầu tiên của nhóm mới
                const newBlocks = e.target.value
                  ? blocks.filter(b => b.group_id === e.target.value)
                  : blocks
                setForm(f => ({ ...f, block_id: newBlocks[0]?.id || '' }))
              }}
              className="input">
              <option value="">— Tất cả nhóm —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Khu vực <span className="text-red-400">*</span></label>
            <select
              value={form.block_id}
              onChange={e => setForm(f => ({ ...f, block_id: e.target.value }))}
              className="input"
              required>
              <option value="">— Chọn khu vực —</option>
              {formBlocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Người phát hiện <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.reporter_name}
              onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))}
              placeholder="Tên người báo cáo..."
              required
              className="input" />
          </div>
        </div>

        <div>
          <label className="label">Thời điểm phát hiện</label>
          <input
            type="datetime-local"
            value={form.reported_at}
            onChange={e => setForm(f => ({ ...f, reported_at: e.target.value }))}
            className="input" />
        </div>

        <div>
          <label className="label">Mô tả vi phạm <span className="text-red-400">*</span></label>
          <textarea
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Mô tả chi tiết hành vi vi phạm tiết kiệm năng lượng..."
            required
            className="input resize-none" />
        </div>

        <div>
          <label className="label">Hành động khắc phục (nếu có)</label>
          <textarea
            rows={2}
            value={form.action_taken}
            onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))}
            placeholder="Đã xử lý như thế nào..."
            className="input resize-none" />
        </div>

        {/* ── Ảnh hiện trường ── */}
        <div>
          <label className="label">Ảnh hiện trường</label>

          {/* Tab: Upload file / Nhập URL */}
          <div className="space-y-3">

            {/* --- Upload file trực tiếp --- */}
            <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                <Upload size={15} />
                Upload ảnh trực tiếp từ máy
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                multiple
                onChange={handleFileSelect}
                className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFiles}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                {uploadingFiles ? (
                  <><RefreshCw size={14} className="animate-spin" /> Đang upload...</>
                ) : (
                  <><Upload size={14} /> Chọn ảnh (JPG, PNG, WEBP — tối đa 10MB/ảnh)</>
                )}
              </button>

              {/* Preview ảnh đã upload */}
              {form.uploaded_urls.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {form.uploaded_urls.map((url, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeUploadedUrl(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* --- Nhập URL --- */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                <Link2 size={15} />
                Hoặc dán link ảnh (Google Drive, Imgur...)
              </div>
              {form.image_urls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={e => updateImageUrl(i, e.target.value)}
                    placeholder="https://drive.google.com/uc?id=..."
                    className="input flex-1 text-sm" />
                  {form.image_urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageUrl(i)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
              {form.image_urls.length < 5 && (
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="text-sm text-secondary-600 dark:text-secondary-400 hover:underline flex items-center gap-1">
                  <Plus size={13} /> Thêm link ảnh
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button type="submit" disabled={saving === 'create' || uploadingFiles} className="btn-primary">
            <AlertTriangle size={15} />
            {saving === 'create' ? 'Đang lưu...' : 'Tạo báo cáo vi phạm'}
          </button>
        </div>
      </form>

      {/* ── Danh sách vi phạm ── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-semibold">Danh sách vi phạm</h3>
          {/* Filter nhóm */}
          <div className="flex items-center gap-2">
            <select
              value={listGroup}
              onChange={e => setListGroup(e.target.value)}
              className="input py-1 text-sm w-auto">
              <option value="">Tất cả nhóm</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <span className="text-xs text-gray-400">{listViolations.length} bản ghi</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {listViolations.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">Không có vi phạm nào</div>
          )}
          {listViolations.map(v => (
            <div key={v.id} className="flex items-start gap-3 px-5 py-3">
              <div className={`flex-shrink-0 mt-0.5 ${v.status === 'open' ? 'text-red-500' : 'text-emerald-500'}`}>
                <AlertTriangle size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{v.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {v.blocks?.name}
                  {' · '}
                  {format(new Date(v.reported_at), 'HH:mm — dd/MM/yyyy', { locale: vi })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Toggle trạng thái */}
                <button
                  onClick={() => toggleStatus(v)}
                  disabled={!!saving}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    v.status === 'open'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  {saving === v.id + '_toggle' ? '...' : v.status === 'open' ? '✓ Xử lý' : '↩ Mở lại'}
                </button>
                {/* Xóa */}
                <button
                  onClick={() => setConfirmDelete(v)}
                  disabled={!!saving}
                  title="Xóa vi phạm"
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40">
                  {saving === v.id + '_del'
                    ? <RefreshCw size={13} className="animate-spin" />
                    : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
