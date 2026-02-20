"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { RingchatLogo } from "@/components/RingchatLogo"
import { Eye, EyeOff, ArrowLeft, CircleUserRound, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"
import bcrypt from "bcryptjs"

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      const supabase = createClient()
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.toLowerCase())
        .single()

      if (fetchError || !user) {
        setError("Invalid username or password")
        setLoading(false)
        return
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash)
      
      if (!passwordMatch) {
        setError("Invalid username or password")
        setLoading(false)
        return
      }

      await supabase
        .from('users')
        .update({ is_online: true })
        .eq('id', user.id)

      const userData = {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          gender: user.gender,
          date_of_birth: user.date_of_birth,
          bio: user.bio,
          profile_picture: user.profile_picture,
          notifications_enabled: user.notifications_enabled,
          is_online: true
        }
        setUser(userData)
        localStorage.setItem('ringchat_user', JSON.stringify(userData))

        toast.success("Welcome back!")
        router.push("/chats")
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-white to-green-50 dark:from-slate-900 dark:to-slate-800">
      <header className="flex items-center p-4 w-full">
        <Link href="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-8 pb-8 w-full">
          <RingchatLogo size={80} />
          <h1 className="mt-6 text-2xl font-bold font-syne">Welcome Back</h1>
        <p className="mt-2 text-muted-foreground">Log in to your account</p>

          <div className="mt-8 w-full max-w-sm md:max-w-md space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Username</label>
            <div className="relative">
              <CircleUserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" strokeWidth={1.5} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="username"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" strokeWidth={1.5} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !username || !password}
            className="w-full py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-lg shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 disabled:opacity-50 mt-6"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-green-600 dark:text-green-400 font-medium">
              Create Account
            </Link>
          </p>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground w-full">
        © Ringchat 2026. All rights reserved.
      </footer>
    </div>
  )
}
