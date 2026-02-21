"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Search as SearchIcon, MessageCircle, Menu } from "lucide-react"
import { useMenu } from "@/context/MenuContext"

interface UserResult {
  id: string
  full_name: string
  username: string
  profile_picture: string
  is_online: boolean
}

export default function SearchPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { openMenu } = useMenu()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)

    const [followingIds, setFollowingIds] = useState<string[]>([])

    const fetchFollowing = async () => {
      if (!user) return
      const supabase = createClient()
      const { data } = await supabase.from('followers').select('following_id').eq('follower_id', user.id)
      if (data) setFollowingIds(data.map(f => f.following_id))
    }

    const followUser = async (targetId: string) => {
      if (!user) return
      const supabase = createClient()
      const { error } = await supabase.from('followers').upsert({ follower_id: user.id, following_id: targetId })
      if (!error) {
        setFollowingIds(prev => [...prev, targetId])
        toast.success("Following!")
        await supabase.from('notifications').insert({
          user_id: targetId,
          sender_id: user.id,
          type: 'follow',
          content: 'started following you'
        })
      }
    }

    const searchUsers = async (searchQuery: string) => {
      if (!user || !searchQuery.trim()) {
        setResults([])
        return
      }

      setLoading(true)
      const supabase = createClient()
      await fetchFollowing()

      const { data } = await supabase
        .from('users')
        .select('id, full_name, username, profile_picture, is_online')
        .neq('id', user.id)
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(20)

      setResults(data || [])
      setLoading(false)
    }


  const startChat = async (otherUserId: string) => {
    if (!user) return
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (existing) {
      for (const conv of existing) {
        const { data: other } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', otherUserId)
          .single()

        if (other) {
          router.push(`/home/chat/${conv.conversation_id}`)
          return
        }
      }
    }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single()

    if (newConv) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: otherUserId }
      ])

      router.push(`/home/chat/${newConv.id}`)
    }
  }

  if (!user) return null

    return (
      <div className="flex flex-col min-h-[calc(100vh-80px)]">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => router.push('/home')}
            className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
            <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  searchUsers(e.target.value)
                }}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-muted border-0 focus:ring-2 focus:ring-green-500 outline-none"
                autoFocus
              />
          </div>
        </div>
        <button 
          onClick={openMenu}
          className="p-2 -mr-2 rounded-xl hover:bg-muted transition-colors active:scale-95"
        >
          <Menu className="w-6 h-6 text-foreground" />
        </button>
      </header>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 && query ? (
          <div className="text-center py-12 text-muted-foreground">
            <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users found</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Search for users</p>
          </div>
        ) : (
            <div className="space-y-3">
              {results.map((u) => (
                <div
                  key={u.id}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-green-500/30 transition-all text-left group"
                >
                  <div className="relative cursor-pointer" onClick={() => router.push(`/home/profile?id=${u.id}`)}>
                    {u.profile_picture ? (
                      <img src={u.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold">
                        {u.full_name.charAt(0)}
                      </div>
                    )}
                    {u.is_online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-sm" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/home/profile?id=${u.id}`)}>
                    <p className="font-bold truncate group-hover:text-green-600 transition-colors">{u.full_name}</p>
                    <p className="text-sm text-muted-foreground">@{u.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {followingIds.includes(u.id) ? (
                      <button 
                        className="px-4 py-1.5 rounded-full bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                        disabled
                      >
                        Following
                      </button>
                    ) : (
                      <button 
                        onClick={() => followUser(u.id)}
                        className="px-4 py-1.5 rounded-full bg-green-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-600/20 active:scale-95"
                      >
                        Follow
                      </button>
                    )}
                    <button 
                      onClick={() => startChat(u.id)}
                      className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

        )}
      </div>
    </div>
  )
}
