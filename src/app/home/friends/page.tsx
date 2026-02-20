"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { UserRoundPlus, Check, X, ChevronRight, UsersRound, Search, UserRoundCheck, Send as SendIcon, Trash2, Settings, MessageSquare, Ban } from "lucide-react"
import { RingchatLogoSmall } from "@/components/RingchatLogo"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface UserData {
  id: string
  full_name: string
  username: string
  profile_picture: string
  is_online: boolean
}

interface FriendRequest {
  id: string
  sender_id: string
  sender: UserData
}

interface SentRequest {
  id: string
  receiver_id: string
  receiver: UserData
}

interface Community {
  id: string
  name: string
  description: string
  image_url: string | null
  creator_id: string
  created_at: string
  member_count: number
}

export default function FriendsPage() {
  const { user } = useAuth()
  const router = useRouter()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState<'suggestions' | 'requests' | 'sent' | 'friends'>('suggestions')

    useEffect(() => {
      const tab = searchParams.get('tab')
      if (tab === 'requests' || tab === 'sent' || tab === 'suggestions' || tab === 'friends') {
        setActiveTab(tab as any)
      }
    }, [searchParams])

  const [suggestions, setSuggestions] = useState<UserData[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([])
  const [friends, setFriends] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  
    const fetchData = async () => {
      if (!user) return
      const supabase = createClient()
  
      const { data: friendsList } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id)
  
      const friendIds = friendsList?.map(f => f.friend_id) || []
  
      const { data: followingList } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id)
  
      const followingIds = followingList?.map(f => f.following_id) || []
  
      const { data: followerList } = await supabase
        .from('followers')
        .select('follower_id')
        .eq('following_id', user.id)
  
      const followerIds = followerList?.map(f => f.follower_id) || []

      const { data: blockedList } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id)
      
      const { data: blockedByList } = await supabase
        .from('blocked_users')
        .select('blocker_id')
        .eq('blocked_id', user.id)

      const blockedIds = [...(blockedList?.map(b => b.blocked_id) || []), ...(blockedByList?.map(b => b.blocker_id) || [])]
  
      const excludeIds = [user.id, ...followingIds, ...blockedIds]
  
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, full_name, username, profile_picture, is_online')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(20)
  
      if (allUsers) setSuggestions(allUsers)
  
      const { data: followers } = await supabase
        .from('followers')
        .select(`
          follower:users!followers_follower_id_fkey(id, full_name, username, profile_picture, is_online)
        `)
        .eq('following_id', user.id)
  
      if (followers) {
        setFriendRequests(followers.map((f: any) => ({
          id: f.follower.id,
          sender_id: f.follower.id,
          sender: f.follower as unknown as UserData
        })))
      }
  
      const { data: following } = await supabase
        .from('followers')
        .select(`
          following:users!followers_following_id_fkey(id, full_name, username, profile_picture, is_online)
        `)
        .eq('follower_id', user.id)
  
      if (following) {
        setSentRequests(following.map((f: any) => ({
          id: f.following.id,
          receiver_id: f.following.id,
          receiver: f.following as unknown as UserData
        })))
      }
  
      const { data: friendsData } = await supabase
        .from('friends')
        .select(`
          friend:users!friends_friend_id_fkey(id, full_name, username, profile_picture, is_online)
        `)
        .eq('user_id', user.id)
  
      if (friendsData) {
        setFriends(friendsData.map(f => f.friend as unknown as UserData))
      }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const removeFriend = async (friendId: string) => {
    if (!user) return
    const supabase = createClient()
    await Promise.all([
      supabase.from('friends').delete().or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`),
      supabase.from('followers').delete().or(`and(follower_id.eq.${user.id},following_id.eq.${friendId}),and(follower_id.eq.${friendId},following_id.eq.${user.id})`)
    ])
    toast.success("Friend removed and unfollowed")
    fetchData()
  }

  const followUser = async (targetId: string) => {
    if (!user) return
    const supabase = createClient()
    
    // Check if the target user already follows us
    const { data: isFollower } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', targetId)
      .eq('following_id', user.id)
      .maybeSingle()

    const { error } = await supabase.from('followers').upsert({
      follower_id: user.id,
      following_id: targetId
    })

    if (!error) {
      if (isFollower) {
        // Mutual follow!
        await supabase.from('friends').upsert([
          { user_id: user.id, friend_id: targetId },
          { user_id: targetId, friend_id: user.id }
        ])
        toast.success("Mutual follow! You are now friends.")
      } else {
        toast.success("Following!")
      }
      
      await supabase.from('notifications').insert({
        user_id: targetId,
        actor_id: user.id,
        type: 'follow',
        content: 'started following you'
      })
      
      fetchData()
    }
  }

    const unfollowUser = async (targetId: string) => {
      if (!user) return
      const supabase = createClient()
      
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetId)

      if (!error) {
        // Also remove from friends just in case they were mutual
        await supabase
          .from('friends')
          .delete()
          .or(`and(user_id.eq.${user.id},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${user.id})`)
        
        toast.success("Unfollowed")
        fetchData()
      }
    }

    const blockUser = async (targetId: string) => {
      if (!user) return
      const supabase = createClient()
      
      const { error } = await supabase.from('blocked_users').upsert({
        blocker_id: user.id,
        blocked_id: targetId
      })

      if (!error) {
        // Also unfollow and remove as friend
        await supabase.from('followers').delete().or(`and(follower_id.eq.${user.id},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${user.id})`)
        await supabase.from('friends').delete().or(`and(user_id.eq.${user.id},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${user.id})`)
        
        toast.success("User blocked")
        fetchData()
      }
    }

  const startChat = async (friendId: string) => {
    if (!user) return
    const supabase = createClient()
    const { data: existing } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id)
    if (existing) {
      for (const conv of existing) {
        const { data: other } = await supabase.from('conversation_participants').select('user_id').eq('conversation_id', conv.conversation_id).eq('user_id', friendId).single()
        if (other) {
          router.push(`/home/chat/${conv.conversation_id}`)
          return
        }
      }
    }
    const { data: newConv } = await supabase.from('conversations').insert({}).select().single()
    if (newConv) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: friendId }
      ])
      router.push(`/home/chat/${newConv.id}`)
    }
  }

  if (!user) return null

  const ThreePersonIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <path d="M12 8c-2.2 0-4 1.8-4 4v2h8v-2c0-2.2-1.8-4-4-4z" />
      <circle cx="5" cy="8" r="2.5" />
      <path d="M5 10.5c-1.7 0-3 1.3-3 3V15h6v-1.5c0-1.7-1.3-3-3-3z" />
      <circle cx="19" cy="8" r="2.5" />
      <path d="M19 10.5c1.7 0 3 1.3 3 3V15h-6v-1.5c0-1.7 1.3-3 3-3z" />
    </svg>
  )

    const tabs = [
    { id: 'suggestions', label: 'Suggestions', icon: <UserRoundPlus className="w-4 h-4" />, count: suggestions.length },
    { id: 'requests', label: 'Followers', icon: <UserRoundCheck className="w-4 h-4" />, count: friendRequests.length },
    { id: 'sent', label: 'Following', icon: <SendIcon className="w-4 h-4" />, count: sentRequests.length },
    { id: 'friends', label: 'Friends', icon: <UsersRound className="w-4 h-4" />, count: friends.length },
  ] as const

  return (
    <div className="flex flex-col">
      <div className="px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar border-b border-border bg-background/50 sticky top-14 z-10 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`relative flex items-center gap-2 py-2 px-4 rounded-2xl transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? "bg-green-600 text-white shadow-lg shadow-green-600/20" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.icon}
            <span className={`text-xs font-bold uppercase tracking-tight ${activeTab === tab.id ? "block" : "hidden sm:block"}`}>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? "bg-white text-green-600" : "bg-green-600 text-white"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse p-4 rounded-2xl border border-border">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1"><div className="h-4 w-32 bg-muted rounded" /><div className="h-3 w-24 bg-muted rounded mt-1" /></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'suggestions' && (
              suggestions.length === 0 ? <div className="text-center py-12 text-muted-foreground"><UsersRound className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No suggestions available</p></div> :
              <div className="space-y-3">
                {suggestions.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-green-500/30 transition-all group">
                    <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/home/profile?id=${u.id}`)}>
                      {u.profile_picture ? <img src={u.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" /> : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold">{u.full_name.charAt(0)}</div>}
                      <div className="flex-1 min-w-0"><p className="font-bold truncate group-hover:text-green-600 transition-colors">{u.full_name}</p><p className="text-sm text-muted-foreground">@{u.username}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                          onClick={() => followUser(u.id)} 
                          title="Follow"
                          className="w-12 h-12 flex items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          <UserRoundPlus className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => startChat(u.id)} 
                          title="Message"
                          className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          <MessageSquare className="w-6 h-6" />
                        </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button 
                            title="Block"
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                          >
                            <Ban className="w-6 h-6" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Block {u.full_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              They won't be able to message you or see your profile. You can unblock them later in settings.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => blockUser(u.id)} className="bg-red-500 hover:bg-red-600 rounded-2xl">Block</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'requests' && (
              friendRequests.length === 0 ? <div className="text-center py-12 text-muted-foreground"><UsersRound className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No followers yet</p></div> :
              <div className="space-y-3">
                {friendRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                    <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/home/profile?id=${req.sender.id}`)}>
                      {req.sender.profile_picture ? <img src={req.sender.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" /> : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold">{req.sender.full_name.charAt(0)}</div>}
                      <div className="flex-1 min-w-0"><p className="font-bold truncate">{req.sender.full_name}</p><p className="text-sm text-muted-foreground">@{req.sender.username}</p></div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => followUser(req.sender_id)} 
                        className="px-4 py-2 rounded-xl bg-green-600 text-white shadow-lg shadow-green-600/20 active:scale-95 text-xs font-bold uppercase tracking-widest"
                      >
                        Follow Back
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'sent' && (
              sentRequests.length === 0 ? <div className="text-center py-12 text-muted-foreground"><UsersRound className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>You are not following anyone yet</p></div> :
              <div className="space-y-3">
                {sentRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                    <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/home/profile?id=${req.receiver.id}`)}>
                      {req.receiver.profile_picture ? <img src={req.receiver.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" /> : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold">{req.receiver.full_name.charAt(0)}</div>}
                      <div className="flex-1 min-w-0"><p className="font-bold truncate">{req.receiver.full_name}</p><p className="text-sm text-muted-foreground">@{req.receiver.username}</p></div>
                    </div>
                    <button onClick={() => unfollowUser(req.receiver_id)} className="px-4 py-2 rounded-xl bg-muted text-xs font-bold text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all uppercase tracking-widest">Unfollow</button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'friends' && (
              friends.length === 0 ? <div className="text-center py-12 text-muted-foreground"><UsersRound className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No friends yet</p></div> :
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div key={friend.id} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-green-500/30 transition-all group">
                    <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/home/profile?id=${friend.id}`)}>
                      <div className="relative">
                        {friend.profile_picture ? <img src={friend.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" /> : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold">{friend.full_name.charAt(0)}</div>}
                        {friend.is_online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-sm" />}
                      </div>
                      <div className="flex-1 min-w-0"><p className="font-bold truncate group-hover:text-green-600 transition-colors">{friend.full_name}</p><p className="text-sm text-muted-foreground">@{friend.username}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startChat(friend.id)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all"><ChevronRight className="w-6 h-6" /></button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><button className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-red-50 text-red-500 transition-colors"><Trash2 className="w-6 h-6" /></button></AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader><AlertDialogTitle>Unfriend {friend.full_name}?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove this person from your friends list?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => removeFriend(friend.id)} className="bg-red-500 hover:bg-red-600 rounded-2xl">Unfriend</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

}
