// Funzioni di supporto per formattazione in italiano.

const DATE_FMT = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const DATETIME_FMT = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(isoDate) {
  if (!isoDate) return '—'
  return DATE_FMT.format(new Date(isoDate))
}

export function formatDateTime(isoDateTime) {
  if (!isoDateTime) return '—'
  return DATETIME_FMT.format(new Date(isoDateTime))
}

export function formatHours(hours) {
  const n = Number(hours)
  const label = Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
  return `${label} ${n === 1 ? 'ora' : 'ore'}`
}

export const STATUS_META = {
  pending: { label: 'In attesa', className: 'badge-pending' },
  approved: { label: 'Approvata', className: 'badge-approved' },
  rejected: { label: 'Rifiutata', className: 'badge-rejected' },
}

// Data odierna in formato YYYY-MM-DD per gli input di tipo date.
export function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

export function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
