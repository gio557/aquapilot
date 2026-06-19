import { initials } from '../utils.js'

export default function Header({ user, onLogout }) {
  const roleLabel = user.role === 'manager' ? 'Manager' : 'Dipendente'
  return (
    <header className="app-header">
      <div className="app-brandbar">
        <img className="app-logo" src="./greeneco-logo.jpeg" alt="greeneco wastewater" />
      </div>
      <div className="app-userbar">
        <div className="app-header-user">
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <div className="app-header-name">{user.name}</div>
            <div className="app-header-role">
              {roleLabel} · {user.department}
            </div>
          </div>
        </div>
        <button className="btn-ghost" onClick={onLogout} aria-label="Esci">
          Esci
        </button>
      </div>
    </header>
  )
}
