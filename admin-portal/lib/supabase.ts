import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pehberdmrsnaeqtlopbq.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_4scYTjZPs8EVA8hE7TUXBA_Zfk9vMie";

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
