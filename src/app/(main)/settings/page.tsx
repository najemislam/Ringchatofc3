"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Moon, Sun, Bell, BellOff, Lock, LogOut, Trash2, ChevronRight, Eye, EyeOff, Download, Share2, Ban, X, Loader2, UsersRound, Menu } from "lucide-react"
import { toast } from "sonner"
import bcrypt from "bcryptjs"
import { useMenu } from "@/context/MenuContext"

import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"

export default function SettingsPage() {
  const router = useRouter()
  const { user, setUser, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { openMenu } = useMenu()
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showBlockedUsers, setShowBlockedUsers] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<{id: string, blocked_id: string, block_type: string, user: {id: string, full_name: string, username: string, profile_picture: string | null}}[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)

  const fetchBlockedUsers = async () => {
    if (!user) return
    setLoadingBlocked(true)
    const supabase = createClient()
    
    const { data } = await supabase
      .from('blocked_users')
      .select(`
        id,
        blocked_id,
        block_type,
        user:users!blocked_users_blocked_id_fkey(id, full_name, username, profile_picture)
      `)
      .eq('user_id', user.id)
    
    if (data) {
      setBlockedUsers(data as typeof blockedUsers)
    }
    setLoadingBlocked(false)
  }

  const unblockUser = async (blockId: string) => {
    setUnblockingId(blockId)
    const supabase = createClient()
    
    await supabase.from('blocked_users').delete().eq('id', blockId)
    
    setBlockedUsers(prev => prev.filter(b => b.id !== blockId))
    toast.success("User unblocked")
    setUnblockingId(null)
  }

  useEffect(() => {
    if (showBlockedUsers) {
      fetchBlockedUsers()
    }
  }, [showBlockedUsers, user])

  const toggleNotifications = async () => {
    if (!user) return
    const supabase = createClient()
    const newValue = !user.notifications_enabled

    await supabase
      .from('users')
      .update({ notifications_enabled: newValue })
      .eq('id', user.id)

    setUser({ ...user, notifications_enabled: newValue })
    toast.success(newValue ? "Notifications enabled" : "Notifications disabled")
  }

  const changePassword = async () => {
    if (!user) return
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill all fields")
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data: userData } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .single()

    if (!userData) {
      toast.error("User not found")
      setLoading(false)
      return
    }

    const isValid = await bcrypt.compare(currentPassword, userData.password_hash)
    if (!isValid) {
      toast.error("Current password is incorrect")
      setLoading(false)
      return
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', user.id)

    toast.success("Password changed successfully")
    setShowPasswordChange(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmNewPassword("")
    setLoading(false)
  }

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

    if (!user) return null

    return (
      <div className="flex flex-col min-h-full">
          <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-12 h-12 flex items-center justify-center -ml-2 rounded-xl hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold font-syne">Settings</h1>
            </div>
            <button 
              onClick={openMenu}
              className="w-12 h-12 flex items-center justify-center -mr-2 rounded-xl hover:bg-muted transition-colors active:scale-95"
            >
              <Menu className="w-6 h-6 text-foreground" />
            </button>
        </header>
        <div className="flex-1 p-4 space-y-2">
            <button
              onClick={toggleNotifications}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                  {user.notifications_enabled ? <Bell className="w-6 h-6 text-green-500" strokeWidth={1.5} /> : <BellOff className="w-6 h-6 text-green-500" strokeWidth={1.5} />}
                    <span className="font-medium text-sm">Notifications</span>
                </div>
              <div className={`w-11 h-6 rounded-full p-1 transition-colors ${user.notifications_enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${user.notifications_enabled ? 'translate-x-5' : ''}`} />
              </div>
            </button>

            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'light' ? <Sun className="w-6 h-6 text-green-500" strokeWidth={1.5} /> : <Moon className="w-6 h-6 text-green-500" strokeWidth={1.5} />}
                <span className="font-medium text-sm">Dark Mode</span>
              </div>
              <div className={`w-11 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : ''}`} />
              </div>
            </button>

            <button
              onClick={() => setShowBlockedUsers(!showBlockedUsers)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Ban className="w-5 h-5 text-green-500" strokeWidth={1.5} />
                <span className="font-medium text-sm">Blocked Users</span>
              </div>
              <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showBlockedUsers ? 'rotate-90' : ''}`} strokeWidth={1.5} />
            </button>

          {showBlockedUsers && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              {loadingBlocked ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
              ) : blockedUsers.length === 0 ? (
                <div className="p-6 text-center">
                  <Ban className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No blocked users</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {blockedUsers.map((blocked) => (
                    <div key={blocked.id} className="flex items-center gap-3 p-3">
                      {blocked.user?.profile_picture ? (
                        <img 
                          src={blocked.user.profile_picture} 
                          alt="" 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold">
                          {blocked.user?.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{blocked.user?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {blocked.block_type === 'full' ? 'Fully blocked' : 'Interactions blocked'}
                        </p>
                      </div>
                      <button
                        onClick={() => unblockUser(blocked.id)}
                        disabled={unblockingId === blocked.id}
                        className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {unblockingId === blocked.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Unblock"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
            >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-green-500" strokeWidth={1.5} />
              <span className="font-medium text-sm">Change Password</span>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showPasswordChange ? 'rotate-90' : ''}`} strokeWidth={1.5} />
          </button>

{showPasswordChange && (
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background focus:ring-2 focus:ring-green-500 outline-none"
                />
                <button
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background focus:ring-2 focus:ring-green-500 outline-none text-sm"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-green-500 outline-none"
              />
              <button
                onClick={changePassword}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-500 text-white font-medium"
              >
                {loading ? "Changing..." : "Change Password"}
              </button>
            </div>
          )}

          <div className="pt-4 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    toast.success("Download starting...", {
                      description: "You can also install this app by selecting 'Add to Home Screen' from your browser menu.",
                    })
                  }}
                  className="flex-1 flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                >
                  <Download className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                  <span className="font-medium text-sm text-green-600 dark:text-green-400">Download App</span>
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Ringchat',
                        text: 'Join me on Ringchat - the best way to connect with friends!',
                        url: window.location.origin,
                      }).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(window.location.origin);
                      toast.success("Link copied! Share it on Telegram.");
                    }
                  }}
                  className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                >
                  <Share2 className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                </button>
              </div>

              <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>

              <AlertDialogTrigger asChild>
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
                >
                  <LogOut className="w-5 h-5 text-orange-500" strokeWidth={1.5} />
                  <span className="font-medium text-sm text-orange-500">Log Out</span>
                </button>
              </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will need to enter your credentials again to access your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-orange-500 hover:bg-orange-600">Log Out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

<button
            onClick={() => router.push('/settings/delete-account')}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              <span className="font-medium text-sm text-red-500">Delete Account</span>
            </div>
            <ChevronRight className="w-5 h-5 text-red-500" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

