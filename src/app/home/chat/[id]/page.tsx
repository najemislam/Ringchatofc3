"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, Send, Trash2, MoreVertical, Heart, X, Ban, Trash, Smile, Phone, PhoneOff, Video } from "lucide-react"
import { toast } from "sonner"
import { useMenu } from "@/context/MenuContext"
import CallModal from "@/components/CallModal"

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  reaction?: string
}

interface OtherUser {
  id: string
  full_name: string
  username: string
  profile_picture: string
  is_online: boolean
}

const EMOJI_OPTIONS = ["❤️", "😍", "🔥", "😂", "👍", "💯", "🎉", "😊", "💕", "🥰", "😘", "💖"]

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { openMenu } = useMenu()
  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [reactionMenuMessageId, setReactionMenuMessageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [showSettingsMenu, setShowSettingsMenu] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [reactEmoji, setReactEmoji] = useState<string | null>(null)
    const [activeCallId, setActiveCallId] = useState<string | null>(null)
    const [activeCallType, setActiveCallType] = useState<"audio" | "video">("audio")
    const [isCallerRole, setIsCallerRole] = useState(false)
    const [incomingCall, setIncomingCall] = useState<{ id: string; type: "audio" | "video" } | null>(null)
    const longPressTimer = useRef<NodeJS.Timeout | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationId = params.id as string

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }
    
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    
    useEffect(() => {
      if (!loading && messages.length > 0 && messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    }, [loading, messages.length])
  
    useEffect(() => {
      if (!user || !conversationId) return
  
      const fetchData = async (silent = false) => {
        const supabase = createClient()

        if (!silent) setLoading(true)

        const { data: participant } = await supabase
          .from('conversation_participants')
          .select(`
            user:users!conversation_participants_user_id_fkey(id, full_name, username, profile_picture, is_online)
          `)
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)
          .single()

        if (participant) {
          setOtherUser(participant.user as OtherUser)
        }

        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (msgs) {
          setMessages(msgs)
        }

        setLoading(false)
      }

      fetchData()

      const supabase = createClient()
      const channel = supabase
        .channel(`chat-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          setMessages(prev => {
            // Avoid duplicates from optimistic updates
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new as Message]
          })
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id))
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'users'
        }, () => {
          fetchData(true)
        })
        .subscribe()

      // Polling fallback every 3 seconds for messages
      const pollingInterval = setInterval(() => {
        fetchData(true)
      }, 3000)

      return () => {
        supabase.removeChannel(channel)
        clearInterval(pollingInterval)
      }
    }, [user, conversationId])

    const sendMessage = async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      if (!newMessage.trim() || !user || sending) return
  
      const content = newMessage.trim()
      setNewMessage("")
      setSending(true)
      
      inputRef.current?.focus()
      
      const supabase = createClient()

      // Optimistic update
      const tempId = Math.random().toString()
      const tempMsg: Message = {
        id: tempId,
        content: content,
        sender_id: user.id,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, tempMsg])
  
      const { data: sentMsg, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content
      }).select().single()

      if (error) {
        toast.error("Failed to send message")
        setMessages(prev => prev.filter(m => m.id !== tempId))
      } else if (sentMsg) {
        // Replace temp message with real one
        setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m))
      }
  
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
  
      setSending(false)
      inputRef.current?.focus()
    }

    const sendLoveReact = async () => {
      if (!user || sending || !reactEmoji) return
      setSending(true)
      inputRef.current?.focus()
      
      const supabase = createClient()
      
      // Optimistic update
      const tempId = Math.random().toString()
      const tempMsg: Message = {
        id: tempId,
        content: reactEmoji,
        sender_id: user.id,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, tempMsg])

      const { data: sentMsg, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: reactEmoji
      }).select().single()

      if (error) {
        toast.error("Failed to send reaction")
        setMessages(prev => prev.filter(m => m.id !== tempId))
      } else if (sentMsg) {
        setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m))
      }
      
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
      
      setSending(false)
      setReactEmoji(null)
      inputRef.current?.focus()
    }


  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const blockUser = async () => {
    if (!user || !otherUser) return
    const supabase = createClient()
    
    // Check if already blocked
    const { data: existing } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', otherUser.id)
      .maybeSingle()
    
    if (existing) {
      toast.error("User already blocked")
      return
    }
    
    // Add to blocked users
    await supabase.from('blocked_users').insert({
      blocker_id: user.id,
      blocked_id: otherUser.id
    })
    
    // Remove from friends if they are friends
    await supabase.from('friends').delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${otherUser.id}),and(user_id.eq.${otherUser.id},friend_id.eq.${user.id})`)
    
    toast.success(`${otherUser.full_name} has been blocked`)
    setShowSettingsMenu(false)
    router.push('/home/chats')
  }

  const deleteConversation = async () => {
    if (!user) return
    const supabase = createClient()
    
    // Delete all messages in this conversation
    await supabase.from('messages').delete().eq('conversation_id', conversationId)
    
    // Delete conversation participants
    await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId)
    
    // Delete the conversation
    await supabase.from('conversations').delete().eq('id', conversationId)
    
    toast.success("Conversation deleted")
    router.push('/home/chats')
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return
    const supabase = createClient()
    
    // Optimistic update
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, reaction: emoji } : m
    ))
    setReactionMenuMessageId(null)

    const { error } = await supabase
      .from('messages')
      .update({ reaction: emoji })
      .eq('id', messageId)
      .eq('conversation_id', conversationId)

    if (error) {
      toast.error("Failed to add reaction")
    }
  }

  const startLongPress = (messageId: string) => {
    longPressTimer.current = setTimeout(() => {
      setReactionMenuMessageId(messageId)
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50)
      }
    }, 500)
  }

  const endLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const initiateCall = async (type: "audio" | "video") => {
    if (!user || !otherUser) return
    const supabase = createClient()
    const { data, error } = await supabase.from("calls").insert({
      conversation_id: conversationId,
      caller_id: user.id,
      receiver_id: otherUser.id,
      call_type: type,
      status: "ringing",
    }).select().single()
    if (error || !data) { toast.error("Could not start call"); return }
    setActiveCallType(type)
    setIsCallerRole(true)
    setActiveCallId(data.id)
  }

  // Listen for incoming calls in this conversation
  useEffect(() => {
    if (!user || !conversationId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`incoming-call-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const call = payload.new as any
          if (call.receiver_id === user.id && call.status === "ringing") {
            setIncomingCall({ id: call.id, type: call.call_type })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, conversationId])

  if (!user) return null

    return (
      <>
      <div className="flex flex-col h-screen fixed inset-0 bg-background z-50">
          {otherUser && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
              <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/home/chats')}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors -ml-2"
                  >
                    <ChevronLeft className="w-6 h-6" style={{ width: '24px', height: '24px' }} />
                </button>

                <div className="flex items-center gap-3">
                  <div className="relative" style={{ width: '40px', height: '40px' }}>
                    {otherUser.profile_picture ? (
                      <img src={otherUser.profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold text-lg">
                        {otherUser.full_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground" style={{ fontSize: '16px', lineHeight: '20px' }}>{otherUser.full_name}</h2>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {otherUser.is_online ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                  <button
                    onClick={() => initiateCall("audio")}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                  >
                    <Phone className="w-5 h-5 text-foreground" />
                  </button>
                  <button
                    onClick={() => initiateCall("video")}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                  >
                    <Video className="w-5 h-5 text-foreground" />
                  </button>
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                  >
                    <MoreVertical className="w-6 h-6 text-foreground" style={{ width: '24px', height: '24px' }} />
                  </button>
                  
                  {showSettingsMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowSettingsMenu(false)} 
                      />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                        >
                          <Smile className="w-5 h-5" />
                          <span className="font-medium">Change React Emoji</span>
                          <span className="ml-auto text-xl">{reactEmoji}</span>
                        </button>
                        {showEmojiPicker && (
                          <div className="px-3 pb-3 grid grid-cols-6 gap-2">
                            {EMOJI_OPTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  setReactEmoji(emoji)
                                  setShowEmojiPicker(false)
                                  toast.success(`React emoji changed to ${emoji}`)
                                }}
                                className={`text-xl p-2 rounded-lg hover:bg-muted transition-colors ${reactEmoji === emoji ? 'bg-green-100 ring-2 ring-green-500' : ''}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={deleteConversation}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left text-red-500 border-t border-border"
                        >
                          <Trash className="w-5 h-5" />
                          <span className="font-medium">Delete Chat</span>
                        </button>
                        <button
                          onClick={blockUser}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left text-red-500 border-t border-border"
                        >
                          <Ban className="w-5 h-5" />
                          <span className="font-medium">Block User</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
        )}

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-base">No messages yet</p>
                <p className="text-sm">Say hello!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user.id
                const handleDeleteMessage = async () => {
                  const supabase = createClient()
                  await supabase.from('messages').delete().eq('id', msg.id)
                  setMessages(prev => prev.filter(m => m.id !== msg.id))
                  toast.success("Message deleted")
                }
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} relative`}>
                    <div className={`flex ${isMe ? "justify-end" : "justify-start"} group w-full`}>
                      {isMe && (
                        <button
                          onClick={handleDeleteMessage}
                          className="self-center mr-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div
                        onClick={() => setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)}
                        onMouseDown={() => startLongPress(msg.id)}
                        onMouseUp={endLongPress}
                        onMouseLeave={endLongPress}
                        onTouchStart={() => startLongPress(msg.id)}
                        onTouchEnd={endLongPress}
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl cursor-pointer active:scale-[0.98] transition-all relative ${
                          isMe
                            ? "bg-gradient-to-r from-green-500 to-green-500 text-white rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}
                      >
                        <p className="break-words text-[15px]">{msg.content}</p>
                        {msg.reaction && (
                          <div className={`absolute -bottom-2 ${isMe ? "right-0" : "left-0"} bg-background border border-border rounded-full px-1.5 py-0.5 text-xs shadow-sm`}>
                            {msg.reaction}
                          </div>
                        )}
                      </div>
                    </div>

                    {reactionMenuMessageId === msg.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-[60]" 
                          onClick={() => setReactionMenuMessageId(null)}
                        />
                        <div className={`absolute z-[70] -top-12 ${isMe ? "right-0" : "left-0"} bg-background border border-border rounded-full shadow-xl px-2 py-1.5 flex items-center gap-2 animate-in fade-in zoom-in duration-200`}>
                          {["👍", "❤️", "😊", "🙁", "😠"].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="text-xl hover:scale-125 transition-transform active:scale-95 p-1"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {selectedMessageId === msg.id && (
                      <p className={`text-[10px] mt-1 mb-1 px-2 text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-200`}>
                        {formatTime(msg.created_at)}
                      </p>
                    )}
                  </div>
                )
              })
            )}
          <div ref={messagesEndRef} />
        </div>
  
        <div className="px-4 py-4 pb-8 border-t border-border bg-background safe-area-bottom mt-auto">
        <div className="flex items-center gap-3">
            <input
              type="text"
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              className="flex-1 px-4 py-3.5 rounded-full bg-muted border-0 focus:ring-2 focus:ring-green-500 outline-none text-base"
            />
          {(newMessage.trim() || !reactEmoji) ? (
            <button
              onClick={() => sendMessage()}
              disabled={sending || !newMessage.trim()}
              className="p-3.5 rounded-full bg-gradient-to-r from-green-500 to-green-500 text-white disabled:opacity-50 transition-opacity"
            >
              <Send className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={sendLoveReact}
              disabled={sending}
              className="w-14 h-14 rounded-full bg-muted hover:bg-muted/80 text-2xl disabled:opacity-50 transition-all flex items-center justify-center"
            >
              {reactEmoji}
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Active call modal */}
      {activeCallId && otherUser && (
        <CallModal
          callId={activeCallId}
          callType={activeCallType}
          otherUser={otherUser}
          currentUserId={user.id}
          isCaller={isCallerRole}
          onClose={() => setActiveCallId(null)}
        />
      )}

      {/* Incoming call banner (when not already in a call) */}
      {incomingCall && !activeCallId && otherUser && (
        <div className="fixed inset-x-4 top-6 z-[90] bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
              {otherUser.profile_picture ? (
                <img src={otherUser.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-green-600 flex items-center justify-center text-white font-bold">
                  {otherUser.full_name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{otherUser.full_name}</p>
              <p className="text-xs text-gray-400">Incoming {incomingCall.type} call</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                await createClient().from("calls").update({ status: "rejected" }).eq("id", incomingCall.id)
                setIncomingCall(null)
              }}
              className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => {
                setActiveCallType(incomingCall.type)
                setIsCallerRole(false)
                setActiveCallId(incomingCall.id)
                setIncomingCall(null)
              }}
              className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center"
            >
              <Phone className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
    )
}
