import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  role: 'intern' | 'lead' | 'admin'
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('uris_token'),
  user: (() => {
    try { return JSON.parse(localStorage.getItem('uris_user') || 'null') } catch { return null }
  })(),
  setAuth: (token, user) => {
    localStorage.setItem('uris_token', token)
    localStorage.setItem('uris_user', JSON.stringify(user))
    set({ token, user })
  },
  clearAuth: () => {
    localStorage.removeItem('uris_token')
    localStorage.removeItem('uris_user')
    set({ token: null, user: null })
  },
  isAdmin: () => {
    const u = get().user
    return u?.role === 'lead' || u?.role === 'admin'
  },
}))
