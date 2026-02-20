import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  "mailto:ringchat@app.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, icon, url, data } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const { data: user } = await supabase
      .from("users")
      .select("push_subscription")
      .eq("id", userId)
      .single()

    if (!user?.push_subscription) {
      return NextResponse.json({ message: "No subscription found" })
    }

    const subscription = user.push_subscription

    const payload = JSON.stringify({
      title: title || "",
      body: body || "You have a new notification",
      icon: "/logo.svg",
      badge: "/logo.svg",
      senderIcon: icon,
      url: url || "/home/notifications",
      timestamp: new Date().toISOString(),
      data
    })

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys
        },
        payload
      )
      return NextResponse.json({ success: true })
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await supabase
          .from("users")
          .update({ push_subscription: null })
          .eq("id", userId)
      }
      return NextResponse.json({ success: false, error: error.message })
    }
  } catch (error) {
    console.error("Push send error:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
