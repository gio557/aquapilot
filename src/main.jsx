import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ControlRoomPage from './components/ControlRoomPage.jsx'

const isControlRoom = new URLSearchParams(window.location.search).get('view') === 'controlroom'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isControlRoom ? <ControlRoomPage /> : <App />}
  </StrictMode>,
)
