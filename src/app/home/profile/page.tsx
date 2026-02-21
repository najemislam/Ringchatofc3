"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { 
  Upload, 
  Loader2, 
  MessageCircle,
  ArrowLeft,
  CircleUserRound,
  MapPin,
  Phone,
  Mail,
  Globe,
  X,
  MoreVertical,
  Search,
  Settings,
  Ban,
  UserRoundMinus,
    AtSign,
    Cake,
    Menu,
    UserRoundPlus,
    Camera,
    UserRoundPen
  } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaGithub, FaTiktok, FaYoutube } from "react-icons/fa"
import { toast } from "sonner"
import { useMenu } from "@/context/MenuContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const COUNTRIES = [
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "Russia", code: "+7", flag: "🇷🇺" },
  { name: "Mexico", code: "+52", flag: "🇲🇽" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳" },
  { name: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "Iran", code: "+98", flag: "🇮🇷" },
  { name: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "Italy", code: "+39", flag: "🇮🇹" },
  { name: "Spain", code: "+34", flag: "🇪🇸" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "UAE", code: "+971", flag: "🇦🇪" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "Nepal", code: "+977", flag: "🇳🇵" },
  { name: "Sri Lanka", code: "+94", flag: "🇱🇰" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "Netherlands", code: "+31", flag: "🇳🇱" },
  { name: "Poland", code: "+48", flag: "🇵🇱" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
]
import Link from "next/link"
import { 
  AlertDialog, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
} from "@/components/ui/alert-dialog"

interface Stats {
  friends: number
  followers: number
  following: number
}

interface SocialLinks {
  facebook?: string
  instagram?: string
  twitter?: string
  linkedin?: string
  github?: string
  tiktok?: string
  youtube?: string
  website?: string
}

interface UserData {
  id: string
  full_name: string
  username: string
  profile_picture: string | null
  bio: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  gender?: string | null
  date_of_birth?: string | null
  social_links?: SocialLinks | null
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}

function ProfileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user: currentUser, setUser: setCurrentUser, loading: authLoading } = useAuth()
  const { openMenu } = useMenu()
  const profileId = searchParams.get("id") || currentUser?.id
  const isOwnProfile = profileId === currentUser?.id

  const [profileUser, setProfileUser] = useState<UserData | null>(null)
  const [stats, setStats] = useState<Stats>({ friends: 0, followers: 0, following: 0 })
  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isFriend, setIsFriend] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollower, setIsFollower] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockType, setBlockType] = useState<'full' | 'partial' | null>(null)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

const [editForm, setEditForm] = useState({
      full_name: "",
      bio: "",
      country: "",
      phone: "",
      email: "",
      gender: "",
      date_of_birth: "",
      social_links: {
        facebook: "",
        instagram: "",
        twitter: "",
        linkedin: "",
        github: "",
        tiktok: "",
        youtube: "",
        website: ""
      } as SocialLinks
    })
  
    const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
    if (!profileId) return
    setLoading(true)
    const supabase = createClient()
    
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', profileId)
        .single()
      
      if (error) {
        console.error("Error fetching user:", error)
        setLoading(false)
        return
      }
      
      if (userData) {
        setProfileUser({
          id: userData.id,
          full_name: userData.full_name,
          username: userData.username,
          profile_picture: userData.profile_picture,
          bio: userData.bio,
          address: userData.address || null,
          phone: userData.phone || null,
          email: userData.email || null,
          gender: userData.gender || null,
          date_of_birth: userData.date_of_birth || null,
          social_links: userData.social_links || null
        })
          setBio(userData.bio || "")
        
if (isOwnProfile) {
            setEditForm({
              full_name: userData.full_name || "",
              bio: userData.bio || "",
              country: userData.address || "",
              phone: userData.phone || "",
              email: userData.email || "",
              gender: userData.gender || "",
              date_of_birth: userData.date_of_birth || "",
              social_links: userData.social_links || {}
            })
          }
      }

      const [{ count: friendsCount }, { count: followersCount }, { count: followingCount }] = await Promise.all([
        supabase.from('friends').select('*', { count: 'exact', head: true }).eq('user_id', profileId),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', profileId)
      ])
      
      setStats({
        friends: friendsCount || 0,
        followers: followersCount || 0,
        following: followingCount || 0
      })

        if (!isOwnProfile && currentUser) {
          const [friendRes, followingRes, followerRes, blockedRes] = await Promise.all([
            supabase.from('friends').select('id').eq('user_id', currentUser.id).eq('friend_id', profileId).maybeSingle(),
            supabase.from('followers').select('id').eq('follower_id', currentUser.id).eq('following_id', profileId).maybeSingle(),
            supabase.from('followers').select('id').eq('follower_id', profileId).eq('following_id', currentUser.id).maybeSingle(),
            supabase.from('blocked_users').select('id, block_type').eq('user_id', currentUser.id).eq('blocked_id', profileId).maybeSingle()
          ])
          setIsFriend(!!friendRes.data)
          setIsFollowing(!!followingRes.data)
          setIsFollower(!!followerRes.data)
          setIsBlocked(!!blockedRes.data)
          setBlockType(blockedRes.data?.block_type || null)
        }

    } catch (error) {
      console.error("Error fetching profile data:", error)
    } finally {
      setLoading(false)
    }
  }

