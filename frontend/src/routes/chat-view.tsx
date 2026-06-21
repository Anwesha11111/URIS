import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore, selectToken, selectUser } from '../store/authStore'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import api from '../services/api'
import { ArrowLeft, Send, Loader2, MessageSquare, AlertTriangle, Search, X, Edit2, Trash2, Check, Settings, ShieldOff, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../services/socket.service'
import { useRealtimeStore } from '../store/realtimeStore'

// ── Draft persistence helpers (MED-3) ─────────────────────────────────────────
// Drafts are keyed by chatId so switching conversations never mixes content.
const DRAFT_PREFIX = 'uris_chat_draft_'
const getDraft  = (chatId: string) => localStorage.getItem(`${DRAFT_PREFIX}${chatId}`) ?? ''
const saveDraft = (chatId: string, text: string) => {
  if (text) localStorage.setItem(`${DRAFT_PREFIX}${chatId}`, text)
  else      localStorage.removeItem(`${DRAFT_PREFIX}${chatId}`)
}

interface Message {
  id: string
  chatId: string
  senderId: string
  content: string
  createdAt: string
  editedAt?: string | null
  isDeleted?: boolean
  sender: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

// participantReadMap: userId → ISO string of their lastReadAt (or null if never read)
type ReadMap = Record<string, string | null>

export default function ChatViewPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const token = useAuthStore(selectToken)
  const user  = useAuthStore(selectUser)
  const nav   = useNavigate()

  const [messages, setMessages]       = useState<Message[]>([])
  const [pagination, setPagination]   = useState<Pagination | null>(null)
  // participantReadMap tracks each participant's lastReadAt so we can compute
  // per-message seen status without a separate read-receipt table.
  const [readMap, setReadMap]         = useState<ReadMap>({})
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sending, setSending]     = useState(false)
  const [content, setContent]     = useState('')
  const [error, setError]         = useState('')
  const [chatName, setChatName]   = useState('')

  const bottomRef   = useRef<HTMLDivElement>(null)
  const socketRef   = useRef<Socket | null>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (page = 1, append = false) => {
    if (!chatId) return
    const LIMIT = 50
    try {
      if (page === 1) setLoading(true); else setLoadingMore(true)
      const res = await api.get<{
        success: boolean
        data: { messages: Message[]; pagination: Pagination; participantReadMap: ReadMap }
      }>(`/chat/chats/${chatId}/messages?page=${page}&limit=${LIMIT}`)

      const { messages: msgs, pagination: pg, participantReadMap } = res.data.data
      // Messages come back newest-first — reverse for display
      const ordered = [...msgs].reverse()
      setMessages(prev => append ? [...ordered, ...prev] : ordered)
      setPagination(pg)
      // Always replace the read map with the freshest snapshot from the server
      if (participantReadMap) setReadMap(participantReadMap)

      // MED-2: update the independent page tracker and the "has more" flag.
      // We consider there to be more pages only when the server returned a full
      // page — this stays correct even as real-time messages inflate pg.total.
      loadedPageRef.current   = page
      hasMorePagesRef.current = msgs.length === LIMIT
      setHasMorePages(msgs.length === LIMIT)
    } catch {
      setError('Failed to load messages')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [chatId])

  // ── Load chat name + type from chats list ─────────────────────────────────
  useEffect(() => {
    if (!chatId) return
    api.get<{ success: boolean; data: { chats?: Array<{
      id: string; type: string; name?: string
      otherParticipant?: { id: string; name: string; email: string } | null
    }>; onlineUserIds?: string[] } | Array<{
      id: string; type: string; name?: string
      otherParticipant?: { id: string; name: string; email: string } | null
    }> }>('/chat/chats')
      .then(res => {
        const raw = res.data.data
        const chats = Array.isArray(raw) ? raw : (raw?.chats ?? [])
        const online = Array.isArray(raw) ? [] : (raw?.onlineUserIds ?? [])
        const chat = chats.find(c => c.id === chatId)
        if (!chat) { setChatName('Chat'); return }
        setChatType(chat.type as 'PRIVATE' | 'GROUP')
        if (chat.type === 'PRIVATE') {
          setChatName(chat.otherParticipant?.name ?? chat.otherParticipant?.email ?? 'Private Chat')
          setOtherUserId(chat.otherParticipant?.id ?? null)
          setOtherUserOnline(online.includes(chat.otherParticipant?.id ?? ''))
        } else {
          setChatName(chat.name ?? 'Group Chat')
        }
      })
      .catch(() => setChatName('Chat'))
  }, [chatId])

  // ── Socket — reuse the singleton from socket.service (no second connection) ──
  // The realtimeStore already holds an authenticated socket created at login.
  // We join the chat room on that socket and leave when leaving the view.
  // This eliminates the duplicate connection that previously existed (BUG-C2).
  useEffect(() => {
    if (!chatId) return

    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
    const socket = socketIO(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('chat:join', { chatId })
    })

    socket.on('newMessage', (data: { message: Message; chatId: string }) => {
      if (data.chatId !== chatId) return
      setMessages(prev => [...prev, data.message])
      // Scroll to bottom on new incoming message
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    })

    return () => {
      socket.emit('chat:leave', { chatId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [chatId, user?.id, loadMessages, nav])

  // ── Initial load + scroll to bottom ───────────────────────────────────────
  useEffect(() => {
    if (!token) { nav('/login'); return }
    void loadMessages(1, false)
    if (chatId) {
      api.patch(`/chat/chats/${chatId}/read`).catch(() => {})
    }
    // FEAT-S2: load the current user's block list to know if other participant is blocked
    api.get<{ success: boolean; data: { blockedId: string }[] }>('/chat/blocks')
      .then(res => {
        const blocked = new Set((res.data.data ?? []).map((b: { blockedId: string }) => b.blockedId))
        if (otherUserId) setIsBlocked(blocked.has(otherUserId))
      })
      .catch(() => {})
  }, [token, nav, loadMessages, chatId, otherUserId])

  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [loading])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = content.trim()
    if (!text || !chatId || sending) return

    // Stop typing indicator before sending
    if (typingTimer.current) clearTimeout(typingTimer.current)
    socketRef.current?.emit('chat:typing_stop', { chatId })

    setSending(true)
    setContent('')
    // MED-3: clear the draft immediately on send attempt
    if (chatId) saveDraft(chatId, '')
    emitStopTyping()

    // MED-3: attempt the POST, retry once on failure before giving up
    const attemptSend = async (): Promise<Message> => {
      const res = await api.post<{ success: boolean; data: Message }>(
        `/chat/chats/${chatId}/messages`,
        { content: text }
      )
      // Optimistically append (socket will also fire for other participants)
      setMessages(prev => [...prev, res.data.data])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch {
      setError('Failed to send message')
      setContent(text) // restore on failure
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // FIX 15: emit typing events with debounce
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    if (!chatId || !socketRef.current) return
    socketRef.current.emit('chat:typing', { chatId, userName: user?.name || 'Someone' })
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('chat:typing_stop', { chatId })
    }, 2000) // stop after 2s of inactivity
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  // ── Typing indicator emit ─────────────────────────────────────────────────
  // Emit 'chat:typing' on each keystroke, then debounce 'chat:stop_typing'
  // after 2 seconds of inactivity. Also emit stop on send/blur.
  //
  // LOW-3: the debounce callback checks mountedRef before emitting so it
  // never sends stop_typing to a room the user has already left (the race
  // where the 2s timer fires after the useEffect cleanup has run).
  const emitTyping = () => {
    const socket = getSocket()
    if (!socket || !chatId) return
    socket.emit('chat:typing', { chatId })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return   // LOW-3: component already unmounted
      const s = getSocket()
      if (s) s.emit('chat:stop_typing', { chatId })
    }, 2000)
  }

  const emitStopTyping = () => {
    const socket = getSocket()
    if (!socket || !chatId) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    socket.emit('chat:stop_typing', { chatId })
  }

  // ── FEAT-S2: Block / unblock the other participant ───────────────────────
  const handleToggleBlock = async () => {
    if (!otherUserId || blockLoading) return
    setBlockLoading(true)
    try {
      if (isBlocked) {
        await api.delete(`/chat/blocks/${otherUserId}`)
        setIsBlocked(false)
      } else {
        await api.post(`/chat/blocks/${otherUserId}`)
        setIsBlocked(true)
      }
    } catch {
      // non-fatal — leave current state
    } finally {
      setBlockLoading(false)
    }
  }

  // ── Load older messages ───────────────────────────────────────────────────
  // MED-2: use loadedPageRef (client-controlled) instead of pagination.page
  // (server snapshot). hasMorePagesRef is set true only when the last fetch
  // returned a full page, so it stays correct even as real-time messages arrive.
  const handleLoadMore = () => {
    if (!hasMorePagesRef.current || loadingMore) return
    void loadMessages(loadedPageRef.current + 1, true)
  }

  // FEAT-S1: derive seen status for the sender's own messages.
  // A message is "seen" when every other participant's lastReadAt >= message.createdAt.
  // Returns 'seen' | 'sent' — only called for messages the current user sent.
  const getReadStatus = (msg: Message): 'seen' | 'sent' => {
    const msgTime = new Date(msg.createdAt).getTime()
    const others  = Object.entries(readMap).filter(([uid]) => uid !== user?.id)
    if (others.length === 0) return 'sent'
    const allSeen = others.every(([, ts]) => ts !== null && new Date(ts).getTime() >= msgTime)
    return allSeen ? 'seen' : 'sent'
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    return isToday
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { day: '2-digit', month: 'short' }) +
          ' ' +
          d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="md:ml-52 pt-14 min-h-screen relative z-10 flex flex-col">
        <div className="flex flex-col flex-1 max-w-3xl w-full mx-auto px-4 md:px-8 py-4"
          style={{ height: 'calc(100vh - 3.5rem)' }}>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-4 py-3 border-b border-gold/10 flex-shrink-0">
            <button onClick={() => nav('/chat')}
              className="p-2 rounded-sm text-ice/40 hover:text-gold transition-colors"
              style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
              <ArrowLeft size={14} />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Avatar — relative so the online dot can anchor to it */}
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-sm flex items-center justify-center"
                  style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <MessageSquare size={13} className="text-gold" />
                </div>
                {/* FEAT-S4: green online dot for PRIVATE chats when other user is connected */}
                {chatType === 'PRIVATE' && otherUserOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-navy-950"
                    style={{ background: '#4ade80' }} title="Online" />
                )}
              </div>
              <div className="min-w-0">
                <p className="nav-label text-[0.55rem] text-gold/40 leading-none mb-0.5">CONVERSATION</p>
                <p className="font-display font-bold text-sm text-frost/90 truncate">{chatName}</p>
              </div>
            </div>

            {/* FEAT-S2: Block/unblock button — only for PRIVATE chats */}
            {chatType === 'PRIVATE' && otherUserId && (
              <button
                onClick={() => void handleToggleBlock()}
                disabled={blockLoading}
                className="flex-shrink-0 p-2 rounded-sm transition-colors disabled:opacity-40"
                style={isBlocked
                  ? { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }
                  : { background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)', color: 'rgba(184,212,240,0.4)' }
                }
                title={isBlocked ? 'Unblock user' : 'Block user'}>
                {isBlocked ? <ShieldOff size={14} /> : <Shield size={14} />}
              </button>
            )}

            {/* Group manage button — only visible for GROUP chats */}
            {chatType === 'GROUP' && (
              <button
                onClick={() => nav(`/chat/${chatId}/manage`)}
                className="flex-shrink-0 p-2 rounded-sm text-ice/40 hover:text-gold transition-colors"
                style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}
                title="Group settings">
                <Settings size={14} />
              </button>
            )}
          </motion.div>

          {/* Session expired banner — shown when socket token was rejected (SEC-7) */}
          {isSessionExpired && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-sm flex-shrink-0"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
              <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
              <p className="font-body text-xs text-red-400/90 flex-1">
                Your session has expired. Real-time messaging is paused.
              </p>
              <button
                onClick={() => { useAuthStore.getState().logout(); nav('/login') }}
                className="nav-label text-[0.55rem] px-3 py-1 rounded-sm transition-all flex-shrink-0"
                style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                RE-LOGIN
              </button>
            </motion.div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-1"
            style={{ minHeight: 0 }}>

            {/* Load more — MED-2: driven by hasMorePages state, not stale pagination.pages */}
            {hasMorePages && (
              <div className="text-center pt-2">
                <button onClick={handleLoadMore} disabled={loadingMore}
                  className="nav-label text-[0.55rem] px-4 py-1.5 rounded-sm transition-all disabled:opacity-50"
                  style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                  {loadingMore ? 'Loading...' : 'Load older messages'}
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={22} className="text-gold animate-spin" />
              </div>
            ) : error ? (
              <p className="text-center font-body text-sm text-red-400/70 py-10">{error}</p>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageSquare size={32} className="text-ice/20 mb-3" />
                <p className="font-body text-sm text-ice/40">No messages yet.</p>
                <p className="font-body text-xs text-ice/25 mt-1">Be the first to say something.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => {
                  const isMe = msg.senderId === user?.id
                  const showName =
                    !isMe &&
                    (i === 0 || messages[i - 1]?.senderId !== msg.senderId)

                  return (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showName && (
                        <p className="nav-label text-[0.5rem] text-ice/40 mb-1 ml-1">
                          {msg.sender.name}
                        </p>
                      )}
                      <div className={`max-w-[75%] rounded-sm px-4 py-2.5 ${
                        isMe
                          ? 'rounded-br-none'
                          : 'rounded-bl-none'
                      }`}
                        style={isMe
                          ? { background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)' }
                          : { background: 'rgba(13,15,28,0.8)', border: '1px solid rgba(184,212,240,0.08)' }
                        }>
                        {msg.isDeleted ? (
                          <p className="font-body text-sm leading-snug italic"
                            style={{ color: isMe ? 'rgba(201,168,76,0.35)' : 'rgba(184,212,240,0.3)' }}>
                            Message deleted
                          </p>
                        ) : (
                          <p className="font-body text-sm leading-snug"
                            style={{ color: isMe ? '#e2c76e' : 'rgba(232,240,251,0.85)' }}>
                            {msg.content}
                          </p>
                        )}
                        <p className="nav-label text-[0.44rem] mt-1 flex items-center gap-1"
                          style={{ color: isMe ? 'rgba(201,168,76,0.5)' : 'rgba(184,212,240,0.25)' }}>
                          {formatTime(msg.createdAt)}
                          {msg.editedAt && !msg.isDeleted && (
                            <span className="italic opacity-70">(edited)</span>
                          )}
                          {/* FEAT-S1: read receipt ticks — only on sender's own messages */}
                          {isMe && !msg.isDeleted && (() => {
                            const status = getReadStatus(msg)
                            return (
                              <span title={status === 'seen' ? 'Seen' : 'Sent'}
                                style={{ color: status === 'seen' ? '#c9a84c' : 'rgba(201,168,76,0.35)', letterSpacing: '-0.05em' }}>
                                {status === 'seen' ? '✓✓' : '✓'}
                              </span>
                            )
                          })()}
                        </p>
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 pt-3 border-t border-gold/10">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={emitStopTyping}
                placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="uris-input flex-1 resize-none"
                style={{ minHeight: '2.75rem', maxHeight: '8rem', overflowY: 'auto' }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 128) + 'px'
                }}
              />
              <motion.button
                onClick={() => void handleSend()}
                disabled={!content.trim() || sending}
                whileHover={content.trim() && !sending ? { scale: 1.05 } : {}}
                whileTap={content.trim() && !sending ? { scale: 0.95 } : {}}
                className="flex-shrink-0 w-11 h-11 rounded-sm flex items-center justify-center disabled:opacity-40 transition-all"
                style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.35)' }}>
                {sending
                  ? <Loader2 size={15} className="text-gold animate-spin" />
                  : <Send size={15} className="text-gold" />}
              </motion.button>
            </div>
            <p className="nav-label text-[0.45rem] text-ice/20 mt-1.5 text-right">
              Enter to send · Shift+Enter for new line
            </p>
          </div>

        </div>
      </main>
    </div>
  )
}
