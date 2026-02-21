"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Check, 
  Loader2, 
  Image as ImageIcon, 
  Video, 
  Send, 
  MoreVertical, 
    Heart, 
    MessageCircle, 
    X,
    Play,
    Menu
  } from "lucide-react"
  import { toast } from "sonner"
  import { motion, AnimatePresence } from "framer-motion"
  import Link from "next/link"
  import { useMenu } from "@/context/MenuContext"


interface Community {
  id: string
  name: string
  description: string
  image_url: string | null
  owner_id: string
  created_at: string
}

interface Post {
  id: string
  content: string | null
  media_url: string | null
  media_type: 'image' | 'video' | 'text'
  created_at: string
  user_id: string
  user: {
    id: string
    full_name: string
    username: string
    profile_picture: string | null
  }
  reaction_count: number
  comment_count: number
  is_reacted: boolean
}

const renderTextWithMentions = (text: string) => {
  if (!text) return null
  const mentionRegex = /@(\w+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const username = match[1]
    parts.push(
      <Link 
        key={`${match.index}-${username}`}
        href={`/home/search?q=${username}`}
        className="text-green-600 font-semibold hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        @{username}
      </Link>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

export default function CommunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { openMenu } = useMenu()
  const [community, setCommunity] = useState<Community | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  
  // Post Creation State
  const [postContent, setPostContent] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return
      const supabase = createClient()

      // Fetch Community
      const { data: communityData } = await supabase
        .from('communities')
        .select('*')
        .eq('id', params.id)
        .single()

      if (communityData) {
        setCommunity(communityData)

        // Fetch Member Count
        const { count } = await supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', params.id)

        setMemberCount(count || 0)

        // Check Membership
        if (user) {
          const { data: membership } = await supabase
            .from('community_members')
            .select('*')
            .eq('community_id', params.id)
            .eq('user_id', user.id)
            .single()

          setIsMember(!!membership)
        }

        // Fetch Posts
        fetchPosts()
      }

      setLoading(false)
    }

    fetchData()
  }, [params.id, user])

  const fetchPosts = async () => {
    const supabase = createClient()
    const { data: postsData, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        user:users(id, full_name, username, profile_picture)
      `)
      .eq('community_id', params.id)
      .order('created_at', { ascending: false })

    if (postsData) {
      // Fetch reactions and comments counts for each post
      const postsWithStats = await Promise.all(postsData.map(async (post) => {
        const [reactionsRes, commentsRes, myReactionRes] = await Promise.all([
          supabase.from('community_post_reactions').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
          supabase.from('community_post_comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
          user ? supabase.from('community_post_reactions').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle() : { data: null }
        ])

        return {
          ...post,
          reaction_count: reactionsRes.count || 0,
          comment_count: commentsRes.count || 0,
          is_reacted: !!myReactionRes.data
        }
      }))
      setPosts(postsWithStats)
    }
  }

  const handleJoin = async () => {
    if (!user || !community) return
    setJoining(true)
    const supabase = createClient()

    if (isMember) {
      await supabase.from('community_members').delete().eq('community_id', community.id).eq('user_id', user.id)
      setIsMember(false)
      setMemberCount((prev) => Math.max(0, prev - 1))
      toast.success("Left community")
    } else {
      await supabase.from('community_members').insert({ community_id: community.id, user_id: user.id })
      setIsMember(true)
      setMemberCount((prev) => prev + 1)
      toast.success("Joined community!")
    }
    setJoining(false)
  }

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMediaFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setMediaPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleCreatePost = async () => {
    if (!user || (!postContent.trim() && !mediaFile)) return
    setIsPosting(true)
    const supabase = createClient()

    try {
      let mediaUrl = null
      let mediaType: 'image' | 'video' | 'text' = 'text'

      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop()
        const fileName = `communities/${community?.id}/posts/${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('communities')
          .upload(fileName, mediaFile)
        
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('communities').getPublicUrl(fileName)
        mediaUrl = publicUrl
        mediaType = mediaFile.type.startsWith('video') ? 'video' : 'image'
      }

      const { error } = await supabase.from('community_posts').insert({
        community_id: community?.id,
        user_id: user.id,
        content: postContent.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType
      })

      if (error) throw error

      setPostContent("")
      setMediaFile(null)
      setMediaPreview(null)
      toast.success("Post created!")
      fetchPosts()
    } catch (error: any) {
      toast.error("Failed to post: " + error.message)
    } finally {
      setIsPosting(false)
    }
  }

  const toggleReaction = async (postId: string, isReacted: boolean) => {
    if (!user) return
    const supabase = createClient()
    if (isReacted) {
      await supabase.from('community_post_reactions').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('community_post_reactions').insert({ post_id: postId, user_id: user.id })
    }
    fetchPosts()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    )
  }

  if (!community) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Community not found</p>
        <button onClick={() => router.back()} className="text-green-600 font-medium">Go back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-bold font-syne truncate leading-tight">{community.name}</h1>
            <span className="text-[10px] text-muted-foreground font-medium">{memberCount} members</span>
          </div>
        </div>
        <button 
          onClick={openMenu}
          className="p-2 -mr-2 rounded-xl hover:bg-muted transition-colors active:scale-95"
        >
          <Menu className="w-6 h-6 text-foreground" strokeWidth={1.5} />
        </button>
      </header>

      <div className="w-full h-32 bg-gradient-to-br from-green-500/20 to-green-600/10 relative">
        <div className="absolute -bottom-10 left-6">
          {community.image_url ? (
            <img src={community.image_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-4 border-background shadow-xl" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-green-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-background shadow-xl">
              {community.name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pt-12 pb-6 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{community.name}</h2>
            <p className="text-xs text-muted-foreground font-medium mt-1">@{community.name.toLowerCase().replace(/\s+/g, '')}</p>
          </div>
          <button
            onClick={handleJoin}
            disabled={joining}
            className={`px-6 py-2.5 rounded-full font-bold text-[11px] uppercase tracking-widest transition-all active:scale-95 ${
              isMember ? "bg-muted text-muted-foreground" : "bg-green-600 text-white shadow-lg shadow-green-600/20"
            }`}
          >
            {joining ? <Loader2 className="w-6 h-6 animate-spin" /> : isMember ? "Joined" : "Join"}
          </button>
        </div>
        {community.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-lg">{community.description}</p>
        )}
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-6 space-y-6">
        {isMember && (
          <div className="bg-muted/30 rounded-3xl p-4 border border-border">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">
                {user?.profile_picture ? <img src={user.profile_picture} className="w-full h-full rounded-full object-cover" /> : user?.full_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share something with the community..."
                  className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm placeholder:text-muted-foreground"
                  rows={3}
                />
                
                {mediaPreview && (
                  <div className="relative mt-2 rounded-2xl overflow-hidden border border-border max-h-60">
                    {mediaFile?.type.startsWith('video') ? (
                      <video src={mediaPreview} className="w-full h-full object-cover" autoPlay muted loop />
                    ) : (
                      <img src={mediaPreview} className="w-full h-full object-cover" />
                    )}
                    <button 
                      onClick={() => {setMediaFile(null); setMediaPreview(null)}}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-md"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl hover:bg-muted text-green-600 transition-colors"
                      title="Add Media"
                    >
                      <ImageIcon className="w-6 h-6" />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleMediaSelect} accept="image/*,video/*" className="hidden" />
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={isPosting || (!postContent.trim() && !mediaFile)}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    {isPosting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {posts.map((post) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background rounded-3xl border border-border overflow-hidden shadow-sm"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href={`/home/profile?id=${post.user_id}`} className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border">
                    {post.user.profile_picture ? (
                      <img src={post.user.profile_picture} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-green-600 font-bold text-sm">
                        {post.user.full_name.charAt(0)}
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-col">
                    <Link href={`/home/profile?id=${post.user_id}`} className="text-sm font-bold hover:underline">{post.user.full_name}</Link>
                    <span className="text-[10px] text-muted-foreground font-medium">@{post.user.username} • {new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button className="p-2 text-muted-foreground hover:bg-muted rounded-full">
                  <MoreVertical className="w-6 h-6" />
                </button>
              </div>

              {post.content && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {renderTextWithMentions(post.content)}
                  </p>
                </div>
              )}

              {post.media_url && (
                <div className="aspect-video w-full bg-muted relative">
                  {post.media_type === 'video' ? (
                    <video src={post.media_url} className="w-full h-full object-cover" controls playsInline />
                  ) : (
                    <img src={post.media_url} className="w-full h-full object-cover" alt="" />
                  )}
                </div>
              )}

              <div className="p-4 flex items-center gap-6 border-t border-border">
                <button 
                  onClick={() => toggleReaction(post.id, post.is_reacted)}
                  className={`flex items-center gap-2 transition-all active:scale-90 ${post.is_reacted ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                >
                  <Heart className={`w-5 h-5 ${post.is_reacted ? "fill-current" : ""}`} />
                  <span className="text-[11px] font-black uppercase tracking-widest">{post.reaction_count}</span>
                </button>
                <button 
                  onClick={() => router.push(`/home/community/${community.id}/post/${post.id}`)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-green-600 transition-all active:scale-90"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-[11px] font-black uppercase tracking-widest">{post.comment_count}</span>
                </button>
              </div>
            </motion.div>
          ))}

          {!loading && posts.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest">No posts yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
