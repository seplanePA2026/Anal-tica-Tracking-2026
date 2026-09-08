import { useState, type FormEvent } from 'react'
import { authenticate, type SessionUser } from '../session'

type Props = {
  onEnter: (user: SessionUser) => void
}

export function LoginScreen({ onEnter }: Props) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const profile = authenticate(user, password)
    if (!profile) {
      setError('Usuário ou senha inválidos.')
      return
    }
    setError('')
    onEnter(profile)
  }

  return (
    <div className="login-screen">
      <div className="login-aurora" aria-hidden="true" />
      <header className="login-top">
        <span className="login-wordmark">Analítica</span>
      </header>
      <form className="login-card" onSubmit={submit}>
        <h1>Entrar</h1>
        <p className="login-lead">Acesse o painel de pesquisas.</p>
        <label className="login-field">
          Usuário ou e-mail
          <input
            type="text"
            autoComplete="username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="seu@email.com"
          />
        </label>
        <label className="login-field">
          Senha
          <span className="login-pass">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="eye-btn"
              aria-label={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 6c5 0 9 4.5 9.8 6-.5.9-2.2 3.4-5.1 4.7l1.4 1.4-1.4 1.4-12-12L6.1 6.1 7.5 7.5C8.9 6.6 10.4 6 12 6zm0 3.5c.3 0 .6 0 .8.1L9.6 12.8c0-.3-.1-.5-.1-.8A3.5 3.5 0 0 1 12 9.5zM3.7 5.1l2.5 2.5C4.4 8.8 2.8 10.9 2.2 12c.8 1.5 4.8 6 9.8 6 1.5 0 2.9-.4 4.1-1l2.4 2.4 1.4-1.4-16-16L3.7 5.1zM14.5 13.3 12.7 11.5A2 2 0 0 0 14.5 13.3z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 5c5 0 9.5 4.5 10.3 6.2-.8 1.7-5.3 6.3-10.3 6.3S2.5 12.9 1.7 11.2C2.5 9.5 7 5 12 5zm0 2.5A3.5 3.5 0 1 0 15.5 11 3.5 3.5 0 0 0 12 7.5zM12 9a2 2 0 1 1-2 2 2 2 0 0 1 2-2z"
                  />
                </svg>
              )}
            </button>
          </span>
        </label>
        {error ? <p className="login-error">{error}</p> : null}
        <button type="submit" className="login-submit">
          Entrar
        </button>
      </form>
    </div>
  )
}
