-- ============================================================
-- DIAA (ضياء) — Initial Database Schema
-- Run this in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable pgvector for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  avatar_url    TEXT,
  language      TEXT NOT NULL DEFAULT 'AR' CHECK (language IN ('AR', 'EN')),
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_verified   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_select_all" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 2. SUBSCRIPTIONS (1 per user, 13-digit JEPCO file number)
-- ============================================================
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  file_number             TEXT NOT NULL,
  distribution_company    TEXT NOT NULL DEFAULT 'JEPCO'
                          CHECK (distribution_company IN ('JEPCO', 'EDCO', 'IDECO')),
  household_size          INT NOT NULL DEFAULT 4 CHECK (household_size BETWEEN 1 AND 20),
  is_active               BOOLEAN DEFAULT TRUE,
  is_validated            BOOLEAN DEFAULT FALSE,
  subscriber_name         TEXT,
  meter_number            TEXT,
  file_number_changed_at  TIMESTAMPTZ DEFAULT now(),
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_admin_select" ON subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. APP SETTINGS (user preferences)
-- ============================================================
CREATE TABLE app_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  notifications_enabled   BOOLEAN DEFAULT TRUE,
  threshold_tier1_pct     INT DEFAULT 80,
  threshold_tier2_pct     INT DEFAULT 80,
  theme                   TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_own" ON app_settings
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 4. JEPCO CACHE (raw API responses with TTL)
-- ============================================================
CREATE TABLE jepco_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  data            JSONB NOT NULL,
  fetched_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  UNIQUE(subscription_id, endpoint)
);

ALTER TABLE jepco_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jepco_cache_own" ON jepco_cache
  FOR SELECT USING (
    subscription_id IN (SELECT id FROM subscriptions WHERE user_id = auth.uid())
  );

-- Edge functions use service_role to write, so no INSERT/UPDATE policy needed for users

-- ============================================================
-- 5. BILLS CACHE (parsed bills from JEPCO, scan, or manual)
-- ============================================================
CREATE TABLE bills_cache (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id       UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  source                TEXT NOT NULL CHECK (source IN ('jepco', 'manual', 'scan')),
  billing_period_start  DATE,
  billing_period_end    DATE,
  total_kwh             NUMERIC NOT NULL DEFAULT 0,
  total_amount_fils     NUMERIC NOT NULL DEFAULT 0,
  previous_reading      NUMERIC,
  current_reading       NUMERIC,
  due_date              DATE,
  is_paid               BOOLEAN DEFAULT FALSE,
  tier1_kwh             NUMERIC DEFAULT 0,
  tier2_kwh             NUMERIC DEFAULT 0,
  tier3_kwh             NUMERIC DEFAULT 0,
  tier1_cost_fils       NUMERIC DEFAULT 0,
  tier2_cost_fils       NUMERIC DEFAULT 0,
  tier3_cost_fils       NUMERIC DEFAULT 0,
  fuel_clause_fils      NUMERIC DEFAULT 0,
  rural_fee_fils        NUMERIC DEFAULT 0,
  meter_rent_fils       NUMERIC DEFAULT 200,
  tv_license_fils       NUMERIC DEFAULT 1000,
  municipality_tax_fils NUMERIC DEFAULT 0,
  subsidy_fils          NUMERIC DEFAULT 0,
  raw_ocr_data          JSONB,
  raw_jepco_data        JSONB,
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bills_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bills_cache_select_own" ON bills_cache
  FOR SELECT USING (
    subscription_id IN (SELECT id FROM subscriptions WHERE user_id = auth.uid())
  );

CREATE POLICY "bills_cache_insert_own" ON bills_cache
  FOR INSERT WITH CHECK (
    subscription_id IN (SELECT id FROM subscriptions WHERE user_id = auth.uid())
  );

CREATE POLICY "bills_cache_admin_select" ON bills_cache
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 6. BILL LINE ITEMS
-- ============================================================
CREATE TABLE bill_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id       UUID NOT NULL REFERENCES bills_cache(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN (
                  'energy_tier1', 'energy_tier2', 'energy_tier3',
                  'fuel_clause', 'rural_fee', 'meter_rent',
                  'tv_license', 'municipality_tax', 'subsidy_deduction',
                  'waste_fee', 'other'
                )),
  label         TEXT NOT NULL,
  label_ar      TEXT NOT NULL,
  amount_fils   NUMERIC NOT NULL,
  kwh           NUMERIC,
  rate_per_kwh  NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bill_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_line_items_select_own" ON bill_line_items
  FOR SELECT USING (
    bill_id IN (
      SELECT bc.id FROM bills_cache bc
      JOIN subscriptions s ON bc.subscription_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. USAGE SNAPSHOTS (daily aggregations for trends)
-- ============================================================
CREATE TABLE usage_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  kwh             NUMERIC NOT NULL,
  cost_fils       NUMERIC NOT NULL,
  tier            INT CHECK (tier BETWEEN 1 AND 3),
  daily_avg_kwh   NUMERIC,
  source          TEXT DEFAULT 'jepco' CHECK (source IN ('jepco', 'computed', 'demo')),
  raw_data        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subscription_id, snapshot_date)
);

ALTER TABLE usage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_snapshots_own" ON usage_snapshots
  FOR SELECT USING (
    subscription_id IN (SELECT id FROM subscriptions WHERE user_id = auth.uid())
  );

-- ============================================================
-- 8. ENVIRONMENTAL FOOTPRINT (computed from usage, per month)
-- ============================================================
CREATE TABLE environmental_footprint (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  month           DATE NOT NULL,
  total_kwh       NUMERIC NOT NULL,
  co2_kg          NUMERIC NOT NULL,
  water_liters    NUMERIC NOT NULL,
  trees_needed    INT NOT NULL,
  driving_km      NUMERIC NOT NULL,
  co2_change_pct  NUMERIC,
  kwh_change_pct  NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subscription_id, month)
);

