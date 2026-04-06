-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', TRUE),
  ('bill-photos', 'bill-photos', FALSE),
  ('report-photos', 'report-photos', FALSE);

-- Avatars: public read, authenticated upload own
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars_own_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Bill photos: only own
CREATE POLICY "bill_photos_own_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'bill-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "bill_photos_own_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'bill-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Report photos: only own
CREATE POLICY "report_photos_own_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'report-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "report_photos_own_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'report-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
