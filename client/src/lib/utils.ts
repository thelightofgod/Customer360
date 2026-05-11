import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / 86400000)
}

export function fmtCurrency(n: number | null | undefined): string {
  if (n == null || n === 0) return '—'
  return '€' + n.toLocaleString('de-DE')
}

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function licenseModelVariant(model: string | null): 'blue' | 'amber' | 'purple' | 'muted' {
  if (model === 'Subscription') return 'blue'
  if (model === 'Maintenance') return 'amber'
  if (model === 'Mixed') return 'purple'
  return 'muted'
}

export function tierVariant(tier: string): 'purple' | 'blue' | 'green' | 'muted' {
  switch (tier) {
    case 'Strategic': return 'purple'
    case 'Growth': return 'blue'
    case 'Core': return 'green'
    default: return 'muted'
  }
}

export function priorityColor(p: string): string {
  return p === 'High' ? 'var(--red)' : p === 'Medium' ? 'var(--amber)' : 'var(--blue)'
}

export function statusVariant(s: string): 'green' | 'amber' | 'blue' {
  return s === 'Resolved' ? 'green' : s === 'In Progress' ? 'amber' : 'blue'
}

export function slaVariant(s: string): 'green' | 'blue' | 'red' {
  return s === 'Met' ? 'green' : s === 'On Track' ? 'blue' : 'red'
}

export function categoryVariant(c: string): 'blue' | 'cyan' | 'purple' | 'amber' | 'green' {
  switch (c) {
    case 'License': return 'blue'
    case 'Capacity': return 'cyan'
    case 'Add-on': return 'purple'
    case 'Data': return 'amber'
    default: return 'green'
  }
}

export function groupIcon(g: string): string {
  return g === 'Qlik Cloud' ? '☁️' : g === 'Talend' ? '🔄' : '🛠️'
}

export function pctElapsed(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  const n = new Date().getTime()
  return Math.min(100, Math.max(0, ((n - a) / (b - a)) * 100))
}