useEffect(() => {
      if (!authLoading && profileId) {
        fetchData()
      }
    }, [profileId, currentUser?.id, authLoading])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !isOwnProfile) return
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement("canvas")
        const size = Math.min(img.width, img.height)
        canvas.width = 400
        canvas.height = 400
        
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2
        
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400)
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
        
        const supabase = createClient()
        const { error } = await supabase
          .from('users')
          .update({ profile_picture: dataUrl })
          .eq('id', currentUser.id)

        if (!error) {
          setCurrentUser({ ...currentUser, profile_picture: dataUrl })
          setProfileUser({ ...profileUser!, profile_picture: dataUrl })
          toast.success("Profile picture updated!")
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
    }, [currentUser, isOwnProfile, profileUser, setCurrentUser])



  const saveBio = async () => {
    if (!currentUser || !isOwnProfile) return
    setSaving(true)
    
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ bio })
      .eq('id', currentUser.id)

    if (!error) {
      setCurrentUser({ ...currentUser, bio })
      setProfileUser({ ...profileUser!, bio })
      setIsEditing(false)
      toast.success("Bio updated!")
    }
    
    setSaving(false)
  }

  const saveProfile = async () => {
    if (!currentUser || !isOwnProfile) return
    setSaving(true)
    
    const supabase = createClient()
    
const updateData: Record<string, any> = {
        full_name: editForm.full_name,
        bio: editForm.bio,
        gender: editForm.gender,
        date_of_birth: editForm.date_of_birth
      }
      
      if (editForm.country) updateData.address = editForm.country
      if (editForm.phone) updateData.phone = editForm.phone
    if (editForm.email) updateData.email = editForm.email
    if (Object.values(editForm.social_links).some(v => v)) {
      updateData.social_links = editForm.social_links
    }
    
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', currentUser.id)

    if (error) {
      console.error("Profile update error:", error)
      toast.error(`Failed to update profile: ${error.message}`)
    } else {
      setCurrentUser({ ...currentUser, full_name: editForm.full_name, bio: editForm.bio })
      setProfileUser({ 
        ...profileUser!, 
        full_name: editForm.full_name,
        bio: editForm.bio,
        address: editForm.country,
        phone: editForm.phone,
        email: editForm.email,
        gender: editForm.gender,
        date_of_birth: editForm.date_of_birth,
        social_links: editForm.social_links
      })
      setBio(editForm.bio)
      setShowEditModal(false)
      toast.success("Profile updated!")
    }
    
    setSaving(false)
  }

  const handleAction = async () => {
    if (!currentUser || !profileId) return
    const supabase = createClient()

    if (isFollowing) {
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profileId)

      if (!error) {
        await supabase
          .from('friends')
          .delete()
          .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${currentUser.id})`)
        
        setIsFollowing(false)
        setIsFriend(false)
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }))
        toast.success("Unfollowed")
      }
      return
    }

    const { error } = await supabase
      .from('followers')
      .upsert({
        follower_id: currentUser.id,
        following_id: profileId
      })

    if (!error) {
      setIsFollowing(true)
      setStats(prev => ({ ...prev, followers: prev.followers + 1 }))
      
      if (isFollower) {
        await supabase.from('friends').upsert([
          { user_id: currentUser.id, friend_id: profileId },
          { user_id: profileId, friend_id: currentUser.id }
        ])
        setIsFriend(true)
        toast.success("Mutual follow! You are now friends.")
      } else {
        toast.success("Following")
      }
      
      await supabase.from('notifications').insert({
        user_id: profileId,
        sender_id: currentUser.id,
        type: 'follow',
        content: 'started following you'
      })
    }
  }

  const startChat = async () => {
    if (!currentUser || !profileId) return
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUser.id)

    if (existing) {
      for (const conv of existing) {
        const { data: other } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', profileId)
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
        { conversation_id: newConv.id, user_id: currentUser.id },
        { conversation_id: newConv.id, user_id: profileId }
      ])
      router.push(`/home/chat/${newConv.id}`)
    }
  }

  const openSocialLink = (url: string) => {
    if (url) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`
      window.parent.postMessage({ type: "OPEN_EXTERNAL_URL", data: { url: fullUrl } }, "*")
    }
  }

  if (authLoading || (loading && !profileUser)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!currentUser && !searchParams.get("id")) {
    router.push('/login')
    return null
  }

  if (!profileUser) return null

  const socialLinks = profileUser?.social_links || {}

  return (
        <div className="flex flex-col min-h-screen bg-background pb-24">
            {/* Top navigation bar */}
            <div className="flex items-center justify-between px-2 pt-2 pb-2 bg-background border-b border-border">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 flex items-center justify-center rounded-full text-foreground active:scale-95 transition-transform hover:bg-muted"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={2} />
              </button>

              <div className="flex items-center gap-1">
                {isOwnProfile && (
                  <Link href="/home/search" className="w-10 h-10 flex items-center justify-center rounded-full text-foreground active:scale-95 transition-transform hover:bg-muted">
                    <Search className="w-5 h-5" strokeWidth={2} />
                  </Link>
                )}
                
                {isOwnProfile ? (
                  <Link href="/home/settings" className="w-10 h-10 flex items-center justify-center rounded-full text-foreground active:scale-95 transition-transform hover:bg-muted">
                    <Settings className="w-5 h-5" strokeWidth={2} />
                  </Link>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-10 h-10 flex items-center justify-center rounded-full text-foreground active:scale-95 transition-transform hover:bg-muted">
                        <MoreVertical className="w-5 h-5" strokeWidth={2} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {isBlocked ? (
                        <DropdownMenuItem 
                          onClick={async () => {
                            if (!currentUser || !profileId) return
                            const supabase = createClient()
                            await supabase.from('blocked_users').delete().eq('user_id', currentUser.id).eq('blocked_id', profileId)
                            setIsBlocked(false)
                            setBlockType(null)
                            toast.success("User unblocked")
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Unblock User</span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => setShowBlockDialog(true)}
                          className="gap-2 cursor-pointer"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Block User</span>
                        </DropdownMenuItem>
                      )}
                      
                      {isFriend && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={async () => {
                              if (!currentUser || !profileId) return
                              const supabase = createClient()
                              
                                await Promise.all([
                                  supabase.from('friends').delete().eq('user_id', currentUser.id).eq('friend_id', profileId),
                                  supabase.from('friends').delete().eq('user_id', profileId).eq('friend_id', currentUser.id),
                                  supabase.from('followers').delete().eq('follower_id', currentUser.id).eq('following_id', profileId),
                                  supabase.from('followers').delete().eq('follower_id', profileId).eq('following_id', currentUser.id)
                                ])
                                
                                setIsFriend(false)
                                setIsFollowing(false)
                                setIsFollower(false)
                                setStats(prev => ({ ...prev, friends: Math.max(0, prev.friends - 1), followers: Math.max(0, prev.followers - 1), following: Math.max(0, prev.following - 1) }))
                                toast.success("Friend removed and unfollowed")
  
                            }}
                            className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                          >
                            <UserRoundMinus className="w-4 h-4" />
                            <span>Unfriend</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <button 
                  onClick={openMenu}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-foreground active:scale-95 transition-transform hover:bg-muted"
                >
                  <Menu className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Profile info section */}
            <div className="relative px-4 pt-5 pb-4 bg-background">
              {/* Profile picture */}
              <div className="relative group w-fit">
                <div 
                  className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border shadow-lg cursor-pointer"
                  onClick={() => isOwnProfile && fileInputRef.current?.click()}
                >
                  {profileUser.profile_picture ? (
                    <img src={profileUser.profile_picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-2xl font-black text-green-600/30">{profileUser.full_name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                {isOwnProfile && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white border-2 border-background">
                    <Camera className="w-3 h-3" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Full Name and @username */}
              <div className="mt-3 flex items-baseline gap-2">
                <h2 className="text-xl font-black tracking-tight font-sans">{profileUser.full_name}</h2>
                <p className="text-muted-foreground font-medium text-sm font-sans">@{profileUser.username}</p>
              </div>

              {/* Stats: Followers, Following */}
              <div className="mt-3 flex items-center gap-5 text-sm font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{stats.followers}</span>
                  <span className="text-muted-foreground">Followers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{stats.following}</span>
                  <span className="text-muted-foreground">Following</span>
                </div>
              </div>

              {/* Bio */}
              {profileUser.bio && (
                <p className="mt-3 text-sm text-muted-foreground font-medium leading-relaxed">
                  {profileUser.bio}
                </p>
              )}

                {/* Action buttons */}
              <div className="flex items-center gap-2 mt-4">
                {isOwnProfile ? (
                  <>
                    <button 
                      onClick={() => setShowEditModal(true)}
                      className="flex-1 h-10 flex items-center justify-center gap-2 rounded-full border border-border text-foreground transition-all active:scale-95 hover:bg-muted font-bold text-sm"
                    >
                      <UserRoundPen className="w-[18px] h-[18px]" strokeWidth={2} />
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleAction}
                      className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-full font-bold text-sm active:scale-[0.98] transition-all ${
                        isFriend 
                          ? "border border-border text-muted-foreground" 
                          : isFollowing 
                          ? "border border-green-600 text-green-600" 
                          : "bg-green-600 text-white shadow-lg shadow-green-600/20"
                      }`}
                    >
                      <UserRoundPlus className="w-4 h-4" strokeWidth={2} />
                      <span>{isFriend ? "Friends" : isFollowing ? "Following" : isFollower ? "Follow Back" : "Follow"}</span>
                    </button>
                    <button 
                      onClick={startChat}
                      className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border border-border text-green-600 active:scale-95 transition-transform hover:bg-muted"
                    >
                      <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            </div>

      <div className="flex-1">
          <div className="p-6 space-y-6">
              {/* Box 1: Bio */}
              {profileUser.bio && (
                <div className="bg-muted/30 rounded-3xl p-6 border border-border">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Bio</p>
                  <p className="text-sm font-medium leading-relaxed">
                    {profileUser.bio}
                  </p>
                </div>
              )}

              {/* Box 2: Personal Info */}
              <div className="bg-muted/30 rounded-3xl p-6 border border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Personal Info</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CircleUserRound className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-base font-bold font-sans">{profileUser.full_name}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <AtSign className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-base font-bold font-sans">@{profileUser.username}</p>
                  </div>

                  {profileUser.date_of_birth && (
                    <div className="flex items-center gap-3">
                      <Cake className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <p className="text-base font-bold font-sans">
                        {new Date(profileUser.date_of_birth).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  {profileUser.gender && (
                    <div className="flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">
                        {profileUser.gender.toLowerCase() === 'male' ? '♂️' : '♀️'}
                      </span>
                      <p className="text-base font-bold font-sans capitalize">{profileUser.gender}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 3: Contact Info */}
              {(profileUser.address || profileUser.phone || profileUser.email) && (
                <div className="bg-muted/30 rounded-3xl p-6 border border-border">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Contact Details</p>
                  <div className="space-y-5">
                    {profileUser.address && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Country</p>
                          <p className="text-sm font-medium mt-1">
                            {COUNTRIES.find(c => c.name === profileUser.address)?.flag || ""} {profileUser.address}
                          </p>
                        </div>
                      </div>
                    )}

                    {profileUser.phone && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mobile</p>
                          <p className="text-sm font-medium mt-1">{profileUser.phone}</p>
                        </div>
                      </div>
                    )}

                    {profileUser.email && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</p>
                          <p className="text-sm font-medium mt-1">{profileUser.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Box 4: Social Links */}
              {Object.values(socialLinks).some(v => v) && (
                <div className="bg-muted/30 rounded-3xl p-6 border border-border">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Social Presence</p>
                  <div className="flex flex-wrap gap-3">
                    {socialLinks.facebook && (
                      <button 
                        onClick={() => openSocialLink(socialLinks.facebook!)}
                        className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <FaFacebook className="w-6 h-6" />
                      </button>
                    )}
                    {socialLinks.instagram && (
                      <button 
                        onClick={() => openSocialLink(socialLinks.instagram!)}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <FaInstagram className="w-6 h-6" />
                      </button>
                    )}
                    {socialLinks.twitter && (
                      <button 
                        onClick={() => openSocialLink(socialLinks.twitter!)}
                        className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <FaTwitter className="w-6 h-6" />
                      </button>
                    )}
                    {socialLinks.linkedin && (
                      <button 
                        onClick={() => openSocialLink(socialLinks.linkedin!)}
                        className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <FaLinkedin className="w-6 h-6" />
                      </button>
                    )}
                    {socialLinks.github && (
                      <button 
                        onClick={() => openSocialLink(socialLinks.github!)}
                        className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <FaGithub className="w-6 h-6" />
                      </button>
                    )}
                    {socialLinks.tiktok && (
                      <button 
                        onClick={() => openSocialLink(socialLinks.tiktok!)}
                        className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <FaTiktok className="w-6 h-6" />
                      </button>
                    )}
                    {socialLinks.youtube && (
                      <button 
                        onClick={() => openSocialLink(socialLinks.youtube!)}
                        className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <FaYoutube className="w-6 h-6" />
                      </button>
                    )}
                    {socialLinks.website && (
                      <button 
                        onClick={() => openSocialLink(socialLinks.website!)}
                        className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <Globe className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!profileUser.address && !profileUser.phone && !profileUser.email && !Object.values(socialLinks).some(v => v) && (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-30 gap-2">
                  <CircleUserRound className="w-4 h-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    No information added yet
                  </p>
                </div>
              )}
            </div>
      </div>

          {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
            <div className="bg-background w-full max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom-4 shadow-2xl">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <h2 className="text-lg font-black">Edit Profile</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div 
                      className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-green-600 cursor-pointer shadow-xl transition-transform active:scale-95"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {profileUser.profile_picture ? (
                        <img src={profileUser.profile_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-black text-green-600/30">{profileUser.full_name.charAt(0)}</span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white border-4 border-background shadow-lg active:scale-90 transition-transform"
                    >
                      <Upload className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-3">Tap to change photo</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full mt-2 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Write something about yourself..."
                    className="w-full mt-2 px-4 py-3 rounded-xl border border-border bg-muted/50 resize-none focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                    rows={3}
                    maxLength={150}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gender</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full mt-2 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium appearance-none cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date of Birth</label>
                    <input
                      type="date"
                      value={editForm.date_of_birth}
                      onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                      className="w-full mt-2 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-black uppercase tracking-widest text-green-600 mb-4">Contact Information</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Country</label>
                      <select
                        value={editForm.country}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        className="w-full mt-2 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium appearance-none cursor-pointer"
                      >
                        <option value="">Select Country</option>
                        {COUNTRIES.map((country) => (
                          <option key={country.name} value={country.name}>
                            {country.flag} {country.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phone</label>
                      <div className="flex gap-2 mt-2">
                        <div className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm font-bold text-muted-foreground min-w-[80px] text-center">
                          {editForm.country ? COUNTRIES.find(c => c.name === editForm.country)?.code || "+00" : "+00"}
                        </div>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="Phone number"
                          className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="Your email address"
                        className="w-full mt-2 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-black uppercase tracking-widest text-green-600 mb-4">Social Media Links</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                        <FaFacebook className="w-5 h-5" />
                      </div>
                      <input
                        type="url"
                        value={editForm.social_links?.facebook || ""}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, facebook: e.target.value } })}
                        placeholder="Facebook URL"
                        className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center text-white flex-shrink-0">
                        <FaInstagram className="w-5 h-5" />
                      </div>
                      <input
                        type="url"
                        value={editForm.social_links?.instagram || ""}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, instagram: e.target.value } })}
                        placeholder="Instagram URL"
                        className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white flex-shrink-0">
                        <FaTwitter className="w-5 h-5" />
                      </div>
                      <input
                        type="url"
                        value={editForm.social_links?.twitter || ""}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, twitter: e.target.value } })}
                        placeholder="Twitter/X URL"
                        className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white flex-shrink-0">
                        <FaLinkedin className="w-5 h-5" />
                      </div>
                      <input
                        type="url"
                        value={editForm.social_links?.linkedin || ""}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, linkedin: e.target.value } })}
                        placeholder="LinkedIn URL"
                        className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white flex-shrink-0">
                        <FaGithub className="w-5 h-5" />
                      </div>
                      <input
                        type="url"
                        value={editForm.social_links?.github || ""}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, github: e.target.value } })}
                        placeholder="GitHub URL"
                        className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white flex-shrink-0">
                        <FaTiktok className="w-5 h-5" />
                      </div>
                      <input
                        type="url"
                        value={editForm.social_links?.tiktok || ""}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, tiktok: e.target.value } })}
                        placeholder="TikTok URL"
                        className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white flex-shrink-0">
                        <FaYoutube className="w-5 h-5" />
                      </div>
                      <input
                        type="url"
                        value={editForm.social_links?.youtube || ""}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, youtube: e.target.value } })}
                        placeholder="YouTube URL"
                        className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white flex-shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <input
                        type="url"
                        value={editForm.social_links?.website || ""}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, website: e.target.value } })}
                        placeholder="Website URL"
                        className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border bg-muted/10 flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-4 rounded-full border-2 border-border text-muted-foreground font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex-1 py-4 rounded-full bg-green-600 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-green-700 shadow-lg shadow-green-600/20 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Block User Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black">Block {profileUser?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Choose how you want to block this user
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 py-4">
            <button
                onClick={async () => {
                  if (!currentUser || !profileId) return
                  const supabase = createClient()
                  await supabase.from('blocked_users').insert({ 
                    user_id: currentUser.id, 
                    blocked_id: profileId,
                    block_type: 'full'
                  })
                  
                  await Promise.all([
                    supabase.from('followers').delete().or(`and(follower_id.eq.${currentUser.id},following_id.eq.${profileId}),and(follower_id.eq.${profileId},following_id.eq.${currentUser.id})`),
                    supabase.from('friends').delete().or(`and(user_id.eq.${currentUser.id},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${currentUser.id})`)
                  ])

                  setIsBlocked(true)
                  setBlockType('full')
                  setIsFollowing(false)
                  setIsFriend(false)
                  setShowBlockDialog(false)
                  toast.success("User completely blocked")
                }}

              className="w-full p-4 rounded-2xl border-2 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 text-left hover:border-red-500 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white">
                  <Ban className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-600 dark:text-red-400">Complete Block</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Block everything - messages, interactions, profile view
                  </p>
                </div>
              </div>
            </button>

            <button
                onClick={async () => {
                  if (!currentUser || !profileId) return
                  const supabase = createClient()
                  await supabase.from('blocked_users').insert({ 
                    user_id: currentUser.id, 
                    blocked_id: profileId,
                    block_type: 'partial'
                  })

                  await supabase.from('friends').delete().or(`and(user_id.eq.${currentUser.id},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${currentUser.id})`)

                  setIsBlocked(true)
                  setBlockType('partial')
                  setIsFriend(false)
                  setShowBlockDialog(false)
                  toast.success("User interaction blocked")
                }}

              className="w-full p-4 rounded-2xl border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 text-left hover:border-orange-500 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-orange-600 dark:text-orange-400">Interaction Block</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Block messages, reactions, comments, shares - but can view profile
                  </p>
                </div>
              </div>
            </button>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full font-bold">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
