import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pehberdmrsnaeqtlopbq.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlaGJlcmRtcnNuYWVxdGxvcGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDg5MDksImV4cCI6MjA5MDk4NDkwOX0.mcASJPYipg-139n6CTpnxY0EEZ8cevHX0wq7mRRsvD4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if current user is admin
export async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, email, role, language")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return profile;
}
