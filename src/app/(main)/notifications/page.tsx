"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  UserPlus, 
  ChevronRight,
  Loader2,
  Trash2,
  CheckCircle2,
  Settings,
  Search
} from "lucide-react"
import { RingchatLogoSmall } from "@/components/RingchatLogo"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  user_id: string
  sender_id: string
  type: 'like' | 'comment' | 'save' | 'follow'
  content: string
  is_read: boolean
  created_at: string
  actor: {
    full_name: string
    username: string
    profile_picture: string
  }
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    if (!user) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:users!notifications_sender_id_fkey(full_name, username, profile_picture)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setNotifications(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()

    if (!user) return
    const supabase = createClient()
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const markAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const deleteNotification = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const markAllRead = async () => {
    if (!user) return
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-500 fill-red-500" />
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'save': return <Bookmark className="w-4 h-4 text-green-500 fill-green-500" />
        case 'follow': return <UserPlus className="w-4 h-4 text-green-500" />
      default: return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.type === 'follow') {
      router.push('/connect?tab=requests')
    } else if (notification.sender_id) {
      router.push(`/profile?id=${notification.sender_id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

    return (
      <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative flex items-center gap-4 p-4 transition-colors hover:bg-muted/30 cursor-pointer ${!n.is_read ? 'bg-green-50/30 dark:bg-green-900/5' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="relative">
                    <img 
                      src={n.actor.profile_picture || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"} 
                      alt="" 
                      className="w-12 h-12 rounded-full object-cover border border-border" 
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                      {getIcon(n.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-tight">
                      <span className="font-bold text-foreground">@{n.actor.username}</span>
                      {" "}{n.content}
                    </p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(n.id)
                      }}
                      className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center opacity-40">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Bell className="w-10 h-10" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-2">No new alerts</h2>
                <p className="text-xs max-w-[200px] leading-relaxed font-medium">
                  When people interact with your posts or follow you, you'll see them here.
                </p>

            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
