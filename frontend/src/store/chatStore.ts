import { create } from 'zustand'
import api from '../services/api'
import { getSocket } from '../services/socket.service'

interface ChatStore {
  unreadCounts: Record<string, number>
  totalUnread: number
  init: () => Promise<void>
  handleSocketNewMessage: (data: { message: { chatId: string; senderId: string } }) => void
  handleNewMessage: (chatId: string, senderId: string, currentUserId?: string) => void
  handleChatRead: (chatId: string) => void
  clear: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  unreadCounts: {},
  totalUnread: 0,

  init: async () => {
    try {
      const res = await api.get<{ success: boolean; data: { chats?: Array<{ id: string; unreadCount: number }> } | Array<{ id: string; unreadCount: number }> }>('/chat/chats')
      
      const raw = res.data.data
      const chats = Array.isArray(raw) ? raw : (raw?.chats ?? [])
      
      const newCounts: Record<string, number> = {}
      let newTotal = 0
      
      const socket = getSocket()
      
      chats.forEach(c => {
        newCounts[c.id] = c.unreadCount
        newTotal += c.unreadCount
        // Ensure we are joined to these rooms to receive new messages globally
        if (socket) {
          socket.emit('chat:join', { chatId: c.id })
        }
      })
      
      set({ unreadCounts: newCounts, totalUnread: newTotal })
      
      if (socket) {
        socket.off('newMessage', get().handleSocketNewMessage)
        socket.on('newMessage', get().handleSocketNewMessage)
      }
    } catch (err) {
      console.error('Failed to init chat store', err)
    }
  },

  handleSocketNewMessage: (data: { message: { chatId: string; senderId: string } }) => {
    // Current user's id is needed to know if we should increment unread.
    // We'll read it from authStore below (or pass it dynamically)
    import('./authStore').then(({ useAuthStore }) => {
      const currentUserId = useAuthStore.getState().user?.id
      get().handleNewMessage(data.message.chatId, data.message.senderId, currentUserId)
    })
  },

  handleNewMessage: (chatId, senderId, currentUserId) => {
    if (senderId === currentUserId) return

    set(state => {
      const currentCount = state.unreadCounts[chatId] || 0
      const nextCounts = { ...state.unreadCounts, [chatId]: currentCount + 1 }
      const nextTotal = Object.values(nextCounts).reduce((a, b) => a + b, 0)
      return { unreadCounts: nextCounts, totalUnread: nextTotal }
    })
  },

  handleChatRead: (chatId) => {
    set(state => {
      if (!state.unreadCounts[chatId]) return state
      const nextCounts = { ...state.unreadCounts, [chatId]: 0 }
      const nextTotal = Object.values(nextCounts).reduce((a, b) => a + b, 0)
      return { unreadCounts: nextCounts, totalUnread: nextTotal }
    })
  },

  clear: () => set({ unreadCounts: {}, totalUnread: 0 })
}))
