import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Eye, EyeOff, GripVertical, Save, CheckCircle, AlertCircle, Upload } from 'lucide-react'

export default function SlideshowManager() {
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ image_url: '', caption: '' })
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState(null)

  const load = () =>
    supabase.from('finding_slides').select('*').order('sort_order').then(({ data }) => {
      setSlides(data || [])
      setLoading(false)
    })

  useEffect(() => { load() }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAdd = async () => {
    if (!form.image_url.trim()) return
    setAdding(true)
    const maxOrder = Math.max(0, ...slides.map(s => s.sort_order))
    const { error } = await supabase.from('finding_slides').insert({
      image_url: form.image_url.trim(),
      caption: form.caption.trim(),
      sort_order: maxOrder + 1,
      is_active: true,
    })
    setAdding(false)
    if (error) showToast('Lỗi: ' + error.message, 'error')
    else { showToast('Đã thêm slide!'); setForm({ image_url: '', caption: '' }); load() }
  }

  const toggleActive = async (slide) => {
    await supabase.from('finding_slides').update({ is_active: !slide.is_active }).eq('id', slide.id)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa slide này?')) return
    await supabase.from('finding_slides').delete().eq('id', id)
    showToast('Đã xóa slide')
    load()
  }

  const updateCaption = async (id, caption) => {
    await supabase.from('finding_slides').update({ caption }).eq('id', id)
    load()
  }

  if (loading) return <div className="flex items-center justify-center p-20 text-gray-400">Đang tải...</div>

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý <span className="gradient-text">Slideshow Findings</span></h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Ảnh findings hiển thị trên dashboard. Tự động chuyển 3 giây.</p>
      </div>

      {/* Add form */}
      <div className="card space-y-3">
        <h3 className="font-semibold">Thêm slide mới</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">URL ảnh <span className="text-red-400">*</span></label>
            <input type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
              placeholder="https://..." className="input" />
            <p className="text-xs text-gray-400 mt-1">Dán link ảnh từ Google Drive, OneDrive, Imgur...</p>
          </div>
          <div>
            <label className="label">Caption (chú thích)</label>
            <input type="text" value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
              placeholder="Mô tả ngắn về ảnh..." className="input" />
          </div>
        </div>
        {form.image_url && (
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-h-40">
            <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover"
              onError={e => e.target.style.display = 'none'} />
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={handleAdd} disabled={adding || !form.image_url.trim()} className="btn-primary">
            <Plus size={16} /> {adding ? 'Đang thêm...' : 'Thêm slide'}
          </button>
        </div>
      </div>

      {/* Slides list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold">{slides.length} slide — {slides.filter(s => s.is_active).length} đang hiển thị</h3>
        </div>
        {slides.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Chưa có slide nào.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {slides.map((slide, i) => (
              <div key={slide.id} className={`flex items-center gap-3 p-4 transition-colors ${!slide.is_active ? 'opacity-50' : ''}`}>
                <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">
                  <GripVertical size={16} />
                </span>
                <img src={slide.image_url} alt={slide.caption}
                  className="w-20 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-100 dark:bg-gray-800"
                  onError={e => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70"><rect fill="%23e5e7eb" width="100" height="70"/><text x="50" y="38" text-anchor="middle" fill="%239ca3af" font-size="10">Lỗi ảnh</text></svg>' }} />
                <div className="flex-1 min-w-0">
                  <input type="text" defaultValue={slide.caption || ''}
                    onBlur={e => updateCaption(slide.id, e.target.value)}
                    placeholder="Chú thích..."
                    className="input py-1 text-sm" />
                  <p className="text-xs text-gray-400 mt-1 truncate">{slide.image_url}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(slide)}
                    className={`p-2 rounded-lg transition-colors ${slide.is_active ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title={slide.is_active ? 'Ẩn slide' : 'Hiện slide'}>
                    {slide.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => handleDelete(slide.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
