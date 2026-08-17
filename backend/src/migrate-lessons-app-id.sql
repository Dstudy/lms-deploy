-- Migration: Add app_id to lessons table
-- Run this on existing databases that already have data in the lessons table.
-- 
-- STEP 1: Add the app_id column (nullable first so existing rows don't fail)
ALTER TABLE lessons
  ADD COLUMN app_id VARCHAR(36) NULL
    AFTER id;

-- STEP 2: If you have a default / first app, assign all existing lessons to it.
--         Replace <YOUR_DEFAULT_APP_ID> with the actual UUID from your apps table.
--         You can find it with:  SELECT id, slug, name FROM apps;
--
-- UPDATE lessons SET app_id = '<YOUR_DEFAULT_APP_ID>' WHERE app_id IS NULL;

-- STEP 3: Make app_id NOT NULL and add the FK + index
ALTER TABLE lessons
  MODIFY COLUMN app_id VARCHAR(36) NOT NULL,
  ADD KEY idx_lessons_app (app_id),
  ADD CONSTRAINT fk_lesson_app
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE;
