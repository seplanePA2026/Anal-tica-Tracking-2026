import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LoginScreen } from './screens/LoginScreen'
import { PesquisasScreen } from './screens/PesquisasScreen'
import { hasSession, startSession } from './session'

function Gate() {
  const [screen, setScreen] = useState<'login' | 'pesquisas'>(
    hasSession() ? 'pesquisas' : 'login',
  )
  const [fade, setFade] = useState(false)

  const go = (next: 'pesquisas' | 'painel') => {
    setFade(true)
    window.setTimeout(() => {
      if (next === 'painel') {
        window.location.assign('/painel.html')
        return
      }
      startSession()
      setScreen('pesquisas')
      setFade(false)
    }, 420)
  }

  return (
    <div className={`gate${fade ? ' is-out' : ''}`}>
      {screen === 'login' ? (
        <LoginScreen onEnter={() => go('pesquisas')} />
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
