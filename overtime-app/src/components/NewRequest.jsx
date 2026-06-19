import { useState } from 'react'
import { createRequest } from '../data/api.js'
import { todayInput } from '../utils.js'

const HOUR_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4]

// Modulo di invio di una nuova richiesta di straordinario (vista dipendente).
export default function NewRequest({ user, onCreated, onCancel }) {
  const [date, setDate] = useState(todayInput())
  const [hours, setHours] = useState(1)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!date) return setError('Indica la data della giornata lavorativa.')
    if (!reason.trim()) return setError('Indica il motivo dello straordinario.')

    setSaving(true)
    try {
      await createRequest({ employeeId: user.id, date, hours, reason })
      onCreated()
    } catch (err) {
      setError(err.message || 'Errore durante l’invio.')
      setSaving(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2 className="section-title">Nuova richiesta</h2>

      <label className="field">
        <span>Giornata lavorativa</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>

      <label className="field">
        <span>Ore richieste</span>
        <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {Number.isInteger(h) ? h : h.toString().replace('.', ',')} ore
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Motivo</span>
        <textarea
          rows={3}
          value={reason}
          maxLength={300}
          placeholder="Es. completamento ordine urgente…"
          onChange={(e) => setReason(e.target.value)}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          Annulla
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Invio…' : 'Invia richiesta'}
        </button>
      </div>
    </form>
  )
}
