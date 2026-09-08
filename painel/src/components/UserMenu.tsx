import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { goLobby, goLogin, readUser } from '../session'

export function UserMenu() {
  const user = readUser()
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<'menu' | 'dados'>('menu')
  const [pos, setPos] = useState({ top: 0, right: 16 })
  const chipRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const initial = user.name.trim().charAt(0).toUpperCase() || 'U'

  const place = () => {
    const chip = chipRef.current
    if (!chip) return
    const r = chip.getBoundingClientRect()
    setPos({
      top: Math.round(r.bottom + 8),
      right: Math.round(Math.max(12, window.innerWidth - r.right)),
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
  }, [open, panel])

  useEffect(() => {
    if (!open) return
    const onWin = () => place()
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)

    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (chipRef.current?.contains(t) || popRef.current?.contains(t)) return
      setOpen(false)
      setPanel('menu')
    }
    const id = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointer)
    }, 0)

    return () => {
      window.clearTimeout(id)
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div className="user-menu-wrap">
      <button
        ref={chipRef}
        type="button"
        className={`user-chip${open ? ' on' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
          setPanel('menu')
        }}
      >
        <span className="user-avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="user-chip-name">{user.name}</span>
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              className="user-pop"
              role="menu"
              style={{ top: pos.top, right: pos.right }}
            >
              {panel === 'menu' ? (
                <>
                  <button type="button" role="menuitem" onClick={() => setPanel('dados')}>
                    Dados do usuário
                  </button>
                  <button type="button" role="menuitem" onClick={goLobby}>
                    Voltar ao lobby
                  </button>
                  <button type="button" role="menuitem" className="user-sair" onClick={goLogin}>
                    Sair
                  </button>
                </>
              ) : (
                <div className="user-dados">
                  <p className="kicker">Conta</p>
                  <h3>{user.name}</h3>
                  <dl>
                    <div>
                      <dt>E-mail</dt>
                      <dd>{user.email}</dd>
                    </div>
                    <div>
                      <dt>Perfil</dt>
                      <dd>{user.role}</dd>
                    </div>
                  </dl>
                  <button type="button" className="user-back" onClick={() => setPanel('menu')}>
                    Voltar
                  </button>
                </div>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