ALTER TABLE environmental_footprint ENABLE ROW LEVEL SECURITY;

CREATE POLICY "footprint_own" ON environmental_footprint
  FOR SELECT USING (
    subscription_id IN (SELECT id FROM subscriptions WHERE user_id = auth.uid())
  );

-- ============================================================
-- 9. COMPLAINTS
-- ============================================================
CREATE TABLE complaints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  reference_number TEXT NOT NULL UNIQUE,
  complaint_type  TEXT NOT NULL CHECK (complaint_type IN (
                    'OUTAGE', 'BILLING', 'METER', 'VOLTAGE', 'OTHER'
                  )),
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                    'PENDING', 'IN_REVIEW', 'RESOLVED', 'CLOSED'
                  )),
  description     TEXT NOT NULL,
  description_ar  TEXT,
  admin_notes     TEXT,
  source          TEXT DEFAULT 'app' CHECK (source IN ('app', 'chatbot')),
  location_lat    NUMERIC,
  location_lng    NUMERIC,
  address         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "complaints_select_own" ON complaints
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "complaints_insert_own" ON complaints
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "complaints_admin_select" ON complaints
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "complaints_admin_update" ON complaints
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 10. OUTAGE REPORTS
-- ============================================================
CREATE TABLE outage_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  complaint_id    UUID REFERENCES complaints(id) ON DELETE SET NULL,
  reference_number TEXT NOT NULL UNIQUE,
  affected_area   TEXT CHECK (affected_area IN ('home', 'street', 'neighborhood')),
  description     TEXT,
  start_time      TIMESTAMPTZ,
  location_lat    NUMERIC NOT NULL,
  location_lng    NUMERIC NOT NULL,
  address         TEXT,
  status          TEXT NOT NULL DEFAULT 'REPORTED' CHECK (status IN (
                    'REPORTED', 'ACKNOWLEDGED', 'CREW_DISPATCHED', 'RESOLVED'
                  )),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE outage_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outage_reports_select_own" ON outage_reports
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "outage_reports_insert_own" ON outage_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "outage_reports_admin_select" ON outage_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "outage_reports_admin_update" ON outage_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 11. ENERGY REPORTS (bad behavior / hazards)
-- ============================================================
CREATE TABLE energy_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL UNIQUE,
  hazard_type     TEXT NOT NULL CHECK (hazard_type IN (
                    'DOWNED_WIRE', 'EXPOSED_WIRING', 'DAMAGED_POLE',
                    'SPARKING', 'ILLEGAL_CONNECTION', 'OTHER'
                  )),
  description     TEXT NOT NULL,
  photo_url       TEXT,
  location_lat    NUMERIC NOT NULL,
  location_lng    NUMERIC NOT NULL,
  address         TEXT,
  status          TEXT NOT NULL DEFAULT 'REPORTED' CHECK (status IN (
                    'REPORTED', 'UNDER_REVIEW', 'ACTION_TAKEN', 'CLOSED'
                  )),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE energy_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "energy_reports_select_own" ON energy_reports
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "energy_reports_insert_own" ON energy_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "energy_reports_admin_select" ON energy_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "energy_reports_admin_update" ON energy_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  title_ar        TEXT NOT NULL,
  body            TEXT NOT NULL,
  body_ar         TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN (
                    'threshold_warning', 'bill_due', 'bill_available',
                    'complaint_update', 'outage_update', 'tip',
                    'admin_broadcast', 'system'
                  )),
  related_type    TEXT,
  related_id      UUID,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User sees own notifications + broadcasts (user_id IS NULL)
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_insert" ON notifications
  FOR INSERT WITH CHECK (
    -- Users can't insert notifications directly (only edge functions via service_role)
    -- But admin can insert via admin portal
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "notifications_admin_select" ON notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 13. CHAT SESSIONS
-- ============================================================
CREATE TABLE chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  language        TEXT DEFAULT 'AR',
  is_active       BOOLEAN DEFAULT TRUE,
  context         JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_sessions_own" ON chat_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "chat_sessions_admin_select" ON chat_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 14. CHAT MESSAGES
-- ============================================================
CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  message_type    TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'action')),
  intent          TEXT,
  action_type     TEXT,
  action_ref_id   UUID,
  tokens_used     INT,
  model_used      TEXT,
  processing_ms   INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_own" ON chat_messages
  FOR ALL USING (
    session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "chat_messages_admin_select" ON chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 15. KNOWLEDGE DOCS (RAG vector store)
-- ============================================================
CREATE TABLE knowledge_docs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT NOT NULL,
  section_title   TEXT NOT NULL,
  content         TEXT NOT NULL,
  content_ar      TEXT,
  embedding       extensions.vector(1536),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE knowledge_docs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read knowledge docs
CREATE POLICY "knowledge_docs_read" ON knowledge_docs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create index for vector similarity search
CREATE INDEX knowledge_docs_embedding_idx ON knowledge_docs
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 10);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile + settings on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'language', 'AR')
  );
  INSERT INTO app_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- Auto-generate reference numbers
CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'complaints' AND NEW.reference_number IS NULL THEN
    NEW.reference_number := 'CMP-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  ELSIF TG_TABLE_NAME = 'outage_reports' AND NEW.reference_number IS NULL THEN
    NEW.reference_number := 'OUT-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  ELSIF TG_TABLE_NAME = 'energy_reports' AND NEW.reference_number IS NULL THEN
    NEW.reference_number := 'ENG-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ref_complaints BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION generate_reference_number();
CREATE TRIGGER set_ref_outages BEFORE INSERT ON outage_reports
  FOR EACH ROW EXECUTE FUNCTION generate_reference_number();
CREATE TRIGGER set_ref_energy BEFORE INSERT ON energy_reports
  FOR EACH ROW EXECUTE FUNCTION generate_reference_number();


-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ts_profiles BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER ts_subscriptions BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER ts_app_settings BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER ts_complaints BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER ts_outage_reports BEFORE UPDATE ON outage_reports
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER ts_energy_reports BEFORE UPDATE ON energy_reports
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER ts_chat_sessions BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- Notify on complaint status change
CREATE OR REPLACE FUNCTION notify_complaint_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, title_ar, body, body_ar, type, related_type, related_id)
    VALUES (
      NEW.user_id,
      'Complaint Update',
      'تحديث الشكوى',
      'Your complaint ' || NEW.reference_number || ' status: ' || NEW.status,
      'حالة شكواك ' || NEW.reference_number || ': ' || NEW.status,
      'complaint_update',
      'complaint',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_complaint_status_change
  AFTER UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION notify_complaint_update();


-- Enforce file_number change limit (once per 30 days)
CREATE OR REPLACE FUNCTION check_file_number_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.file_number IS DISTINCT FROM NEW.file_number THEN
    IF OLD.file_number_changed_at > now() - INTERVAL '30 days' THEN
      RAISE EXCEPTION 'File number can only be changed once per month. Next change allowed after %',
        (OLD.file_number_changed_at + INTERVAL '30 days')::DATE;
    END IF;
    NEW.file_number_changed_at = now();
    NEW.is_validated = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_file_number_change BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION check_file_number_change();


-- ============================================================
-- ENABLE REALTIME on key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;


-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_file ON subscriptions(file_number);
CREATE INDEX idx_jepco_cache_sub_ep ON jepco_cache(subscription_id, endpoint);
CREATE INDEX idx_bills_cache_sub ON bills_cache(subscription_id);
CREATE INDEX idx_bills_cache_period ON bills_cache(billing_period_end DESC);
CREATE INDEX idx_usage_snapshots_sub_date ON usage_snapshots(subscription_id, snapshot_date DESC);
CREATE INDEX idx_footprint_sub_month ON environmental_footprint(subscription_id, month DESC);
CREATE INDEX idx_complaints_user ON complaints(user_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_outage_reports_user ON outage_reports(user_id);
CREATE INDEX idx_energy_reports_user ON energy_reports(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, is_active);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
