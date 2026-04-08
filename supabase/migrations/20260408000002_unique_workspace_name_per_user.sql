-- Prevent duplicate workspace rows per user by enforcing uniqueness at DB level.
-- Root cause: WorkspaceContext and OnboardingComplete both independently INSERT
-- a "Main Account" row on signup, racing each other and creating duplicates.

-- Step 1: Remove existing duplicates, keeping the row with the most minutes (or earliest created).
DELETE FROM public.workspace_settings
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, workspace_name
        ORDER BY COALESCE(minute_limit, 0) DESC, created_at ASC
      ) AS rn
    FROM public.workspace_settings
  ) ranked
  WHERE rn > 1
);

-- Step 2: Add unique constraint so this can never happen again.
ALTER TABLE public.workspace_settings
  ADD CONSTRAINT workspace_settings_user_id_workspace_name_key
  UNIQUE (user_id, workspace_name);
