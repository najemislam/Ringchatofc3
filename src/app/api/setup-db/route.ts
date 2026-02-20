import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create community_posts table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.community_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
          content TEXT,
          media_url TEXT,
          media_type TEXT CHECK (media_type IN ('text', 'image', 'video')),
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

      -- Create policies
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'Public community posts are viewable by everyone') THEN
              CREATE POLICY "Public community posts are viewable by everyone" ON public.community_posts FOR SELECT USING (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'Users can create their own posts') THEN
              CREATE POLICY "Users can create their own posts" ON public.community_posts FOR INSERT WITH CHECK (true);
          END IF;
      END $$;

      -- Enable Realtime for tables
      BEGIN;
        -- Create the publication if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
            CREATE PUBLICATION supabase_realtime;
          END IF;
        END $$;

        -- Add tables to publication
        DO $$
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE messages;
        EXCEPTION WHEN OTHERS THEN NULL; END $$;
        DO $$
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
        EXCEPTION WHEN OTHERS THEN NULL; END $$;
        DO $$
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
        EXCEPTION WHEN OTHERS THEN NULL; END $$;
        DO $$
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE users;
        EXCEPTION WHEN OTHERS THEN NULL; END $$;
         DO $$
         BEGIN
           ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
         EXCEPTION WHEN OTHERS THEN NULL; END $$;
      COMMIT;

      -- Function to update conversation updated_at
      CREATE OR REPLACE FUNCTION update_conversation_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE conversations
        SET updated_at = NOW()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger to update conversation updated_at on new message
      DROP TRIGGER IF EXISTS tr_update_conversation_timestamp ON messages;
      CREATE TRIGGER tr_update_conversation_timestamp
      AFTER INSERT ON messages
      FOR EACH ROW
      EXECUTE FUNCTION update_conversation_timestamp();
    `
  })

  if (error) {
    // If it fails because tables are already in publication, that's fine
    if (error.message.includes('already exists')) {
       return NextResponse.json({ success: true, message: "Realtime already configured" })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: "Realtime and triggers configured" })
}
