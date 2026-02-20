import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Add reaction column to messages if not exists
  // We do this by trying to select it - if it fails, we know it doesn't exist
  const { error: checkError } = await supabase
    .from("messages")
    .select("reaction")
    .limit(1)

  if (checkError && checkError.message.includes("reaction")) {
    return NextResponse.json({
      needsMigration: true,
      message: "Please run this SQL in your Supabase SQL Editor:",
      sql: "ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reaction text;"
    })
  }

  return NextResponse.json({ success: true, message: "reaction column already exists" })
}
