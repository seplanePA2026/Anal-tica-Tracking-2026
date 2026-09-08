export const SESSION_KEY = 'analitica-session'
export const USER_KEY = 'analitica-user'

export type SessionUser = {
  name: string
  email: string
  role: string
}

export const DEMO_USER: SessionUser = {
  name: 'Usuário',
  email: 'usuario@analitica.com',
  role: 'Analista',
}

export function hasSession() {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export function readUser(): SessionUser {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return DEMO_USER
    const parsed = JSON.parse(raw) as SessionUser
    if (!parsed?.name) return DEMO_USER
    return parsed
  } catch {
    return DEMO_USER
  }
}

export function startSession(user: SessionUser = DEMO_USER) {
  sessionStorage.setItem(SESSION_KEY, '1')
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function goLobby() {
  window.location.assign('/')
}

export function goLogin() {
  clearSession()
  window.location.assign('/')
}
