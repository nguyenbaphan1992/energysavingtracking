import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { AlertTriangle, CheckCircle, Clock, Image, Filter } from 'lucide-react'

export default function Violations() {
  const [violations, setViolations] = useState([])
  const [images, setImages] = useState({})
  const [blocks, setBlocks] = useState([])
  const [filter, setFilter] = useState('all') // all | open | resolved
  const [blockFilter, setBlockFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('violations').select('*').order('reported_at', { ascending: false }),
      supabase.from('violation_images').select('*'),
      supabase.from('blocks').select('*').order('sort_order'),
    ]).then(([v, imgs, b]) => {
      setViolations(v.data || [])
      const imgMap = {}
      ;(imgs.data || []).forEach(img => {
        if (!imgMap[img.violation_id]) imgMap[img.violation_id] = []
        imgMap[img.violation_id].push(img)
      })
      setImages(imgMap)
      setBlocks(b.data || [])
      setLoading(false)
    })
  }, [])

  const filtered = violations.filter(v => {
    if (filter !== 'all' && v.status !== filter) return false
    if (blockFilter !== 'all' && v.block_id !== blockFilter) return false
    return true
  })

  const getBlockName = (id) => blocks.find(b => b.id === id)?.name || 'Không rõ'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Đang tải...</div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Báo cáo <span className="gradient-text">Vi phạm</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Các vi phạm tiết kiệm năng lượng tại hiện trường
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">
            {violations.filter(v => v.status === 'open').length} chưa xử lý
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">
            {violations.filter(v => v.status === 'resolved').length} đã xử lý
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={15} className="text-gray-400" />
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {[['all','Tất cả'],['open','Chưa xử lý'],['resolved','Đã xử lý']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors
                ${filter === v ? 'gradient-bg text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {l}
            </button>
          ))}
        </div>
        <select value={blockFilter} onChange={e => setBlockFilter(e.target.value)}
          className="input text-sm py-1.5 w-auto">
          <option value="all">Tất cả khu vực</option>
          {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 dark:text-gray-600">
          <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p>Không có vi phạm nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => {
            const imgs = images[v.id] || []
            const isOpen = v.status === 'open'
            const isExpanded = expanded === v.id
            return (
              <div key={v.id} className={`card border-l-4 transition-all
                ${isOpen ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                <div className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : v.id)}>
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 flex-shrink-0 ${isOpen ? 'text-red-500' : 'text-emerald-500'}`}>
                      {isOpen ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${isOpen
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                          {isOpen ? 'Chưa xử lý' : 'Đã xử lý'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {getBlockName(v.block_id)}
                        </span>
                        {imgs.length > 0 && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Image size={12} />{imgs.length} ảnh
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                        {v.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                      <Clock size={12} />
                      {format(new Date(v.reported_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{v.reporter_name}</div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 animate-fade-in">
                    {v.action_taken && (
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Hành động khắc phục</div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{v.action_taken}</p>
                      </div>
                    )}
                    {imgs.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Ảnh hiện trường</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {imgs.map(img => (
                            <a key={img.id} href={img.image_url} target="_blank" rel="noopener noreferrer">
                              <img src={img.image_url} alt="Vi phạm"
                                className="w-full h-28 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
