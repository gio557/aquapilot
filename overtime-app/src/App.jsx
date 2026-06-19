import { useEffect, useState } from 'react'
import { login } from './data/api.js'
import Login from './components/Login.jsx'
import Header from './components/Header.jsx'
import EmployeeHome from './components/EmployeeHome.jsx'
import ManagerHome from './components/ManagerHome.jsx'

const SESSION_KEY = 'straordinari_session'

export default function App() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  // Ripristina la sessione precedente all'avvio dell'app.
  useEffect(() => {
    const savedId = localStorage.getItem(SESSION_KEY)
    if (savedId) {
      login(savedId)
        .then(setUser)
        .catch(() => localStorage.removeItem(SESSION_KEY))
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

  async function handleLogin(userId) {
    const u = await login(userId)
    localStorage.setItem(SESSION_KEY, u.id)
    setUser(u)
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  if (!ready) return null

  if (!user) return <Login onLogin={handleLogin} />

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} />
      {user.role === 'manager' ? (
        <ManagerHome user={user} />
      ) : (
        <EmployeeHome user={user} />
      )}
    </div>
  )
}
