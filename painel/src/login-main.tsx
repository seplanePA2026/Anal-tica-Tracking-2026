import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LoginScreen } from './screens/LoginScreen'
import { PesquisasScreen } from './screens/PesquisasScreen'
import { hasSession, startSession, type SessionUser } from './session'

function Gate() {
  const [screen, setScreen] = useState<'login' | 'pesquisas'>(
    hasSession() ? 'pesquisas' : 'login',
  )
  const [fade, setFade] = useState(false)

  const go = (next: 'pesquisas' | 'painel', user?: SessionUser) => {
    setFade(true)
    window.setTimeout(() => {
      if (next === 'painel') {
        window.location.assign('/painel.html')
        return
      }
      if (user) startSession(user)
      setScreen('pesquisas')
      setFade(false)
    }, 420)
  }

  return (
    <div className={`gate${fade ? ' is-out' : ''}`}>
      {screen === 'login' ? (
        <LoginScreen onEnter={(user) => go('pesquisas', user)} />
      ) : (
        <PesquisasScreen onOpen={() => go('painel')} />
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gate />
  </StrictMode>,
)
