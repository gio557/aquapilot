import { useEffect, useState } from 'react'
import { listUsers } from '../data/api.js'
import { initials } from '../utils.js'

// Schermata di accesso del prototipo: si sceglie un utente demo.
// Nella versione finale qui ci sarà il login con email e password (Supabase Auth).
export default function Login({ onLogin }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listUsers().then((u) => {
      setUsers(u)
      setLoading(false)
    })
  }, [])

  const managers = users.filter((u) => u.role === 'manager')
  const employees = users.filter((u) => u.role === 'employee')

  return (
    <div className="login">
      <div className="login-brand">
        <img className="login-logo" src="./greeneco-logo.jpeg" alt="greeneco wastewater" />
        <h1>Gestione Straordinari</h1>
        <p>Richieste di ore straordinarie</p>
      </div>

      {loading ? (
        <p className="muted center">Caricamento…</p>
      ) : (
        <>
          <p className="login-hint">
            Demo: scegli con quale profilo accedere.
          </p>

          <UserGroup title="Manager" users={managers} onLogin={onLogin} />
          <UserGroup title="Dipendenti" users={employees} onLogin={onLogin} />
        </>
      )}
    </div>
  )
}

function UserGroup({ title, users, onLogin }) {
  return (
    <section className="login-group">
      <h2 className="section-title">{title}</h2>
      <div className="login-list">
        {users.map((u) => (
          <button key={u.id} className="user-card" onClick={() => onLogin(u.id)}>
            <span className="avatar">{initials(u.name)}</span>
            <span className="user-card-text">
              <span className="user-card-name">{u.name}</span>
              <span className="user-card-sub">{u.department}</span>
            </span>
            <span className="user-card-arrow" aria-hidden>›</span>
          </button>
        ))}
      </div>
    </section>
  )
}
