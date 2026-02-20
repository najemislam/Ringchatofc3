"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  username: string
  full_name: string
  gender: string
  date_of_birth: string
  bio: string
  profile_picture: string
  notifications_enabled: boolean
  is_online: boolean
}

interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Immediate check of local storage to prevent flicker
    const storedUser = localStorage.getItem('ringchat_user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error("Error parsing stored user", e)
      }
    }

    // Check initial session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Fetch full user data from public.users table
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
          setUser(userData)
          localStorage.setItem('ringchat_user', JSON.stringify(userData))
        }
      } else {
        // If no Supabase session, check if we have a stored user ID
        const storedUserStr = localStorage.getItem('ringchat_user')
        if (storedUserStr) {
          try {
            const storedUser = JSON.parse(storedUserStr)
            if (storedUser && storedUser.id) {
              // Verify user still exists in DB
              const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', storedUser.id)
                .single()
              
              if (userData) {
                setUser(userData)
                localStorage.setItem('ringchat_user', JSON.stringify(userData))
              } else {
                setUser(null)
                localStorage.removeItem('ringchat_user')
              }
            }
          } catch (e) {
            setUser(null)
            localStorage.removeItem('ringchat_user')
          }
        } else {
          setUser(null)
        }
      }
      setLoading(false)
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
          setUser(userData)
          localStorage.setItem('ringchat_user', JSON.stringify(userData))
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED' && !session) {
        setUser(null)
        localStorage.removeItem('ringchat_user')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('ringchat_user', JSON.stringify(user))
      const supabase = createClient()
      supabase.from('users').update({ is_online: true }).eq('id', user.id).then(() => {})
    } else {
      localStorage.removeItem('ringchat_user')
    }
  }, [user])

  const logout = async () => {
    const supabase = createClient()
    if (user) {
      await supabase.from('users').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', user.id)
    }
    await supabase.auth.signOut()
    setUser(null)
    localStorage.removeItem('ringchat_user')
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
