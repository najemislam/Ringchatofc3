"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { Plus } from "lucide-react"

interface Chat {
  conversation_id: string
  updated_at: string
  other_user: {
    id: string
    full_name: string
    username: string
    profile_picture: string
    is_online: boolean
    last_seen: string
  }
  last_message: {
    content: string
    sender_id: string
    created_at: string
  } | null
}

export default function ChatsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    const supabase = createClient()

    const { data: myParticipants, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id)

    if (partError || !myParticipants || myParticipants.length === 0) {
      setChats([])
      setLoading(false)
      return
    }

    const convIds = myParticipants.map((p) => p.conversation_id)

    const { data: conversationsData, error: convError } = await supabase
      .from("conversations")
      .select(`
        id,
        updated_at,
        participants:conversation_participants(
          user:users!conversation_participants_user_id_fkey(
            id, full_name, username, profile_picture, is_online, last_seen
          )
        )
      `)
      .in("id", convIds)
      .order("updated_at", { ascending: false })

    if (convError || !conversationsData) {
      setChats([])
      setLoading(false)
      return
    }

    const { data: lastMessages } = await supabase
      .from("messages")
      .select("conversation_id, content, sender_id, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })

    const latestMsgMap = new Map()
    lastMessages?.forEach((msg) => {
      if (!latestMsgMap.has(msg.conversation_id)) {
        latestMsgMap.set(msg.conversation_id, msg)
      }
    })

    const chatList: Chat[] = conversationsData
      .map((conv) => {
        const otherParticipant = conv.participants.find((p: any) => p.user.id !== user.id)
        const lastMessage = latestMsgMap.get(conv.id) || null
        return {
          conversation_id: conv.id,
          updated_at: conv.updated_at,
          other_user: otherParticipant?.user as Chat["other_user"],
          last_message: lastMessage,
        }
      })
      .filter((chat) => chat.other_user)

    setChats(chatList)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    fetchData()

    const supabase = createClient()

    const channel = supabase
      .channel("chats-realtime-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, () => fetchData(true))
      .subscribe()

    const pollingInterval = setInterval(() => {
      fetchData(true)
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollingInterval)
    }
  }, [user])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
    } else if (days === 1) {
      return "Yesterday"
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  if (!user) return null

  return (
    <div className="flex flex-col">
      {loading ? (
        <div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center px-4 animate-pulse" style={{ height: "72px", gap: "12px" }}>
              <div className="rounded-full bg-muted flex-shrink-0" style={{ width: "56px", height: "56px" }} />
              <div className="flex-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3.5 w-48 bg-muted rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-5">
            <Plus className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold">No chats yet</h3>
          <p className="text-sm text-muted-foreground text-center mt-2">Add friends to start chatting</p>
        </div>
      ) : (
        <div>
          {chats.map((chat) => (
            <button
              key={chat.conversation_id}
              onClick={() => router.push(`/chats/${chat.conversation_id}`)}
              className="w-full flex items-center px-4 hover:bg-muted/50 transition-colors text-left"
              style={{ height: "72px", gap: "12px" }}
            >
              <div className="relative flex-shrink-0" style={{ width: "56px", height: "56px" }}>
                {chat.other_user.profile_picture ? (
                  <img src={chat.other_user.profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold"
                    style={{ fontSize: "20px" }}
                  >
                    {chat.other_user.full_name.charAt(0)}
                  </div>
                )}
                {chat.other_user.is_online && (
                  <div
                    className="absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-background"
                    style={{ width: "12px", height: "12px" }}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold truncate text-foreground" style={{ fontSize: "16px", lineHeight: "20px" }}>
                    {chat.other_user.full_name}
                  </span>
                  {chat.last_message && (
                    <span className="text-muted-foreground flex-shrink-0 ml-3" style={{ fontSize: "12px", lineHeight: "16px" }}>
                      {formatTime(chat.last_message.created_at)}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground truncate mt-0.5" style={{ fontSize: "14px", lineHeight: "18px" }}>
                  {chat.last_message ? (
                    <>
                      {chat.last_message.sender_id === user.id && "You: "}
                      {chat.last_message.content}
                    </>
                  ) : (
                    "Start a conversation"
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
