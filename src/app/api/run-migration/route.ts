import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results: Record<string, string> = {}

  // 1. Add blocker_id to blocked_users (alias for user_id)
  try {
    const { error } = await supabase.rpc("run_sql", {
      query: "ALTER TABLE public.blocked_users ADD COLUMN IF NOT EXISTS blocker_id UUID REFERENCES public.users(id) ON DELETE CASCADE"
    })
    results.blocked_users_blocker_id = error ? `rpc failed: ${error.message}` : "ok"
  } catch (e: any) {
    results.blocked_users_blocker_id = `error: ${e.message}`
  }

  // 2. Try via a direct insert pattern to check if column was added
  // Actually let's try the pg approach via the Supabase edge function-style
  // Since rpc doesn't work, let's try REST PATCH to add a generated column
  
  // Better: test if blocker_id now exists
  const { error: testBlocker } = await supabase
    .from("blocked_users")
    .select("blocker_id")
    .limit(1)
  results.blocked_users_blocker_exists = testBlocker ? `no: ${testBlocker.message}` : "yes"

  return NextResponse.json({ results })
}
