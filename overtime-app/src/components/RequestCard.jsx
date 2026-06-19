import StatusBadge from './StatusBadge.jsx'
import { formatDate, formatHours, formatDateTime } from '../utils.js'

// Scheda di una richiesta di straordinario.
// - showEmployee: mostra il nome del dipendente (vista manager)
// - children: eventuali pulsanti azione (es. Approva/Rifiuta)
export default function RequestCard({ request, employeeName, showEmployee, children }) {
  return (
    <article className="card request-card">
      <div className="request-card-top">
        <div>
          {showEmployee && <div className="request-employee">{employeeName}</div>}
          <div className="request-date">{formatDate(request.date)}</div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="request-hours">{formatHours(request.hours)}</div>
      <p className="request-reason">{request.reason}</p>

      {request.status !== 'pending' && request.decisionNote && (
        <p className="request-note">
          <strong>Nota del manager:</strong> {request.decisionNote}
        </p>
      )}

      <div className="request-meta">
        Inviata il {formatDateTime(request.createdAt)}
        {request.decidedAt && ` · Decisa il ${formatDateTime(request.decidedAt)}`}
      </div>

      {children}
    </article>
  )
}
