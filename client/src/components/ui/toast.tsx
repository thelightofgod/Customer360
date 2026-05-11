import { useEffect, useState, useRef } from 'react'
import { _setToastListener } from '@/lib/toast'
import { CheckCircle2, XCircle } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error'
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  useEffect(() => {
    _setToastListener((message, type) => {
      const id = ++counter.current
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
    })
    return () => _setToastListener(() => {})
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const hex = t.type === 'success' ? '#2ed896' : '#f26464'
        const Icon = t.type === 'success' ? CheckCircle2 : XCircle
        return (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-[14px] pointer-events-auto"
            style={{
              background: 'rgba(28, 36, 64, 0.97)',
              border: `1px solid ${hex}40`,
              backdropFilter: 'blur(20px)',
              boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px ${hex}12, 0 0 20px ${hex}15`,
              animation: 'toast-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
              minWidth: '220px',
              maxWidth: '340px',
            }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: hex }} />
            <span className="text-sm font-medium text-[var(--t1)]">{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
