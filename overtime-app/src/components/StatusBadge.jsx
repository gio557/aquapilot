import { STATUS_META } from '../utils.js'

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status, className: '' }
  return <span className={`badge ${meta.className}`}>{meta.label}</span>
}
