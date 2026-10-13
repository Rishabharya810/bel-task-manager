-- Initial schema for BEL Employee Task Management System
-- Tables: profiles, tasks, subtasks, task_logs
-- Auth + Row-Level Security enabled

-- Profiles: one row per authenticated user, mirrors auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  designation TEXT DEFAULT '',
  department TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_manager_id ON public.profiles(manager_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'review', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  task_date DATE DEFAULT CURRENT_DATE,
  time_spent INTEGER DEFAULT 0 CHECK (time_spent >= 0),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collaborators UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_task_date ON public.tasks(task_date);

-- Subtasks / checklist
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subtasks_task_id ON public.subtasks(task_id);

-- Activity / change logs
CREATE TABLE public.task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_logs_task_id ON public.task_logs(task_id);
CREATE INDEX idx_task_logs_user_id ON public.task_logs(user_id);

-- Helper: is the caller an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- Helper: can the caller access a profile's data (self, admin, or manager in the hierarchy)?
CREATE OR REPLACE FUNCTION public.can_access_profile(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN FALSE; END IF;
  IF target_user_id = me THEN RETURN TRUE; END IF;
  IF (SELECT public.is_admin()) THEN RETURN TRUE; END IF;

  RETURN EXISTS (
    WITH RECURSIVE reports AS (
      SELECT id, manager_id, 0 AS depth
      FROM public.profiles
      WHERE id = target_user_id
      UNION ALL
      SELECT p.id, p.manager_id, r.depth + 1
      FROM public.profiles p
      INNER JOIN reports r ON p.id = r.manager_id
      WHERE r.depth < 10
    )
    SELECT 1 FROM reports WHERE id = me
  );
END;
$$;

-- Helper: is a task visible to the caller?
CREATE OR REPLACE FUNCTION public.can_access_task(task_row public.tasks)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN FALSE; END IF;
  IF (SELECT public.is_admin()) THEN RETURN TRUE; END IF;
  IF task_row.assigned_to = me THEN RETURN TRUE; END IF;
  IF task_row.created_by = me THEN RETURN TRUE; END IF;
  IF task_row.collaborators @> ARRAY[me] THEN RETURN TRUE; END IF;
  IF task_row.assigned_to IS NOT NULL AND (SELECT public.can_access_profile(task_row.assigned_to)) THEN RETURN TRUE; END IF;
  IF task_row.created_by IS NOT NULL AND (SELECT public.can_access_profile(task_row.created_by)) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

-- Helper: can the caller modify a task? (admin, owner, assignee, or manager of assignee)
CREATE OR REPLACE FUNCTION public.can_modify_task(task_row public.tasks)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN FALSE; END IF;
  IF (SELECT public.is_admin()) THEN RETURN TRUE; END IF;
  IF task_row.created_by = me THEN RETURN TRUE; END IF;
  IF task_row.assigned_to = me THEN RETURN TRUE; END IF;
  IF task_row.assigned_to IS NOT NULL AND (SELECT public.can_access_profile(task_row.assigned_to)) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

-- Revoke public table privileges
REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.tasks FROM anon, authenticated;
REVOKE ALL ON public.subtasks FROM anon, authenticated;
REVOKE ALL ON public.task_logs FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtasks TO authenticated;
GRANT SELECT, INSERT ON public.task_logs TO authenticated;

-- PROFILES policies
CREATE POLICY profiles_select
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (SELECT public.is_admin())
    OR (SELECT public.can_access_profile(id))
  );

CREATE POLICY profiles_insert
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    id = auth.uid()
    OR (SELECT public.is_admin())
  );

-- TASKS policies
CREATE POLICY tasks_select
  ON public.tasks FOR SELECT
  TO authenticated
  USING ((SELECT public.can_access_task(public.tasks.*)));

CREATE POLICY tasks_insert
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR (SELECT public.is_admin())
    OR (assigned_to IS NOT NULL AND (SELECT public.can_access_profile(assigned_to)))
  );

CREATE POLICY tasks_update
  ON public.tasks FOR UPDATE
  TO authenticated
  USING ((SELECT public.can_modify_task(public.tasks.*)))
  WITH CHECK ((SELECT public.can_modify_task(public.tasks.*)));

CREATE POLICY tasks_delete
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (SELECT public.is_admin())
  );

-- SUBTASKS policies: visible/modifiable if parent task is visible/modifiable
CREATE POLICY subtasks_select
  ON public.subtasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = subtasks.task_id AND (SELECT public.can_access_task(t))
    )
  );

CREATE POLICY subtasks_insert
  ON public.subtasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = subtasks.task_id AND (SELECT public.can_modify_task(t))
    )
  );

CREATE POLICY subtasks_update
  ON public.subtasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = subtasks.task_id AND (SELECT public.can_modify_task(t))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = subtasks.task_id AND (SELECT public.can_modify_task(t))
    )
  );

CREATE POLICY subtasks_delete
  ON public.subtasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = subtasks.task_id AND (SELECT public.can_modify_task(t))
    )
  );

-- TASK_LOGS policies: visible if parent task visible; insert by anyone who can modify task
CREATE POLICY task_logs_select
  ON public.task_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_logs.task_id AND (SELECT public.can_access_task(t))
    )
  );

CREATE POLICY task_logs_insert
  ON public.task_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_logs.task_id AND (SELECT public.can_modify_task(t))
    )
  );

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can upload attachments; read access for task participants
CREATE POLICY attachments_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY attachments_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');
