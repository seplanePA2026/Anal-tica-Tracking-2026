type Props = {
  onEnter: () => void
}

export function LoginScreen({ onEnter }: Props) {
  return (
    <div className="login-screen">
      <div className="login-aurora" aria-hidden="true" />
      <header className="login-top">
        <span className="login-wordmark">Analítica</span>
      </header>
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault()
          onEnter()
        }}
      >
        <h1>Entrar</h1>
        <p className="login-lead">Acesse o painel de pesquisas.</p>
        <button type="submit" className="login-submit">
          Entrar
        </button>
      </form>
    </div>
  )
}
