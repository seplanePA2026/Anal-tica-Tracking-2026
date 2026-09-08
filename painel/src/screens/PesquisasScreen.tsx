type Props = {
  onOpen: () => void
}

export function PesquisasScreen({ onOpen }: Props) {
  return (
    <div className="pesquisas-screen">
      <header className="login-top">
        <span className="login-wordmark">Analítica</span>
      </header>
      <section className="pesquisas-wrap">
        <p className="kicker pesquisas-kicker">Pesquisas</p>
        <h1>Selecione a pesquisa</h1>
        <button type="button" className="pesquisa-card" onClick={onOpen}>
          <span className="pesquisa-tag">Bahia · 2026</span>
          <strong>Questionário Codificado Tracking Bahia 1 2026</strong>
          <span className="pesquisa-meta">Tracking estadual · 6 e 7 de setembro</span>
        </button>
      </section>
    </div>
  )
}
