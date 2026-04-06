-- Fix infinite recursion: admin policy on profiles queries profiles itself.
-- Solution: use auth.jwt() to check role from JWT metadata instead of querying profiles.
-- First, drop all problematic admin policies that query profiles table.

DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

-- Profiles: user reads own row. No admin override needed here (admin is also a user).
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- For other tables, replace the admin check with a non-recursive version
-- using auth.uid() directly joined to profiles via a security definer function.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Now fix admin policies on other tables to use the function
DROP POLICY IF EXISTS "subscriptions_admin_select" ON subscriptions;
CREATE POLICY "subscriptions_admin_select" ON subscriptions
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "complaints_admin_select" ON complaints;
CREATE POLICY "complaints_admin_select" ON complaints
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "complaints_admin_update" ON complaints;
CREATE POLICY "complaints_admin_update" ON complaints
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "outage_reports_admin_select" ON outage_reports;
CREATE POLICY "outage_reports_admin_select" ON outage_reports
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "outage_reports_admin_update" ON outage_reports;
CREATE POLICY "outage_reports_admin_update" ON outage_reports
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "energy_reports_admin_select" ON energy_reports;
CREATE POLICY "energy_reports_admin_select" ON energy_reports
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "energy_reports_admin_update" ON energy_reports;
CREATE POLICY "energy_reports_admin_update" ON energy_reports
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "notifications_admin_select" ON notifications;
CREATE POLICY "notifications_admin_select" ON notifications
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "notifications_admin_insert" ON notifications;
CREATE POLICY "notifications_admin_insert" ON notifications
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "bills_cache_admin_select" ON bills_cache;
CREATE POLICY "bills_cache_admin_select" ON bills_cache
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "chat_sessions_admin_select" ON chat_sessions;
CREATE POLICY "chat_sessions_admin_select" ON chat_sessions
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "chat_messages_admin_select" ON chat_messages;
CREATE POLICY "chat_messages_admin_select" ON chat_messages
  FOR SELECT USING (is_admin());
