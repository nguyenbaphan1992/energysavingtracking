import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function FindingSlideshow() {
  const [slides, setSlides] = useState([])
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    supabase
      .from('finding_slides')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => { if (data?.length) setSlides(data) })
  }, [])

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), [slides.length])
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), [slides.length])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const id = setInterval(next, 3000)
    return () => clearInterval(id)
  }, [paused, next, slides.length])

  if (slides.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center h-52 gap-3 text-gray-400 dark:text-gray-600">
        <Camera size={36} className="opacity-40" />
        <p className="text-sm">Chưa có ảnh findings. Admin hãy upload ảnh.</p>
      </div>
    )
  }

  return (
    <div className="card p-0 overflow-hidden relative group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>
      {/* Image */}
      <div className="relative aspect-[16/7] bg-gray-900">
        <img
          key={current}
          src={slides[current].image_url}
          alt={slides[current].caption || 'Finding'}
          className="w-full h-full object-cover slide-enter"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {/* Caption */}
        {slides[current].caption && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white text-sm font-medium">{slides[current].caption}</p>
          </div>
        )}
        {/* Header badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-white gradient-bg shadow">
            🔍 Findings hiện trường
          </span>
        </div>
      </div>

      {/* Controls */}
      {slides.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft size={18} />
          </button>
          <button onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={18} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 right-3 flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
