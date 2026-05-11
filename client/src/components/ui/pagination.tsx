import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
}

function getPageNumbers(current: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', totalPages]
  if (current >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  return [1, '...', current - 1, current, current + 1, '...', totalPages]
}

export default function Pagination({ page, total, limit, onChange }: Props) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const pages = getPageNumbers(page, totalPages)

  const btnBase = 'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-150 cursor-pointer select-none'

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <span className="text-[11px] text-[var(--t4)] font-mono tabular-nums">
        {from}–{to} / {total}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={`${btnBase} text-[var(--t4)] disabled:opacity-25 disabled:cursor-not-allowed hover:enabled:bg-[var(--bg3)] hover:enabled:text-[var(--t1)]`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-[var(--t4)] text-xs select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={btnBase}
              style={p === page ? {
                background: 'linear-gradient(135deg, var(--blue), #3a7ff5)',
                color: 'white',
                boxShadow: '0 3px 10px rgba(91, 158, 255, 0.35)',
              } : { color: 'var(--t3)' }}
              onMouseEnter={e => { if (p !== page) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg3)' }}
              onMouseLeave={e => { if (p !== page) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} text-[var(--t4)] disabled:opacity-25 disabled:cursor-not-allowed hover:enabled:bg-[var(--bg3)] hover:enabled:text-[var(--t1)]`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
