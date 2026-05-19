/**
 * mobileNavStore — tiny shared state for the mobile sidebar drawer.
 *
 * The Navbar hamburger button sets `open = true`.
 * The Sidebar drawer reads `open` and renders itself.
 * Any nav link click or backdrop tap calls `close()`.
 */

import { create } from 'zustand'

interface MobileNavState {
  open:   boolean
  toggle: () => void
  close:  () => void
}

export const useMobileNavStore = create<MobileNavState>((set) => ({
  open:   false,
  toggle: () => set(s => ({ open: !s.open })),
  close:  () => set({ open: false }),
}))
