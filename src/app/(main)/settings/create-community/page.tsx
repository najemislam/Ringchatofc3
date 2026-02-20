"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Users, Globe, Shield, Loader2, Check } from "lucide-react"

type PostPermission = "everyone" | "admin"

export default function CreateCommunityPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [whoCanPost, setWhoCanPost] = useState<PostPermission>("everyone")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!user) return
    if (!name.trim()) {
      setError("Community name is required")
      return
    }

    setLoading(true)
    setError("")

    const supabase = createClient()

    const { data: community, error: createError } = await supabase
      .from("communities")
      .insert({
        name: name.trim(),
        description: description.trim(),
        creator_id: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error("Create error:", createError)
      setError("Failed to create community. Please try again.")
      setLoading(false)
      return
    }

      await supabase.from("community_members").insert({
        community_id: community.id,
        user_id: user.id
      })

    router.push(`/community/${community.id}`)
  }

  if (!user) return null

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Create Community</h1>
      </header>

      <div className="flex-1 p-4 space-y-6">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
        </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Community Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter community name"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this community about?"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                rows={3}
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Who can post?</label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setWhoCanPost("everyone")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    whoCanPost === "everyone"
                      ? "border-green-500 bg-green-500/10"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    whoCanPost === "everyone" ? "bg-green-500" : "bg-muted"
                  }`}>
                    <Globe className={`w-5 h-5 ${whoCanPost === "everyone" ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Everyone</p>
                  </div>
                  {whoCanPost === "everyone" && (
                    <Check className="w-6 h-6 text-green-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setWhoCanPost("admin")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    whoCanPost === "admin"
                      ? "border-green-500 bg-green-500/10"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    whoCanPost === "admin" ? "bg-green-500" : "bg-muted"
                  }`}>
                    <Shield className={`w-5 h-5 ${whoCanPost === "admin" ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Admin Only</p>
                  </div>
                  {whoCanPost === "admin" && (
                    <Check className="w-6 h-6 text-green-500" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl bg-green-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Community"
          )}
        </button>
      </div>
    </div>
  )
}
