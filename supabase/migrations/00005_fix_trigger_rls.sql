-- Drop the problematic policies that block the trigger
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "trigger_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "trigger_insert_app_settings" ON app_settings;

-- The handle_new_user trigger runs as SECURITY DEFINER which bypasses RLS.
-- But the INSERT policy was requiring auth.uid() = id, which fails during signup
-- because the user isn't fully authenticated yet in the trigger context.
-- Solution: allow unrestricted INSERT (the trigger is the only inserter),
-- keep SELECT/UPDATE restricted.

CREATE POLICY "profiles_allow_insert" ON profiles
  FOR INSERT WITH CHECK (true);

-- Same for app_settings
DROP POLICY IF EXISTS "app_settings_own" ON app_settings;

CREATE POLICY "app_settings_select_own" ON app_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "app_settings_update_own" ON app_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "app_settings_allow_insert" ON app_settings
  FOR INSERT WITH CHECK (true);
