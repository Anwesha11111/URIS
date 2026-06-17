import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, selectToken, selectUser } from '../store/authStore'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import api from '../services/api'
import { MessageSquare, Users, Plus, Search, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { getSocket } from '../services/socket.service'

interface Chat {
  id: string
  type: 'PRIVATE' | 'GROUP'
  name?: string
  // Resolved for PRIVATE chats — the other participant's details (BUG-M2 fix)
  otherParticipant?: { id: string; name: string; email: string } | null
  unreadCount: number
  createdAt: string
  lastMessage?: {
    content: string
    senderId: string
    senderName?: string
    createdAt: string
  }
}

interface Friend {
  id: string
  name: string
  email: string
}

export default function ChatPage() {
  const token = useAuthStore(selectToken)
  const user  = useAuthStore(selectUser)
  const nav = useNavigate()

  const [chats, setChats] = useState<Chat[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')

  // Track which chat rooms the list page has joined so we can leave them on unmount.
  const joinedRoomsRef = useRef<string[]>([])

  useEffect(() => {
    if (!token) { nav('/login'); return }
    void loadData()
  }, [token, nav])

  const loadData = async () => {
    try {
      setLoading(true)
      const [chatsRes, friendsRes, requestsRes] = await Promise.all([
        api.get('/chat/chats').catch(() => ({ data: { data: [] } })),
        api.get('/chat/friends').catch(() => ({ data: { data: [] } })),
        api.get('/chat/friend-requests').catch(() => ({ data: { data: [] } })),
      ])
      const loadedChats = Array.isArray(chatsRes.data?.data) ? chatsRes.data.data : []
      setChats(loadedChats)
      setFriends(Array.isArray(friendsRes.data?.data) ? friendsRes.data.data : [])
      // Count only PENDING incoming requests for the badge
      const allRequests: { status: string }[] = Array.isArray(requestsRes.data?.data)
        ? requestsRes.data.data
        : []
      setPendingCount(allRequests.filter(r => r.status === 'PENDING').length)

      // HIGH-2 fix: join all the user's chat rooms on the shared socket so
      // newMessage events are delivered to this page without a full reload.
      const socket = getSocket()
      if (socket && loadedChats.length > 0) {
        // Leave any previously joined rooms first (handles loadData being called again)
        for (const id of joinedRoomsRef.current) socket.emit('chat:leave', { chatId: id })
        joinedRoomsRef.current = loadedChats.map((c: Chat) => c.id)
        for (const id of joinedRoomsRef.current) socket.emit('chat:join', { chatId: id })
      }
    } catch (err) {
      setError('Failed to load chats')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // HIGH-2 fix: subscribe to newMessage on the shared socket.
  // Updates lastMessage preview, increments unreadCount, and re-sorts the list
  // in real-time whenever a message arrives in any of the user's conversations.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNewMessage = (data: {
      message: { id: string; chatId: string; senderId: string; content: string; createdAt: string; sender?: { name: string } }
      chatId: string
    }) => {
      setChats(prev => {
        const updated = prev.map(chat => {
          if (chat.id !== data.chatId) return chat
          const isCurrentUser = data.message.senderId === user?.id
          return {
            ...chat,
            lastMessage: {
              content:    data.message.content,
              senderId:   data.message.senderId,
              senderName: data.message.sender?.name,
              createdAt:  data.message.createdAt,
            },
            // Only increment unread for messages from others — own messages
            // are not unread. The badge clears when the user opens the chat.
            unreadCount: isCurrentUser ? chat.unreadCount : chat.unreadCount + 1,
          }
        })
        // Re-sort: most recently active conversation floats to the top
        return [...updated].sort((a, b) => {
          const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime()
          const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime()
          return bTime - aTime
        })
      })
    }

    socket.on('newMessage', handleNewMessage)

    return () => {
      socket.off('newMessage', handleNewMessage)
      // Leave all chat rooms the list page joined when unmounting
      const s = getSocket()
      if (s) {
        for (const id of joinedRoomsRef.current) s.emit('chat:leave', { chatId: id })
      }
      joinedRoomsRef.current = []
    }
  }, [user?.id])

  // Create private chat and navigate straight into it
  const handleCreatePrivateChat = async (friendId: string) => {
    try {
      const res = await api.post<{ success: boolean; data: { id: string } }>(
        `/chat/private/${friendId}`
      )
      nav(`/chat/${res.data.data.id}`)
    } catch (err) {
      setError('Failed to create chat')
      console.error(err)
    }
  }

  // Navigate into a chat and mark it as read immediately
  const handleOpenChat = async (chatId: string) => {
    // Fire-and-forget — mark as read before navigating so the badge clears
    api.patch(`/chat/chats/${chatId}/read`).catch(() => {})
    // Optimistic: clear unread badge locally so it disappears immediately
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c))
    nav(`/chat/${chatId}`)
  }

  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true
    const chatName = chat.name?.toLowerCase() || ''
    const lastMsg  = chat.lastMessage?.content?.toLowerCase() || ''
    return chatName.includes(searchTerm.toLowerCase()) || lastMsg.includes(searchTerm.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="md:ml-52 pt-14 min-h-screen relative z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">COMMUNICATION</p>
            <h1 className="font-display font-black text-3xl text-ice-gradient">Chat</h1>
            <div className="gold-rule w-14 mt-2" />
            <p className="font-body text-sm text-ice/40 mt-3">
              Private messages and group conversations
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

            {/* ── Chat list ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="lg:col-span-2 glass-card rounded-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="nav-label text-[0.6rem] text-gold/60 mb-1">CONVERSATIONS</p>
                  <h2 className="font-display text-xl text-ice">Your active chats</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => nav('/chat/find')}
                    className="btn-outline px-3 py-1.5 rounded-sm text-[0.55rem] flex items-center gap-1">
                    <Search size={12} />
                    FIND PEOPLE
                  </button>
                  <button onClick={() => nav('/chat/requests')}
                    className="btn-outline px-3 py-1.5 rounded-sm text-[0.55rem] flex items-center gap-1 relative">
                    <MessageSquare size={12} />
                    REQUESTS
                    {pendingCount > 0 && (
                      <span className="ml-1 rounded-full px-1.5 text-[0.45rem]"
                        style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                        {pendingCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <input type="text" placeholder="Search chats..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="uris-input w-full" />
              </div>

              {loading ? (
                <p className="text-sm text-ice/40">Loading chats...</p>
              ) : error ? (
                <p className="text-sm text-red-400/70">{error}</p>
              ) : filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="mb-4 h-12 w-12 text-ice/30" />
                  <p className="text-sm text-ice/40">No conversations yet</p>
                  <p className="mt-2 text-xs text-ice/30">Start by finding people to chat with</p>
                  <button onClick={() => nav('/chat/find')}
                    className="btn-outline px-4 py-1.5 rounded-sm text-[0.55rem] mt-4">
                    FIND PEOPLE
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredChats.map(chat => (
                    <motion.button
                      key={chat.id}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => void handleOpenChat(chat.id)}
                      className="w-full flex items-center justify-between rounded-sm border border-gold/10 bg-navy-900/40 p-4 hover:bg-navy-900/60 transition-colors text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
                          style={{ background: 'rgba(201,168,76,0.1)' }}>
                          {chat.type === 'PRIVATE'
                            ? <MessageSquare className="h-5 w-5 text-gold" />
                            : <Users className="h-5 w-5 text-gold" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-body font-semibold text-ice truncate">
                            {chat.type === 'PRIVATE'
                              ? (chat.otherParticipant?.name ?? chat.otherParticipant?.email ?? 'Private Chat')
                              : (chat.name ?? 'Group Chat')}
                          </p>
                          {chat.lastMessage ? (
                            <p className="text-[0.55rem] text-ice/40 truncate max-w-[240px]">
                              {chat.lastMessage.senderName
                                ? `${chat.lastMessage.senderName}: `
                                : ''}
                              {chat.lastMessage.content}
                            </p>
                          ) : (
                            <p className="text-[0.5rem] text-ice/25 italic">No messages yet</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {/* Unread badge */}
                        {chat.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full flex items-center justify-center nav-label text-[0.45rem] font-bold"
                            style={{ background: '#c9a84c', color: '#0d0f1c' }}>
                            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                          </span>
                        )}
                        <span className="text-[0.5rem] text-ice/30">
                          {chat.lastMessage
                            ? new Date(chat.lastMessage.createdAt).toLocaleDateString()
                            : new Date(chat.createdAt).toLocaleDateString()}
                        </span>
                        <ChevronRight size={13} className="text-ice/20" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* ── Quick actions ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="lg:col-span-1 glass-card rounded-sm p-6">
              <p className="nav-label text-[0.6rem] text-gold/60 mb-4">QUICK ACTIONS</p>

              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="nav-label text-[0.55rem] text-gold/40">START PRIVATE CHAT</p>
                  {loading ? (
                    <p className="text-sm text-ice/40">Loading friends...</p>
                  ) : friends.length === 0 ? (
                    <p className="text-sm text-ice/40">No friends yet. Add people to chat.</p>
                  ) : (
                    <div className="space-y-2">
                      {friends.map(friend => (
                        <button key={friend.id}
                          onClick={() => void handleCreatePrivateChat(friend.id)}
                          className="btn-outline w-full px-3 py-2 rounded-sm text-[0.55rem] flex items-center gap-2 text-left">
                          <MessageSquare size={12} />
                          {friend.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-gold/10">
                  <p className="nav-label text-[0.55rem] text-gold/40">CREATE GROUP CHAT</p>
                  <button onClick={() => nav('/chat/find')}
                    className="btn-outline w-full px-3 py-2 rounded-sm text-[0.55rem] flex items-center gap-2 justify-center">
                    <Plus size={12} />
                    CREATE GROUP
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
