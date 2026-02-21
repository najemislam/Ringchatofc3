"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import bcrypt from "bcryptjs"

export default function DeleteAccountPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const deleteAccount = async () => {
    if (!user) return
    if (!password) {
      toast.error("Please enter your password")
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

    const isValid = await bcrypt.compare(password, userData.password_hash)
    if (!isValid) {
      toast.error("Incorrect password")
      setLoading(false)
      return
    }

    await supabase.from('messages').delete().eq('sender_id', user.id)
    await supabase.from('conversation_participants').delete().eq('user_id', user.id)
    await supabase.from('friends').delete().or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    await supabase.from('friend_requests').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    await supabase.from('followers').delete().or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)
    await supabase.from('blocked_users').delete().or(`user_id.eq.${user.id},blocked_id.eq.${user.id}`)
      await supabase.from('users').delete().eq('id', user.id)

    toast.success("Account deleted successfully")
    await logout()
    router.push("/")
  }

  if (!user) return null

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Delete Account</h1>
      </header>

      <div className="flex-1 p-4 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">Are you sure?</h2>
          <p className="text-muted-foreground text-center mb-8">
            This action is permanent and cannot be undone. All your data, messages, and connections will be permanently deleted.
          </p>

          <div className="w-full space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password to confirm"
                className="w-full px-4 py-4 pr-12 rounded-xl border border-border bg-background focus:ring-2 focus:ring-red-500 outline-none text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={deleteAccount}
              disabled={loading || !password}
              className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              {loading ? "Deleting Account..." : "Delete My Account"}
            </button>

            <button
              onClick={() => router.back()}
              className="w-full py-4 rounded-xl bg-muted hover:bg-muted/80 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
