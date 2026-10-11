const tzsFmt = new Intl.NumberFormat('en-US')

/** Prices are always shown in TZS (brand rule). */
export const tzs = (n: number) => `TZS ${tzsFmt.format(Math.round(n))}`

/** Compact money for stat tiles: TZS 1.2M, TZS 850K. */
export function tzsShort(n: number) {
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `TZS ${Math.round(n / 1_000)}K`
  return `TZS ${n}`
}

export const num = (n: number) => tzsFmt.format(n)

export const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 0) {
    const f = -s
    if (f < 3600) return `in ${Math.max(1, Math.round(f / 60))} min`
    if (f < 86400) return `in ${Math.round(f / 3600)} h`
    return `in ${Math.round(f / 86400)} d`
  }
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`
  return date(iso)
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('')

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
