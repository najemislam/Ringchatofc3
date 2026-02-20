import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { subscription, userId } = await request.json()

    if (!subscription || !userId) {
      return NextResponse.json({ error: "Missing subscription or userId" }, { status: 400 })
    }

    const pushData = {
      endpoint: subscription.endpoint,
      keys: subscription.keys
    }

    const { error } = await supabase
      .from("users")
      .update({ push_subscription: pushData })
      .eq("id", userId)

    if (error) {
      console.error("Error saving push subscription:", error)
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push subscription error:", error)
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    await supabase
      .from("users")
      .update({ push_subscription: null })
      .eq("id", userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push unsubscribe error:", error)
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 })
  }
}
