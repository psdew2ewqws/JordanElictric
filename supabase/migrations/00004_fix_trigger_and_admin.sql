-- Fix: the trigger needs to bypass RLS when inserting profiles
-- The SECURITY DEFINER should handle it, but let's also grant explicit insert
CREATE POLICY "trigger_insert_profiles" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "trigger_insert_app_settings" ON app_settings
  FOR INSERT WITH CHECK (true);
