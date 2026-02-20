"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function ProfileByUsernamePage({ params }: { params: { username: string } }) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    const lookupUser = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("username", params.username)
        .single()

      if (data) {
        // Redirect to profile page with id param
        router.replace(`/profile?id=${data.id}`)
      } else {
        router.replace("/chats")
      }
    }

    if (user) {
      lookupUser()
    } else {
      router.push("/login")
    }
  }, [params.username, user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  )
}
